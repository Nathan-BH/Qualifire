"""
Writes a clean, minimal Standard MIDI File (type 0, single track) straight from
this project's own verified note data (soundtrack.py's BASS + MELODY -- the
Klangio-cross-checked, D5-blip-removed lists) -- not a re-export of the raw
Kyutai MIDI. No post-15s repeat tail (soundtrack.py's lists never had one; see
NOTES.md's "the tail is a hallucination" finding).

Pure stdlib (struct only) -- no mido/pretty_midi, matching this project's
no-extra-deps constraint (see APPROACH.md).

    python3 write_midi.py

Writes interstellar_corrected.mid next to this file.
"""
import struct
import math
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
from synth import NOTES  # note name -> frequency (Hz), NOT a MIDI number
from soundtrack import BASS, MELODY


def hz_to_midi(freq):
    return round(69 + 12 * math.log2(freq / 440.0))

TICKS_PER_BEAT = 480
TEMPO_USEC = 500000  # 120 BPM -> 1 beat = 0.5s -> 1s = 960 ticks
TICKS_PER_SEC = TICKS_PER_BEAT * 1_000_000 / TEMPO_USEC  # = 960.0


def vlq(n):
    """MIDI variable-length quantity encoding."""
    bytes_ = [n & 0x7F]
    n >>= 7
    while n:
        bytes_.insert(0, (n & 0x7F) | 0x80)
        n >>= 7
    return bytes(bytes_)


def build_track(events):
    """events: list of (tick, type, data) where type is 'on'/'off', data=(channel, note, vel)."""
    events = sorted(events, key=lambda e: (e[0], 0 if e[1] == "off" else 1))
    out = bytearray()
    # tempo meta event at t=0
    out += vlq(0) + bytes([0xFF, 0x51, 0x03]) + TEMPO_USEC.to_bytes(3, "big")
    # track name meta event
    name = b"Interstellar (corrected)"
    out += vlq(0) + bytes([0xFF, 0x03, len(name)]) + name

    last_tick = 0
    for tick, kind, (channel, note, vel) in events:
        delta = tick - last_tick
        last_tick = tick
        status = (0x90 if kind == "on" else 0x80) | (channel & 0x0F)
        out += vlq(delta) + bytes([status, note & 0x7F, vel & 0x7F])

    out += vlq(0) + bytes([0xFF, 0x2F, 0x00])  # end of track
    return bytes(out)


def notes_to_events(notes, channel, velocity=90):
    events = []
    for name, start, dur in notes:
        midi_num = hz_to_midi(NOTES[name])
        on_tick = round(start * TICKS_PER_SEC)
        off_tick = round((start + dur) * TICKS_PER_SEC)
        if off_tick <= on_tick:
            off_tick = on_tick + 1
        events.append((on_tick, "on", (channel, midi_num, velocity)))
        events.append((off_tick, "off", (channel, midi_num, 0)))
    return events


def write_smf(path, events, n_tracks=1):
    with open(path, "wb") as f:
        f.write(b"MThd" + struct.pack(">IHHH", 6, 0, n_tracks, TICKS_PER_BEAT))
        track_data = build_track(events)
        f.write(b"MTrk" + struct.pack(">I", len(track_data)) + track_data)


if __name__ == "__main__":
    events = notes_to_events(BASS, channel=0, velocity=80) + \
             notes_to_events(MELODY, channel=1, velocity=95)
    out_path = os.path.join(os.path.dirname(__file__), "interstellar_corrected.mid")
    write_smf(out_path, events)
    last_off = max(s + d for _, s, d in BASS + MELODY)
    print(f"wrote {out_path} -- {len(BASS)} bass + {len(MELODY)} melody notes, "
          f"content ends {last_off:.2f}s, no tail past that")
