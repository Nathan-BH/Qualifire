// teaser-lanes.test.mjs — node >= 20, no dependencies. Run: node teaser-lanes.test.mjs (from this folder).
// Extracts the <script id="lanes-core"> block from teaser-lanes.html and checks the pure functions.
// Every expected value below is written out literally (worked by hand), never computed with the function under test.
import { readFileSync, statSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(here, "teaser-lanes.html");
const html = readFileSync(htmlPath, "utf8");
const cores = html.match(/<script id="lanes-core">/g) || [];
const core = html.match(/<script id="lanes-core">([\s\S]*?)<\/script>/);
if (!core) throw new Error("lanes-core block not found");
const sandbox = { module: { exports: {} }, console };
vm.runInNewContext(core[1] + "\nmodule.exports = LanesCore;", sandbox);
const C = sandbox.module.exports;

let fails = 0, n = 0;
const ok = (name, cond, detail = "") => { n++; if (!cond) { fails++; console.log("FAIL", name, detail); } else console.log("pass", name); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const eq = (name, a, b) => ok(name, JSON.stringify(a) === JSON.stringify(b), "got " + JSON.stringify(a) + " expected " + JSON.stringify(b));
const throwsWith = (name, fn, sub) => {
  let msg = null;
  try { fn(); } catch (e) { msg = e.message; }
  ok(name, msg !== null && msg.includes(sub), "message: " + msg + " (wanted to contain " + sub + ")");
};

// 1. frames, 30 fps, every frame of the 1428-frame teaser
{
  let bad = 0;
  for (let f = 0; f < 1428; f++) {
    if (C.frameOf(C.timeOfFrame(f, 30), 30) !== f) bad++;
    if (C.frameOf(C.seekTimeOfFrame(f, 30), 30) !== f) bad++;
  }
  ok("frame round-trip 1428 frames", bad === 0, "bad=" + bad);
}
ok("frameOf(24.30,30) = 729", C.frameOf(24.30, 30) === 729);
ok("frameOf(10.30,30) = 309", C.frameOf(10.30, 30) === 309);
ok("frameOf(32.8,30) = 984", C.frameOf(32.8, 30) === 984);
ok("frameOf(47.6,30) = 1428 (callers clamp to 1427)", C.frameOf(47.6, 30) === 1428);
ok("frameOf(-0.1) clamps to 0", C.frameOf(-0.1, 30) === 0);
ok("seekTimeOfFrame(729,30) = 24.31667", near(C.seekTimeOfFrame(729, 30), 24.316667, 1e-6));
ok("shownFrameOf(24.29999,30) = 729", C.shownFrameOf(24.29999, 30) === 729);
ok("nudge +1 frame", C.nudge(3.8, 1 / 30) === 3.8333);
ok("nudgeFrames steps grid to grid", C.nudgeFrames(3.8, 1, 30) === 3.8333 && C.nudgeFrames(3.8333, 1, 30) === 3.8667);

// 2. clip length and end
const wc = { track: "a-strings", in: 0, out: 10, at: 44, gain: 0.45, fade_in: 0, fade_out: 0 };
const bed2 = { track: "bed", in: 0, out: 9.76, at: 23.04, gain: 0.45, fade_in: 0, fade_out: 1 };
const bed1 = { track: "bed", in: 0, out: 15.0465, at: 10.3, gain: 0.45, fade_in: 0, fade_out: 0 };
ok("clipEnd worked example = 54", C.clipEnd({ in: 0, out: 10, at: 44 }) === 54);
ok("clipEnd bed clip 2 = 32.8", C.clipEnd({ in: 0, out: 9.76, at: 23.04 }) === 32.8);
ok("clipLen = 9.76", C.clipLen({ in: 0, out: 9.76 }) === 9.76);
ok("clipEnd bed clip 1 = 25.3465", C.clipEnd(bed1) === 25.3465);

// 3. the two clocks: render time -> source time
ok("sourceTimeAt(47.5) = 3.5", C.sourceTimeAt(wc, 47.5) === 3.5);
ok("sourceTimeAt(44) = 0 (start inclusive)", C.sourceTimeAt(wc, 44) === 0);
ok("sourceTimeAt(43.99) = null", C.sourceTimeAt(wc, 43.99) === null);
ok("sourceTimeAt(54) = null (end exclusive)", C.sourceTimeAt(wc, 54) === null);
ok("sourceTimeAt(53.99) ~ 9.99", near(C.sourceTimeAt(wc, 53.99), 9.99, 1e-9));
ok("laneReadouts lists every overlapping clip in order of at: bed at 24.30 -> [14, 1.26]", (() => { const r = C.laneReadouts([bed2, bed1], "bed", 24.3); return r.length === 2 && near(r[0], 14, 1e-9) && near(r[1], 1.26, 1e-9); })());
ok("laneReadout keeps returning the first clip (14)", near(C.laneReadout([bed2, bed1], "bed", 24.3), 14, 1e-9));
ok("laneReadouts empty outside every clip", C.laneReadouts([bed1, bed2], "bed", 5).length === 0);
ok("bed clip 2 at render 24.30 reads source 1.26 (the ATTACK)", near(C.sourceTimeAt(bed2, 24.3), 1.26, 1e-9));
ok("in offset: clip in 2 at 10, render 12.5 -> 4.5", C.sourceTimeAt({ in: 2, out: 6, at: 10 }, 12.5) === 4.5);

// 4. file time with a per-track offset
ok("fileTimeOfSource offset 0.026", near(C.fileTimeOfSource({ file_offset_s: 0.026 }, 3.5), 3.526, 1e-9));
ok("fileTimeOfSource no offset", C.fileTimeOfSource({}, 3.5) === 3.5);

// 5. frameSlice (exact scrubbing)
{
  const t = { file_offset_s: 0 };
  const a = C.frameSlice(wc, t, 1320, 30);
  ok("frameSlice n=1320 start of clip", a && near(a.fileStart, 0, 1e-9) && near(a.len, 1 / 30, 1e-9) && near(a.gain, 0.45, 1e-9), JSON.stringify(a));
  ok("frameSlice n=1319 (frame before the clip) = null", C.frameSlice(wc, t, 1319, 30) === null);
  const b = C.frameSlice(wc, t, 1619, 30);
  ok("frameSlice n=1619 last frame", b && near(b.fileStart, 9.966667, 1e-5) && near(b.len, 0.033333, 1e-5), JSON.stringify(b));
  ok("frameSlice n=1620 (after the clip) = null", C.frameSlice(wc, t, 1620, 30) === null);
  const off = C.frameSlice(wc, { file_offset_s: 0.026 }, 1320, 30);
  ok("frameSlice honours file offset", off && near(off.fileStart, 0.026, 1e-9));
  // a clip that starts mid-frame: at 44.01 -> frame 1320 holds [44.01, 44.0333)
  const mid = C.frameSlice({ in: 1, out: 5, at: 44.01, gain: 1, fade_in: 0, fade_out: 0 }, t, 1320, 30);
  ok("frameSlice partial frame", mid && near(mid.fileStart, 1, 1e-9) && near(mid.len, 0.023333, 1e-5), JSON.stringify(mid));
}

// 6. gainAt
ok("gainAt 31.8 = 0.45", near(C.gainAt(bed2, 31.8), 0.45, 1e-12));
ok("gainAt 32.3 = 0.225", near(C.gainAt(bed2, 32.3), 0.225, 1e-9));
ok("gainAt 32.79 = 0.0045", near(C.gainAt(bed2, 32.79), 0.0045, 1e-6));
ok("gainAt 30 = 0.45", near(C.gainAt(bed2, 30), 0.45, 1e-12));
ok("gainAt 32.8 = 0 (end exclusive)", C.gainAt(bed2, 32.8) === 0);
ok("gainAt before start = 0", C.gainAt(bed2, 23) === 0);
ok("gainAt fade in 0.25 = 0.5", near(C.gainAt({ in: 0, out: 5, at: 0, gain: 1, fade_in: 0.5, fade_out: 0 }, 0.25), 0.5, 1e-12));

// 7. startParams for real-time play
{
  const t = { file_offset_s: 0 };
  const p = C.startParams(bed2, t, 25.0);
  ok("startParams from 25.0", p && near(p.delay, 0, 1e-9) && near(p.fileOffset, 1.96, 1e-4) && near(p.dur, 7.8, 1e-4) && near(p.g0, 0.45, 1e-9) && near(p.tFadeOutStart, 6.8, 1e-4) && near(p.tEnd, 7.8, 1e-4) && p.gain === 0.45, JSON.stringify(p));
  const q = C.startParams(bed2, t, 20.0);
  ok("startParams from 20.0 (clip starts later)", q && near(q.delay, 3.04, 1e-4) && near(q.fileOffset, 0, 1e-9) && near(q.dur, 9.76, 1e-4), JSON.stringify(q));
  ok("startParams from 33 = null", C.startParams(bed2, t, 33) === null);
  const r = C.startParams(bed2, { file_offset_s: 0.5 }, 25.0);
  ok("startParams honours file offset", near(r.fileOffset, 2.46, 1e-4), JSON.stringify(r));
}

// 8. audible (mute / solo)
{
  const L = [{ id: "a", muted: false, solo: false }, { id: "b", muted: true, solo: false }];
  const m1 = C.audible(L);
  ok("audible: mute", m1.get("a") === true && m1.get("b") === false);
  const m2 = C.audible([{ id: "a", muted: false, solo: false }, { id: "b", muted: true, solo: true }]);
  ok("audible: solo wins over mute and silences the rest", m2.get("a") === false && m2.get("b") === true);
}

// 9. validateClip
{
  const t = { source_len_s: 15.0465 }, v = { duration_s: 47.6 };
  const r1 = C.validateClip({ track: "x", in: 5, out: 5, at: 0 }, t, v);
  ok("validateClip out <= in", !r1.ok && r1.errors.some(e => e.includes("out <= in")), JSON.stringify(r1));
  const r2 = C.validateClip({ track: "x", in: 0, out: 20, at: 0 }, t, v);
  ok("validateClip clamps out with a warning", r2.ok && r2.clip.out === 15.0465 && r2.warnings.length === 1, JSON.stringify(r2));
  const r3 = C.validateClip({ track: "x", in: 0, out: 5, at: 47.6 }, t, v);
  ok("validateClip at = duration is an error", !r3.ok && r3.errors.some(e => e.includes("at >=")), JSON.stringify(r3));
  const r4 = C.validateClip({ track: "x", in: 0.33333, out: 5, at: 0 }, t, v);
  ok("validateClip rounds in 0.33333 -> 0.3333", r4.ok && r4.clip.in === 0.3333);
  ok("validateClip gain rounded to 3 decimals", C.validateClip({ in: 0, out: 1, at: 0, gain: 0.45678 }, t, v).clip.gain === 0.457);
  ok("validateClip gain -1 is an error", !C.validateClip({ in: 0, out: 1, at: 0, gain: -1 }, t, v).ok);
  ok("validateClip gain 5 is an error", !C.validateClip({ in: 0, out: 1, at: 0, gain: 5 }, t, v).ok);
  ok("validateClip in < 0 is an error", C.validateClip({ in: -1, out: 1, at: 0 }, t, v).errors.includes("in < 0"));
  ok("validateClip at < 0 is an error", C.validateClip({ in: 0, out: 1, at: -2 }, t, v).errors.includes("at < 0"));
  ok("validateClip fades longer than the clip", C.validateClip({ in: 0, out: 1, at: 0, fade_in: 0.6, fade_out: 0.6 }, t, v).errors.some(e => e.includes("fade")));
  ok("validateClip garbage number", !C.validateClip({ in: "abc", out: 1, at: 0 }, t, v).ok);
  ok("validateClip missing out", !C.validateClip({ in: 0, at: 0 }, t, v).ok);
  ok("validateClip defaults gain 1, fades 0", (() => { const r = C.validateClip({ in: 0, out: 1, at: 0 }, t, v); return r.ok && r.clip.gain === 1 && r.clip.fade_in === 0 && r.clip.fade_out === 0; })());
}

// synthetic manifest (the same shape the cloud test kit uses)
const synth = () => ({
  kit: "teaser-lanes", version: 1,
  video: { file: "video.webm", fps: 30, duration_s: 60, frames: 1800 },
  groups: [{ id: "open", label: "Opening" }, { id: "bed", label: "Bed" }, { id: "A", label: "A" }, { id: "B", label: "B" }, { id: "pulse", label: "Pulses" }],
  tracks: [
    { id: "logo", label: "logo", group: "open", file: "logo.wav", source_len_s: 2, muted: false },
    { id: "bed", label: "bed", group: "bed", file: "bed.wav", source_len_s: 12, muted: false },
    { id: "a-strings", label: "strings A", group: "A", file: "a-strings.wav", source_len_s: 12, muted: true },
    { id: "b-drums", label: "drums B", group: "B", file: "b-drums.wav", source_len_s: 12, muted: true },
    { id: "e5", label: "E5 pulses", group: "pulse", file: "e5.wav", source_len_s: 3, muted: false, file_offset_s: 0.01 }
  ],
  clips: [
    { track: "logo", in: 0, out: 1, at: 0, gain: 0.85, fade_out: 0.2 },
    { track: "bed", in: 0, out: 12, at: 1, gain: 0.45 },
    { track: "bed", in: 0, out: 5, at: 20, gain: 0.45, fade_out: 1 },
    { track: "a-strings", in: 0, out: 12, at: 1, gain: 0.45 },
    { track: "a-strings", in: 0, out: 5, at: 20, gain: 0.45, fade_out: 1 },
    { track: "b-drums", in: 0, out: 1, at: 3, gain: 1 },
    { track: "e5", in: 0, out: 3, at: 2, gain: 1 }
  ]
});

// 10. parseManifest
{
  const m = C.parseManifest(synth());
  ok("parseManifest accepts the synthetic manifest", m.clips.length === 7 && m.tracks.length === 5);
  ok("parseManifest fills defaults", m.clips[1].fade_in === 0 && m.clips[1].fade_out === 0 && m.tracks[0].file_offset_s === 0 && m.tracks[4].file_offset_s === 0.01);
  ok("parseManifest accepts JSON text", C.parseManifest(JSON.stringify(synth())).tracks.length === 5);
  ok("parseManifest returns a deep copy", (() => { const s = synth(), r = C.parseManifest(s); r.tracks[0].id = "zzz"; return s.tracks[0].id === "logo"; })());
  ok("parseManifest passes peak and how_made.decode/wav through", (() => { const s = synth(); s.tracks[1].peak = 1.0435; s.how_made = { decode: "decode_stereo", wav: "float32" }; const r = C.parseManifest(s); s.tracks[1].peak = 0; return r.tracks[1].peak === 1.0435 && r.how_made.decode === "decode_stereo" && r.how_made.wav === "float32"; })());
  let x = synth(); x.tracks[1].id = "logo";
  throwsWith("parseManifest rejects a duplicate id (names it)", () => C.parseManifest(x), "duplicate track id logo");
  x = synth(); x.tracks[2].group = "Q";
  throwsWith("parseManifest rejects an unknown group (names it)", () => C.parseManifest(x), "unknown group Q");
  x = synth(); x.clips[3].track = "nope";
  throwsWith("parseManifest rejects an unknown clip track (names it)", () => C.parseManifest(x), "unknown track nope");
  x = synth(); x.video.frames = 1799;
  throwsWith("parseManifest rejects a frames mismatch (names the field)", () => C.parseManifest(x), "video.frames 1799");
  x = synth(); x.version = 2;
  throwsWith("parseManifest rejects version 2", () => C.parseManifest(x), "version");
  x = synth(); x.tracks[0].id = "Bad Id";
  throwsWith("parseManifest rejects a bad id", () => C.parseManifest(x), "Bad Id");
  x = synth(); x.clips[0].out = 0;
  throwsWith("parseManifest rejects an invalid clip (names the track)", () => C.parseManifest(x), "(logo)");
  throwsWith("parseManifest rejects text that is not JSON", () => C.parseManifest("{nope"), "not valid JSON");
}

// 11. buildState
{
  const st = C.buildState(C.parseManifest(synth()));
  ok("buildState lanes", st.lanes.length === 5 && st.lanes.map(l => l.id).join() === "logo,bed,a-strings,b-drums,e5");
  ok("buildState clip ids c1..c7", st.clips.map(c => c.id).join() === "c1,c2,c3,c4,c5,c6,c7");
  ok("buildState muted copied, solo false, status pending", st.lanes.map(l => l.muted).join() === "false,false,true,true,false" && st.lanes.every(l => l.solo === false && l.status === "pending"));
  ok("buildState zoom all, no selection", st.zoom === "all" && st.sel === null);
  ok("buildState copies the file offset", st.lanes[4].file_offset_s === 0.01);
  ok("nextClipId", C.nextClipId(st.clips) === "c8" && C.nextClipId([]) === "c1");
}

// 12. formatClipList, byte for byte
{
  const state = {
    video: { file: "video.webm", fps: 30, duration_s: 60 },
    lanes: [{ id: "logo", muted: false, solo: false, status: "ready" }, { id: "bed", muted: false, solo: false, status: "ready" }, { id: "a-strings", muted: true, solo: false, status: "ready" }],
    clips: [
      { id: "c1", track: "a-strings", in: 0, out: 10, at: 44, gain: 0.45, fade_in: 0, fade_out: 0 },
      { id: "c2", track: "logo", in: 0, out: 1, at: 0, gain: 0.85, fade_in: 0, fade_out: 0.2 },
      { id: "c3", track: "bed", in: 0, out: 9.76, at: 23.04, gain: 0.45, fade_in: 0, fade_out: 1 },
      { id: "c4", track: "bed", in: 0, out: 12, at: 1, gain: 0.45, fade_in: 0, fade_out: 0 }
    ]
  };
  const expected = [
    "teaser-lanes · video.webm · 30 fps · 60.000 s · times in seconds; source = that sound's own clock, render = the video's",
    "logo: source 0.000-1.000 s -> render 0.000-1.000 s (gain 0.85, fade out 0.2 s)",
    "bed: source 0.000-12.000 s -> render 1.000-13.000 s (gain 0.45)",
    "bed: source 0.000-9.760 s -> render 23.040-32.800 s (gain 0.45, fade out 1 s)",
    "a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 0.45, muted)"
  ].join("\n");
  ok("formatClipList exact string", C.formatClipList(state) === expected, "\n" + C.formatClipList(state));
  ok("formatClipList has no trailing newline", !C.formatClipList(state).endsWith("\n"));
  state.lanes[2].muted = false;
  ok("formatClipList drops ', muted' once unmuted", C.formatClipList(state).split("\n")[4] === "a-strings: source 0.000-10.000 s -> render 44.000-54.000 s (gain 0.45)");
  state.lanes[2].muted = true; state.lanes[0].solo = true;
  ok("solo on logo mutes the others in the list", C.formatClipList(state).split("\n").filter(l => l.includes("muted")).length === 3);
  state.lanes[0].solo = false; state.lanes[2].muted = false; state.lanes[1].status = "missing";
  ok("formatClipList marks a missing file", C.formatClipList(state).split("\n")[2] === "bed: source 0.000-12.000 s -> render 1.000-13.000 s (gain 0.45, file missing)");
  const one = { video: { file: "teaser_v9.mp4", fps: 30, duration_s: 47.6 }, lanes: [{ id: "bed", muted: false, solo: false, status: "ready" }], clips: [{ id: "c1", track: "bed", in: 0, out: 15.0465, at: 10.3, gain: 0.45, fade_in: 0, fade_out: 0 }] };
  ok("formatClipList real bed clip 1 (15.047 / 25.347)", C.formatClipList(one).split("\n").slice(1).join("\n") === "bed: source 0.000-15.047 s -> render 10.300-25.347 s (gain 0.45)");
  ok("formatClipList header for the real video", C.formatClipList(one).split("\n")[0] === "teaser-lanes · teaser_v9.mp4 · 30 fps · 47.600 s · times in seconds; source = that sound's own clock, render = the video's");
}

// 13. fmtNum, fmtSeconds, parseTimeEntry
{
  const table = [[0.45, "0.45"], [1, "1"], [1.5, "1.5"], [15.0465, "15.047"], [9.76, "9.76"], [0, "0"], [0.2, "0.2"], [32.8, "32.8"], [0.0005, "0.001"], [100, "100"]];
  for (const [x, s] of table) ok("fmtNum(" + x + ") = " + s, C.fmtNum(x) === s, C.fmtNum(x));
  ok("fmtSeconds(47.6) = 47.600", C.fmtSeconds(47.6) === "47.600");
  ok("fmtSeconds(15.0465) = 15.047", C.fmtSeconds(15.0465) === "15.047");
  ok("fmtSeconds(0) = 0.000", C.fmtSeconds(0) === "0.000");
  ok("fmtFrame(729) = f729", C.fmtFrame(729) === "f729");
  ok("parseTimeEntry 44", C.parseTimeEntry("44", 30) === 44);
  ok("parseTimeEntry 44.0", C.parseTimeEntry("44.0", 30) === 44);
  ok("parseTimeEntry f1320 -> 44", C.parseTimeEntry("f1320", 30) === 44);
  ok("parseTimeEntry 1:04.5 -> 64.5", C.parseTimeEntry("1:04.5", 30) === 64.5);
  ok("parseTimeEntry x -> null", C.parseTimeEntry("x", 30) === null);
  ok("parseTimeEntry empty and negative -> null", C.parseTimeEntry("", 30) === null && C.parseTimeEntry("-3", 30) === null);
  ok("parseTimeEntry trims spaces", C.parseTimeEntry("  24.3 ", 30) === 24.3);
}

// 14. layout and the shared axis
ok("laneHeight (810,9) = 81", C.laneHeight(810, 9) === 81);
ok("laneHeight (900,9) = 91", C.laneHeight(900, 9) === 91);
ok("laneHeight (990,9) = 96", C.laneHeight(990, 9) === 96);
ok("laneHeight (1080,9) = 96", C.laneHeight(1080, 9) === 96);
ok("laneHeight (400,9) = 40", C.laneHeight(400, 9) === 40);
ok("layoutMode", C.layoutMode(1440) === "side" && C.layoutMode(1100) === "side" && C.layoutMode(1099) === "stacked");
ok("leftWidth 1440/1920/1100", C.leftWidth(1440) === 605 && C.leftWidth(1920) === 760 && C.leftWidth(1100) === 520);
eq("windowFor 2 s at the start", C.windowFor("2", 0.5, 47.6), [0, 2]);
eq("windowFor 2 s at the end", C.windowFor("2", 47.5, 47.6), [45.6, 47.6]);
eq("windowFor 10 s centred", C.windowFor("10", 24.3, 47.6), [19.3, 29.3]);
eq("windowFor 0.5 s centred", C.windowFor("0.5", 24.3, 47.6), [24.05, 24.55]);
eq("windowFor all", C.windowFor("all", 24.3, 47.6), [0, 47.6]);
ok("xOfTime centre = 330", near(C.xOfTime(24.3, [24.05, 24.55], 660), 330, 1e-6));
ok("timeOfX round trip", near(C.timeOfX(330, [24.05, 24.55], 660), 24.3, 1e-9));
ok("xOfTime window start = 0, end = width", C.xOfTime(0, [0, 47.6], 990) === 0 && near(C.xOfTime(47.6, [0, 47.6], 990), 990, 1e-9));
ok("0.5 s zoom: one frame >= 40 px on a 665 px lane", C.xOfTime(1 / 30, [0, 0.5], 665) >= 40);
ok("kitRootOf picks the shortest manifest path", C.kitRootOf(["kit/logo.wav", "kit/manifest.json", "kit/sub/manifest.json"]) === "kit/" && C.kitRootOf(["manifest.json", "x/manifest.json"]) === "" && C.kitRootOf(["kit/a.wav"]) === null);

// 15. overlaps
eq("overlaps two bed clips", C.overlaps([{ track: "bed", in: 0, out: 15.0465, at: 10.3 }, { track: "bed", in: 0, out: 9.76, at: 23.04 }], "bed"), [[23.04, 25.3465]]);
eq("overlaps none", C.overlaps([{ track: "bed", in: 0, out: 5, at: 0 }, { track: "bed", in: 0, out: 5, at: 5 }], "bed"), []);
eq("overlaps ignores other tracks", C.overlaps([{ track: "bed", in: 0, out: 5, at: 0 }, { track: "x", in: 0, out: 5, at: 1 }], "bed"), []);
eq("overlaps three clips merge", C.overlaps([{ track: "t", in: 0, out: 4, at: 0 }, { track: "t", in: 0, out: 4, at: 2 }, { track: "t", in: 0, out: 4, at: 3 }], "t"), [[2, 6]]);

// 16. serializeState / restoreState
{
  const man = C.parseManifest(synth());
  const st = C.buildState(man);
  st.lanes[2].muted = false; st.lanes[1].muted = true;
  st.clips.push({ id: "c8", track: "a-strings", in: 0, out: 10, at: 44, gain: 0.45, fade_in: 0, fade_out: 0 });
  const text = C.serializeState(st);
  const back = C.restoreState(text, man);
  ok("restore round trip: clips", back.dropped === 0 && back.state.clips.length === 8 && back.state.clips[7].at === 44 && back.state.clips[7].id === "c8");
  ok("restore round trip: mutes", back.state.lanes[2].muted === false && back.state.lanes[1].muted === true && back.state.lanes[3].muted === true);
  const bad = JSON.parse(text); bad.clips.push({ track: "ghost", in: 0, out: 1, at: 0, gain: 1, fade_in: 0, fade_out: 0 });
  const r2 = C.restoreState(bad, man);
  ok("restore drops a clip with an unknown track (dropped 1)", r2.dropped === 1 && r2.state.clips.length === 8);
  const bad2 = JSON.parse(text); bad2.clips.push({ track: "bed", in: 5, out: 1, at: 0, gain: 1 });
  ok("restore drops an invalid clip", C.restoreState(bad2, man).dropped === 1);
  ok("stateKey", C.stateKey(man) === "teaser-lanes:teaser-lanes:video.webm:logo,bed,a-strings,b-drums,e5");
  ok("serializeState is JSON with clips and muted", (() => { const j = JSON.parse(text); return Array.isArray(j.clips) && j.muted["a-strings"] === false && j.muted.bed === true; })());
}

// 17. peakBins on a ramp
{
  const ramp = new Float32Array(100).map((_, i) => i);
  const p = C.peakBins(ramp, 0, 100, 10);
  ok("peakBins ramp min/max per bin", p.length === 20 && p[0] === 0 && p[1] === 9 && p[18] === 90 && p[19] === 99, Array.from(p).join());
  const q = C.peakBins(new Float32Array([0.5, -0.25, 0.1, 0.9]), 0, 4, 2);
  ok("peakBins signed", q[0] === -0.25 && q[1] === 0.5 && near(q[2], 0.1, 1e-6) && near(q[3], 0.9, 1e-6));
}

// 18. file hygiene
{
  const buf = readFileSync(htmlPath);
  ok("html: no external URL", !/https?:\/\//i.test(html));
  ok("html: no <link", !/<link/i.test(html));
  ok("html: no <script src", !/<script[^>]*\ssrc\s*=/i.test(html));
  ok("html: size < 160 KB", statSync(htmlPath).size < 160 * 1024, String(statSync(htmlPath).size));
  ok("html: no CR", !/\r/.test(html));
  ok("html: no BOM", !(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf));
  ok("html: lanes-core block occurs once", cores.length === 1);
  ok("html: title", /<title>Teaser sound lanes<\/title>/.test(html));
}

console.log(fails ? fails + " FAILED of " + n : "ALL PASS: " + n + "/" + n + " passed");
process.exit(fails ? 1 : 0);
