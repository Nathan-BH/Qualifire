// synthetic-kit.mjs <outDir> — writes a small synthetic kit for the browser tests: video.webm (testsrc, burnt-in timestamp),
// four WAVs and a manifest in which b-drums.wav is deliberately absent. node >= 20, needs ffmpeg with libvpx-vp9.
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const out = process.argv[2];
if (!out) { console.error("usage: node synthetic-kit.mjs <outDir>"); process.exit(2); }
mkdirSync(out, { recursive: true });
const SR = 44100;

// 20-line PCM16 stereo writer
function wav(seconds, fn) {
  const n = Math.round(seconds * SR), buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, fn(i / SR)));
    const s = Math.round(v * 32767);
    buf.writeInt16LE(s, 44 + i * 4); buf.writeInt16LE(s, 46 + i * 4);
  }
  return buf;
}
let seed = 12345;
const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x7fffffff) * 2 - 1; };
const burst = (t, at, len, f, amp) => (t >= at && t < at + len ? amp * Math.sin(2 * Math.PI * f * (t - at)) * (1 - (t - at) / len) : 0);
const clicks = (t, list, f) => list.reduce((a, c) => a + burst(t, c, 0.12, f, 0.8), 0) + 0.001 * noise();

writeFileSync(join(out, "logo.wav"), wav(2.0, t => burst(t, 0, 0.3, 1000, 0.8) + 0.001 * noise()));
writeFileSync(join(out, "bed.wav"), wav(12.0, t => clicks(t, [1.26, 5.0, 9.0], 440)));
writeFileSync(join(out, "a-strings.wav"), wav(12.0, t => clicks(t, [1.26, 5.0, 9.0], 660)));
writeFileSync(join(out, "e5.wav"), wav(3.0, t => clicks(t, [0, 2.01], 1320)));
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=30:duration=60", "-c:v", "libvpx-vp9", "-b:v", "300k",
  "-deadline", "realtime", "-cpu-used", "8", "-pix_fmt", "yuv420p", join(out, "video.webm")]);

const manifest = {
  kit: "teaser-lanes", version: 1,
  video: { file: "video.webm", fps: 30, duration_s: 60, frames: 1800 },
  groups: [{ id: "open", label: "Opening" }, { id: "bed", label: "Bed" }, { id: "A", label: "Split A" }, { id: "B", label: "Split B" }, { id: "pulse", label: "Pulses" }],
  tracks: [
    { id: "logo", label: "logo", group: "open", file: "logo.wav", file_offset_s: 0, source_len_s: 2, muted: false, samples: 88200 },
    { id: "bed", label: "bed", group: "bed", file: "bed.wav", file_offset_s: 0, source_len_s: 12, muted: false, samples: 529200 },
    { id: "a-strings", label: "strings A", group: "A", file: "a-strings.wav", file_offset_s: 0, source_len_s: 12, muted: true, samples: 529200 },
    { id: "b-drums", label: "drums B", group: "B", file: "b-drums.wav", file_offset_s: 0, source_len_s: 12, muted: true, samples: 529200 },
    { id: "e5", label: "E5 pulses", group: "pulse", file: "e5.wav", file_offset_s: 0, source_len_s: 3, muted: false, samples: 132300 }
  ],
  clips: [
    { track: "logo", in: 0, out: 1, at: 0, gain: 0.85, fade_in: 0, fade_out: 0.2 },
    { track: "bed", in: 0, out: 12, at: 1, gain: 0.45, fade_in: 0, fade_out: 0 },
    { track: "bed", in: 0, out: 5, at: 20, gain: 0.45, fade_in: 0, fade_out: 1 },
    { track: "a-strings", in: 0, out: 12, at: 1, gain: 0.45, fade_in: 0, fade_out: 0 },
    { track: "a-strings", in: 0, out: 5, at: 20, gain: 0.45, fade_in: 0, fade_out: 1 },
    { track: "b-drums", in: 0, out: 1, at: 3, gain: 1, fade_in: 0, fade_out: 0 },
    { track: "e5", in: 0, out: 3, at: 2, gain: 1, fade_in: 0, fade_out: 0 }
  ]
};
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("synthetic kit written to " + out + " (5 tracks, 7 clips, b-drums.wav deliberately absent)");
