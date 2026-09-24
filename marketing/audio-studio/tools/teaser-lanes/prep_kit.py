#!/usr/bin/env python3
"""
prep_kit.py -- builds tools/teaser-lanes/kit/ for teaser-lanes.html (cycle 19).

Re-encodes the silent teaser into a short-keyframe proxy (kit/teaser_v9-proxy.mp4: libx264 crf 20, a keyframe
every 10 frames, same 1920x1080 / 30 fps / 1428 frame timestamps) so frame stepping is instant, decodes the
sound sources to 32-bit float 44.1 kHz stereo WAV with the same ffmpeg decode the build scripts use, renders the five
E5 gate pulses into their own file exactly as ride_tunetank.py does, checks that the
kit reproduces ride_master_v2.wav, checks the stems' alignment against the original,
and writes kit/manifest.json (the default clips = today's teaser sound) and
kit/prep-report.txt.

Needs python3, numpy and ffmpeg/ffprobe on PATH (same as ride/ride_tunetank.py).
Run:  cd marketing/audio-studio/tools/teaser-lanes && python3 prep_kit.py
Nothing outside kit/ is written. Files in kit/ are overwritten by name, never removed.
"""
import datetime
import hashlib
import importlib.util
import json
import os
import shutil
import struct
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AS = os.path.normpath(os.path.join(HERE, "..", ".."))            # audio-studio
REPO = os.path.normpath(os.path.join(AS, "..", ".."))            # repo root (parent of marketing/)
sys.path.insert(0, AS)
sys.path.insert(0, os.path.join(AS, "piano", "projects", "interstellar"))
sys.path.insert(0, os.path.join(AS, "ride"))

KIT = os.path.join(HERE, "kit")
REPORT = os.path.join(KIT, "prep-report.txt")
SR = 44100
VIDEO_MD5 = "07f9c5b495519c97cdec3987decc027f"
BED_MD5 = "a5ea27ca9bd0742beb78bf61bc0ae5fa"
PROXY_NAME = "teaser_v9-proxy.mp4"


class Stop(Exception):
    pass


def say(msg=""):
    print(msg)
    with open(REPORT, "a", encoding="utf-8", newline="\n") as f:
        f.write(msg + "\n")


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def rel_to_repo(path):
    return os.path.relpath(os.path.abspath(path), REPO).replace(os.sep, "/")


def read_wav_int16(path):
    with wave.open(path, "rb") as w:
        if w.getnchannels() != 2 or w.getsampwidth() != 2 or w.getframerate() != SR:
            raise Stop("%s is not 16-bit 44.1 kHz stereo" % path)
        raw = w.readframes(w.getnframes())
    return np.frombuffer(raw, dtype=np.int16).reshape(-1, 2)


def write_wav_f32(path, x):
    """32-bit float stereo 44.1 kHz WAV (WAVE_FORMAT_IEEE_FLOAT, tag 3), plain 44-byte header, no fact chunk."""
    a = np.asarray(x, dtype="<f4")
    if a.ndim != 2 or a.shape[1] != 2:
        raise Stop("write_wav_f32 needs shape (n, 2), got %s" % (a.shape,))
    nbytes = a.size * 4
    head = struct.pack("<4sI4s4sIHHIIHH4sI", b"RIFF", 36 + nbytes, b"WAVE", b"fmt ", 16, 3, 2, SR, SR * 8, 8, 32, b"data", nbytes)
    with open(path, "wb") as f:
        f.write(head)
        f.write(a.tobytes())


def read_wav_f32(path):
    with open(path, "rb") as f:
        raw = f.read()
    bad = Stop("%s is not a 32-bit float 44.1 kHz stereo WAV" % path)
    if len(raw) < 12 or raw[0:4] != b"RIFF" or raw[8:12] != b"WAVE":
        raise bad
    pos, fmt, data = 12, None, None
    while pos + 8 <= len(raw):
        cid = raw[pos:pos + 4]
        size = struct.unpack("<I", raw[pos + 4:pos + 8])[0]
        body = raw[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            fmt = body
        elif cid == b"data":
            data = body
        pos += 8 + size + (size & 1)
    if fmt is None or data is None or len(fmt) < 16:
        raise bad
    tag, ch, rate = struct.unpack("<HHI", fmt[0:8])
    bits = struct.unpack("<H", fmt[14:16])[0]
    is_float = (tag == 3 and bits == 32) or (tag == 0xFFFE and len(fmt) >= 26 and fmt[24:26] == b"\x03\x00" and bits == 32)
    if not is_float or ch != 2 or rate != SR or len(data) % 8:
        raise bad
    return np.frombuffer(data, dtype="<f4").reshape(-1, 2).astype(np.float64)


def to_mono_f(x):
    return x.mean(axis=1)


def xcorr_lag(ref, x, maxlag=4410):
    """c[k] = sum_t ref[t] * x[t+k]; returns (k*, normalised corr at k*) with |k| <= maxlag."""
    n, m = len(ref), len(x)
    nfft = 1 << int(np.ceil(np.log2(n + m)))
    c = np.fft.irfft(np.conj(np.fft.rfft(ref, nfft)) * np.fft.rfft(x, nfft), nfft)
    ks = np.arange(-maxlag, maxlag + 1)
    vals = c[ks % nfft]
    i = int(np.argmax(vals))
    denom = float(np.sqrt((ref ** 2).sum() * (x ** 2).sum()))
    return int(ks[i]), (float(vals[i]) / denom if denom > 0 else 0.0)


def peak_dbfs(x):
    p = float(np.abs(x).max())
    return -999.0 if p == 0 else 20 * np.log10(p)


def _probe_json(args, path):
    out = subprocess.run(["ffprobe", "-v", "error"] + args + ["-of", "json", path], check=True,
                         stdout=subprocess.PIPE, universal_newlines=True).stdout
    return json.loads(out)


def _frame_times(path):
    d = _probe_json(["-select_streams", "v:0", "-show_entries", "frame=pts_time,pkt_pts_time"], path)
    out = []
    for fr in d["frames"]:
        v = fr.get("pts_time", fr.get("pkt_pts_time"))
        if v is None:
            raise Stop("%s: a frame has no pts_time / pkt_pts_time" % path)
        out.append(float(v))
    return np.array(out)


def proxy_check(src, dst):
    """Every check of Ruling 2.3a on the proxy; raises Stop on the first failure; returns the numbers."""
    st = _probe_json(["-select_streams", "v:0", "-count_frames", "-show_entries",
                      "stream=codec_name,width,height,r_frame_rate,nb_frames,nb_read_frames,duration"], dst)["streams"][0]
    if st.get("codec_name") != "h264" or st.get("width") != 1920 or st.get("height") != 1080 or st.get("r_frame_rate") != "30/1":
        raise Stop("proxy stream fields differ from h264 1920x1080 30/1: %r" % st)
    if str(st.get("nb_frames")) != "1428" or str(st.get("nb_read_frames")) != "1428" or abs(float(st["duration"]) - 47.6) > 0.001:
        raise Stop("proxy frames/duration differ from 1428 / 47.600: %r" % st)
    ta, tb = _frame_times(src), _frame_times(dst)
    if len(ta) != 1428 or len(tb) != 1428:
        raise Stop("frame timestamp counts: source %d, proxy %d, expected 1428" % (len(ta), len(tb)))
    maxdiff = float(np.abs(ta - tb).max())
    if maxdiff > 1e-5:
        raise Stop("proxy timestamps differ from the source by up to %.6f s" % maxdiff)
    if abs(tb[0]) > 1e-6 or abs(tb[-1] - 47.566667) > 1e-5:
        raise Stop("proxy first/last timestamps %.6f / %.6f, expected 0.000000 / 47.566667" % (tb[0], tb[-1]))
    pk = _probe_json(["-select_streams", "v:0", "-show_entries", "packet=flags"], dst)["packets"]
    nk = sum(1 for p in pk if "K" in p.get("flags", ""))
    if nk != 143:
        raise Stop("proxy has %d keyframes, expected 143" % nk)
    size = os.path.getsize(dst)
    if size >= 40 * 1000 * 1000:
        raise Stop("proxy is %d bytes, limit 40 MB" % size)
    return dict(frames=len(tb), keyframes=nk, maxdiff=maxdiff, bytes=size, codec=st["codec_name"], width=st["width"],
                height=st["height"], rfr=st["r_frame_rate"], nb=st["nb_frames"], dur=st["duration"])


def main():
    os.makedirs(KIT, exist_ok=True)
    with open(REPORT, "w", encoding="utf-8", newline="\n") as f:
        f.write("")
    say("prep_kit.py  " + datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"))
    say("repo root   " + REPO)
    say("audio-studio " + AS)

    # ---- imports of the build chain (ride_tunetank.py is loaded, not run) ----
    import salamander_render as sr_
    import window_mix as wm
    from ride_master import GAIN, GAIN_VOICE_E5, MASTER_DUR, SR_OFFSET, TEMPO, _e5_events, _midi
    from synth import NOTES
    spec = importlib.util.spec_from_file_location("ride_tunetank", os.path.join(AS, "ride", "ride_tunetank.py"))
    rt = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(rt)
    T1, ATTACK, T2, GAIN_BED, BED_FADE, E5_FADE, BED_MP3 = rt.T1, rt.ATTACK, rt.T2, rt.GAIN_BED, rt.BED_FADE, rt.E5_FADE, rt.BED_MP3
    say("constants: T1 %.2f ATTACK %.2f T2 %.2f GAIN_BED %.2f BED_FADE %s E5_FADE %s GAIN %.2f GAIN_VOICE_E5 %.4f MASTER_DUR %.1f" % (
        T1, ATTACK, T2, GAIN_BED, BED_FADE, E5_FADE, GAIN, GAIN_VOICE_E5, MASTER_DUR))

    # ---- 3. video: short-GOP proxy ----
    say("")
    say("== step 3: video (short-GOP proxy) ==")
    vsrc = os.path.join(REPO, "marketing", "silent-studio", "all-renders", "teaser_v9.mp4")
    vdst = os.path.join(KIT, PROXY_NAME)
    m_src = md5_of(vsrc)
    say("md5 source %s expected %s" % (m_src, VIDEO_MD5))
    if m_src != VIDEO_MD5:
        raise Stop("video md5 mismatch: %s" % m_src)
    old_man = None
    try:
        with open(os.path.join(KIT, "manifest.json"), encoding="utf-8") as f:
            old_man = json.load(f)
    except Exception:
        old_man = None
    kept = False
    if os.path.isfile(vdst) and old_man and old_man.get("video", {}).get("source_md5") == VIDEO_MD5:
        try:
            pinfo = proxy_check(vsrc, vdst)
            kept = True
            say("proxy kept (checks pass)")
        except Stop as e:
            say("existing proxy fails a check (%s); encoding again" % e)
    if not kept:
        tmp = vdst + ".tmp.mp4"
        t0 = datetime.datetime.now()
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vsrc, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                        "-g", "10", "-keyint_min", "10", "-sc_threshold", "0", "-bf", "0", "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart", "-video_track_timescale", "30000", tmp], check=True)
        os.replace(tmp, vdst)
        secs = (datetime.datetime.now() - t0).total_seconds()
        say("proxy encoded in %.0f s" % secs)
        pinfo = proxy_check(vsrc, vdst)
    say("proxy: %d frames, %d keyframes (every 10), timestamps identical to the source (max diff %.6f s), %.1f MB" % (
        pinfo["frames"], pinfo["keyframes"], pinfo["maxdiff"], pinfo["bytes"] / 1e6))
    say("ffprobe: codec_name=%s, width=%s, height=%s, r_frame_rate=%s, nb_frames=%s, duration=%s" % (
        pinfo["codec"], pinfo["width"], pinfo["height"], pinfo["rfr"], pinfo["nb"], pinfo["dur"]))
    video_info = pinfo

    # ---- 4. audio transcodes ----
    say("")
    say("== step 4: decode_stereo (ffmpeg -ac 2 -ar 44100 -f f32le) -> 32-bit float WAV ==")
    stems = os.path.join(AS, "stemsplitter", "tunetank-emotional-classical", "sources")
    table = [
        ("logo", "logo", "open", os.path.join(AS, "piano", "projects", "tunetank", "sources", "tunetank-piano-logo-484286.mp3"), False),
        ("bed", "bed", "bed", os.path.join(stems, "original.mp3"), False),
        ("a-strings", "strings A", "A", os.path.join(stems, "strings-model_strings.mp3"), True),
        ("a-other", "other A", "A", os.path.join(stems, "strings-model_other.mp3"), True),
        ("b-piano", "piano B", "B", os.path.join(stems, "6stem_piano.mp3"), True),
        ("b-drums", "drums B", "B", os.path.join(stems, "6stem_drums.mp3"), True),
        ("b-bass", "bass B", "B", os.path.join(stems, "6stem_bass.mp3"), True),
        ("b-other", "other B", "B", os.path.join(stems, "6stem_other.mp3"), True),
    ]
    info = {}
    for tid, label, group, src, muted in table:
        out = os.path.join(KIT, tid + ".wav")
        x = rt.decode_stereo(src)
        write_wav_f32(out, x)
        pcm = read_wav_f32(out)
        if not np.array_equal(pcm.astype(np.float32), np.asarray(x, dtype=np.float32)):
            raise Stop("%s.wav read-back differs from decode_stereo" % tid)
        smd5 = md5_of(src)
        dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", src],
                             check=True, stdout=subprocess.PIPE, universal_newlines=True).stdout.strip()
        info[tid] = dict(pcm=pcm, samples=len(pcm), source_len_s=round(len(pcm) / SR, 4), source_md5=smd5, src=src)
        say("%-10s %8d samples  %.4f s  peak %+6.2f dBFS  over 1.0: %d  src md5 %s  src ffprobe %s s  <- %s" % (
            tid, len(pcm), len(pcm) / SR, peak_dbfs(pcm), int((np.abs(pcm) > 1.0).sum()), smd5, dur, rel_to_repo(src)))
    if info["bed"]["source_md5"] != BED_MD5:
        raise Stop("original.mp3 md5 %s differs from %s" % (info["bed"]["source_md5"], BED_MD5))
    for tid in ("bed", "a-strings", "a-other", "b-piano", "b-drums", "b-bass", "b-other"):
        if info[tid]["samples"] != 663552:
            raise Stop("%s has %d samples, expected 663552" % (tid, info[tid]["samples"]))
    if abs(info["logo"]["samples"] - 372096) > 2:
        say("NOTE: logo has %d samples (brief expected 372,096 +- 2); reported, not a stop" % info["logo"]["samples"])
    say("left out on purpose: 6stem_instrum (= whole mix, corr 1.000 in Plan's check), 6stem_guitar and 6stem_vocals (peak 0.000)")

    # ---- 5. E5 lane ----
    say("")
    say("== step 5: E5 lane ==")
    pairs = _e5_events()
    notes = [(_midi("E5", NOTES), c / TEMPO + SR_OFFSET, d / TEMPO) for c, d in pairs]
    e5_audio, _ = sr_.render(notes, MASTER_DUR, velocity=105, gain=GAIN_VOICE_E5)
    n_master = int(round(MASTER_DUR * SR))
    e5 = e5_audio[:n_master].astype(np.float64) * GAIN
    wm.fade_out(e5, E5_FADE[0], E5_FADE[1], sr=SR)
    tau = sorted(round(t, 2) for _, t, _ in notes)
    say("e5 tau (ride clock) %s   peak %.4f" % (tau, np.abs(e5).max()))
    i0 = int(round(17.80 * SR))
    e5_tail = e5[i0:]
    write_wav_f32(os.path.join(KIT, "e5.wav"), np.stack([e5_tail, e5_tail], axis=1))
    e5_pcm = read_wav_f32(os.path.join(KIT, "e5.wav"))
    if np.abs(e5_pcm[:, 0] - e5_tail).max() > 1e-6:
        raise Stop("e5.wav read-back differs")
    info["e5"] = dict(pcm=e5_pcm, samples=len(e5_pcm), source_len_s=round(len(e5_pcm) / SR, 4), source_md5="")
    say("i0 = %d ; e5.wav %d samples = %.4f s ; pulses in the file at %s s" % (
        i0, len(e5_pcm), len(e5_pcm) / SR, [round(t - 17.80, 3) for t in tau]))
    if len(e5_pcm) != 374850:
        raise Stop("e5.wav has %d samples, expected 374850" % len(e5_pcm))

    # ---- 6. master reproduction ----
    say("")
    say("== step 6: kit chain vs ride/soundv2/ride_master_v2.wav ==")
    bed = rt.decode_stereo(BED_MP3)
    bed_layer = np.zeros((n_master, 2), dtype=np.float64)
    for ch in range(2):
        wm.place(bed_layer[:, ch], bed[:, ch], T1, gain=GAIN_BED, sr=SR)
        wm.place(bed_layer[:, ch], bed[:, ch], T2, gain=GAIN_BED, sr=SR)
        wm.fade_out(bed_layer[:, ch], BED_FADE[0], BED_FADE[1], sr=SR)
    master = bed_layer.copy()
    master[:, 0] += e5
    master[:, 1] += e5
    pcm = (np.clip(master, -1.0, 1.0) * 32767).astype(np.int16)
    existing = read_wav_int16(os.path.join(AS, "ride", "soundv2", "ride_master_v2.wav"))
    say("shapes: existing %s, re-render %s" % (existing.shape, pcm.shape))
    if existing.shape != pcm.shape:
        raise Stop("shape mismatch existing %s vs re-render %s" % (existing.shape, pcm.shape))
    d = np.abs(existing.astype(np.int32) - pcm.astype(np.int32))
    mx, n1 = int(d.max()), int((d > 1).sum())
    say("max |existing - re-render| = %d LSB ; samples > 1 LSB: %d ; samples > 2 LSB: %d" % (mx, n1, int((d > 2).sum())))
    derived = existing[:, 0].astype(np.float64) / 32767.0 - bed_layer[:, 0]
    dmax = float(np.abs(derived - e5).max())
    say("max |derived e5 (existing L - bed layer) - rendered e5| = %.6f (rule <= 1e-3)" % dmax)
    ratios = []
    for t in (17.80, 19.81, 21.65, 23.51, 25.38):
        a = int(round(t * SR))
        post = float(np.sqrt(np.mean(e5[a:a + 2205] ** 2)))
        pre = max(float(np.sqrt(np.mean(e5[a - 2205:a] ** 2))), 1e-9)
        ratios.append(post / pre)
    say("pulse rms(50 ms after)/rms(50 ms before): " + ", ".join("%.0f" % r for r in ratios) + "  (rule >= 100)")
    if not (mx <= 2 and n1 <= 100 and dmax <= 1e-3 and min(ratios) >= 100):
        lag = xcorr_lag(existing[:, 0].astype(np.float64), pcm[:, 0].astype(np.float64))
        raise Stop("master reproduction failed: max %d LSB, >1 LSB %d, derived e5 diff %.6f, min ratio %.1f; peak-corr lag existing vs re-render = %s" % (mx, n1, dmax, min(ratios), lag))
    say("master reproduction: PASS (max %d LSB)" % mx)

    # ---- 7. alignment guard ----
    say("")
    say("== step 7: alignment guard (kit wavs, mono, |k| <= 4410 samples; corr = c[k*]/sqrt(sum ref^2 * sum x^2)) ==")
    ref = to_mono_f(info["bed"]["pcm"])
    k_self, c_self = xcorr_lag(ref, np.concatenate([np.zeros(100), ref]))
    say("self-test (100 zeros prepended): k = %d corr %.4f" % (k_self, c_self))
    if k_self != 100:
        raise Stop("lag self-test returned %d, expected 100" % k_self)
    mono = {t: to_mono_f(info[t]["pcm"]) for t in info if t not in ("logo", "e5")}
    lags = {}
    for t in ("a-strings", "a-other", "b-piano", "b-drums", "b-bass", "b-other"):
        lags[t] = xcorr_lag(ref, mono[t])
        say("  stem %-10s vs bed: k = %5d samples (%.3f ms)  corr %.4f   [report only]" % (t, lags[t][0], lags[t][0] / SR * 1000, lags[t][1]))
    fam = {"A": ["a-strings", "a-other"], "B": ["b-piano", "b-drums", "b-bass", "b-other"]}
    offsets = {}
    for f, ids in fam.items():
        s = sum(mono[t] for t in ids)
        k, c = xcorr_lag(ref, s)
        say("  sum %s (%s) vs bed: k = %d samples corr %.4f" % (f, " + ".join(ids), k, c))
        if c >= 0.99 and abs(k) <= 22:
            offsets[f] = 0.0
        elif 22 < abs(k) <= 2205 and c >= 0.9:
            offsets[f] = round(k / SR, 6)
            say("  WARN: family %s gets file_offset_s = %s" % (f, offsets[f]))
        else:
            raise Stop("family %s alignment out of rules: k=%d corr=%.4f" % (f, k, c))
        for t in ids:
            kt, ct = lags[t]
            if abs(kt - k) > 44 and ct >= 0.5:
                raise Stop("stem %s lag %d differs from family lag %d by > 44 samples with corr %.3f" % (t, kt, k, ct))
    say("file_offset_s: A = %s, B = %s" % (offsets["A"], offsets["B"]))

    # ---- 8. manifest ----
    say("")
    say("== step 8: manifest ==")
    groups = [
        {"id": "open", "label": "Opening"},
        {"id": "bed", "label": "Bed, original mix"},
        {"id": "A", "label": "Bed split A (strings model): strings + other = the original"},
        {"id": "B", "label": "Bed split B (6-stem model): piano + drums + bass + other = the original"},
        {"id": "pulse", "label": "Gate pulses (E5), rendered from the Salamander samples, gain and fade baked in"},
    ]
    tracks = []
    for tid, label, group, src, muted in table:
        i = info[tid]
        tracks.append({"id": tid, "label": label, "group": group, "file": tid + ".wav",
                       "file_offset_s": offsets.get(group, 0.0) if group in ("A", "B") else 0,
                       "source_len_s": i["source_len_s"], "muted": muted, "source": rel_to_repo(src),
                       "source_md5": i["source_md5"], "samples": i["samples"],
                       "peak": round(float(np.abs(i["pcm"]).max()), 4)})
    tracks.append({"id": "e5", "label": "E5 pulses", "group": "pulse", "file": "e5.wav", "file_offset_s": 0,
                   "source_len_s": info["e5"]["source_len_s"], "muted": False,
                   "source": "rendered by prep_kit.py from ride_master.py/ride_tunetank.py", "source_md5": "",
                   "samples": info["e5"]["samples"], "peak": round(float(np.abs(info["e5"]["pcm"]).max()), 4)})
    bed_len = info["bed"]["source_len_s"]
    clips = [{"track": "logo", "in": 0, "out": 6.5, "at": 0, "gain": 0.85, "fade_in": 0, "fade_out": 0.5}]
    for tid in ("bed", "a-strings", "a-other", "b-piano", "b-drums", "b-bass", "b-other"):
        clips.append({"track": tid, "in": 0, "out": bed_len, "at": 10.3, "gain": 0.45, "fade_in": 0, "fade_out": 0})
        clips.append({"track": tid, "in": 0, "out": 9.76, "at": 23.04, "gain": 0.45, "fade_in": 0, "fade_out": 1.0})
    clips.append({"track": "e5", "in": 0, "out": 8.5, "at": 24.3, "gain": 1.0, "fade_in": 0, "fade_out": 0})
    manifest = {
        "kit": "teaser-lanes", "version": 1,
        "made": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "made_by": "prep_kit.py",
        "video": {"file": PROXY_NAME, "name": "teaser_v9.mp4", "fps": 30, "duration_s": 47.6, "frames": 1428,
                  "source": "marketing/silent-studio/all-renders/teaser_v9.mp4", "source_md5": VIDEO_MD5,
                  "proxy": "re-encoded by prep_kit.py for frame stepping: libx264 crf 20, keyframe every 10 frames, same 1920x1080 30 fps and the same 1428 frame timestamps; for looking only, never mix from it",
                  "keyframes": video_info["keyframes"]},
        "groups": groups, "tracks": tracks, "clips": clips,
        "notes": [
            "Left out on purpose: 6stem_instrum.mp3 (= the whole mix again), 6stem_guitar.mp3 and 6stem_vocals.mp3 (empty, peak 0.000).",
            "Lanes A and B are two splits of the same bed: unmute one split OR the bed, not both.",
            "e5.wav: file t=0 is the START pulse (ride 17.80 s = teaser 24.30 s); pulses at 0.000 / 2.010 / 3.850 / 5.710 / 7.580 s; GAIN_VOICE_E5 x 1.5 and the 0.5 s fade to 8.5 s are baked in.",
            "Teaser clock = ride clock + 6.5 s. Bed clip 2 ends at 32.8 = 23.04 + 9.76 with the 1.0 s fade of ride_tunetank.py; bed clip 1 keeps the file's own tail (ends 25.3465).",
            "Kit WAVs are 32-bit float: the mp3 decode puts a few hundred samples above 0 dBFS and the build scripts mix them unclipped, so the tool must too (Ruling 1, 2026-09-24).",
            "The kit video is a short-GOP proxy of teaser_v9.mp4 (Ruling 2, 2026-09-24); the original stays in silent-studio/all-renders.",
        ],
        "how_made": {"decode": "ride_tunetank.decode_stereo (ffmpeg -i SRC -ac 2 -ar 44100 -f f32le -), written as 32-bit float WAV (WAVE_FORMAT_IEEE_FLOAT, tag 3) by prep_kit.py",
                     "wav": "stereo, 44100 Hz, float32; samples above 1.0 preserved (bed %.4f, other A %.4f, other B %.4f)" % tuple(float(np.abs(info[t]["pcm"]).max()) for t in ("bed", "a-other", "b-other")),
                     "e5": "ride_tunetank.py:114-121 chain, sliced from sample 784980"},
    }
    with open(os.path.join(KIT, "manifest.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")
    say("wrote manifest.json: %d tracks, %d clips" % (len(tracks), len(clips)))
    say("")
    say("PREP OK")


if __name__ == "__main__":
    try:
        main()
    except Stop as e:
        say("")
        say("PREP STOP: %s" % e)
        sys.exit(1)
    except Exception as e:  # any surprise is a stop too, with the type
        say("")
        say("PREP STOP: unexpected %s: %s" % (type(e).__name__, e))
        sys.exit(1)
