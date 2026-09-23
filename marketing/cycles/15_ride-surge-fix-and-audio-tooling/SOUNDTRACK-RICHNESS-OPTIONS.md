# Soundtrack richness — options for "a proper song, plus one extra instrument at the gates"

**Status: research deliverable, closed (2026-09-23, Plan tier, Fable).** Analysis only —
nothing here is a brief; no Execute or Inspect tier follows. Nathan picks a path in a
later turn (`questionsfornathan.md` Q3), and *that* becomes a cycle with briefs. Sources
were read on 2026-09-23 via web search; prices and plan limits change monthly, so treat
every number as "as of September 2026, re-check before paying".

## 0. Nathan's ask, restated (point 2 of `audio-studio/ride/soundv1/FEEDBACK.md`)

> "Overall i think the sound is good as proof of concept and is implemented correctly. A
> full repeated loop with at some point extra notes is i what i want. However simple piano
> notes just dont fit with the animation. I need a more complex soundtrack which sounds
> more like a song, and then for the gates there should be like one extra instrument
> added to emphasize it like we have it now. I am however unsure how well claude can
> produce a proper song, because it was already difficult to get just a proper piano
> sound. Which is why i think its worth looking for an extension, or GitHub repo, or
> tool/skills, that might help with sound design and more?"

Three things are settled by that and stay fixed whichever path he picks:

1. **The structure works:** a bed that loops, with a distinct "extra" layer that joins
   for the second ride and lands on the gates. Keep it.
2. **The "one extra instrument at the gates" layer is orthogonal to the bed.** Today it
   is the five E5 piano pulses (`ride_master.py`'s `e5` layer, its own gain
   `GAIN_VOICE_E5`). Whatever produces the bed, the gate layer stays *ours*: five hits of
   any sample (a bell, a pluck, a soft kick, a Salamander note, a VSCO glockenspiel) placed
   sample-exactly at master τ = 17.80 / 19.81 / 21.65 / 23.51 / 25.38 by `window_mix.py`.
   Every path below composes with it; none replaces it.
3. **What "sounds more like a song" means, technically.** The current piece is two
   monophonic lines (6 bass notes + 11 melody notes per loop) and five pulses, on one
   instrument, dry. A "song" has (a) *harmony* — chords or a pad under the melody,
   (b) a *rhythm section* — some pulse other than the melody itself (percussion, a
   plucked ostinato, an arpeggio), (c) *arrangement* — layers entering and leaving, so
   the second ride sounds bigger than the first, (d) *timbre variety* — more than one
   instrument, and (e) *production* — reverb, stereo width, a little compression. The
   options differ in who supplies (a)–(e): Claude by hand, a model, or a human via a
   tool.

## 1. The one hard constraint: the gates are pinned to *onsets*, not to a tempo

`gates-saving/index.html` crosses the gates at video 3.80 / 5.81 / 7.65 / 9.51 /
11.38 s because those are where the Interstellar note list's E5s sound (cycle 14; the
gaps 2.01 / 1.84 / 1.86 / 1.87 s carry ±5 % human wobble). So:

- **Paths that keep the current note list as the skeleton** (option A, and any "add
  layers around it" variant) keep the animation constants as they are — zero re-timing.
- **Paths that replace the bed with new music** (B, C, D) move the beat. Then either
  (i) the new bed is made *to* our grid — generate at a stated BPM, measure its actual
  onsets with the onset scanner that already exists (`_to_delete/cycle14_scratch/
  onset_scan_final.py`, described in the ride round doc), and place our own gate layer
  on *its* beats; and (ii) `PULSE_T` is re-derived from those beats with cycle 14's
  method (five consecutive beats, gates at quarters) and the rider re-paced — a
  one-array change in `index.html` plus a re-render, not a redesign. A steady-tempo bed
  (loops or generated music) actually makes this *easier* than today: at, say, 124 BPM
  in 4/4 one bar is 1.935 s — almost exactly today's mean E5 interval — so `PULSE_T`
  becomes `[0, 1.935, 3.871, 5.806, 7.742]` and the wobble disappears.

## 2. A flag before choosing: the melody is Hans Zimmer's

The current bed is a transcription (Klangio PDF → note list) of the *Interstellar* main
theme. The composition copyright sits with Universal/Warner-Barham/Paramount publishing
entities (see the song-copyright listing in the sources). A private proof-of-concept is
one thing; a public-facing Qualifire marketing video with that melody would need a sync
licence, which for a Zimmer cue is not a small ask — and it is exactly the kind of thing
Content ID flags on YouTube/Instagram. This is not legal advice, but it is the moment to
decide: "more like a song" can mean *arrange Interstellar richly* (keeps the licensing
problem) or *an original piece in that mood* (option A written fresh, or B/C/D by
prompt: "slow minimal piano and strings, Zimmer-like, 4/4, 124 BPM, instrumental"). Every
path below can do either; the AI paths naturally do the second. Logged as Q3b.

## 3. Option A — extend the hand-built pipeline (no new tools)

**What it is.** Keep `salamander_render.py` + `window_mix.py` + `ride_master.py` and add
layers as more note lists: a **chord pad** (sustained triads under the bass — the piece
sits on Am / F / C / G-type changes, four chords per loop is enough), an **arpeggio**
or plucked ostinato at the E5 interval (this is the "rhythm section" for a piece with no
drums), a **countermelody** in the second loop iteration only (arrangement: the second
ride sounds bigger), soft **percussion** (a synthesized or sampled kick/tick — trivial
in numpy), and **production**: a reverb (numpy convolution with an exponentially
decaying noise impulse — ~15 lines), stereo (pan layers left/right), gentle limiting.

**Instruments beyond piano, free and commercial-safe.** The numpy sampler only needs one
decoded file per note, which is exactly what a raw-WAV sample library is. **VSCO 2
Community Edition** (Versilian Studios, **CC0 / public domain**, ~3 GB WAV + SFZ;
strings, woodwinds, brass, percussion) is the obvious pick — Nathan downloads the two
or three instruments he wants (a string section for the pad, a glockenspiel or harp for
the gate layer, a tom or bass drum for pulse) into `piano/samples/vsco2/` the way the
Salamander samples went in, and `salamander_render.py` gets a sibling
`vsco_render.py` (same `render(notes, dur_s) -> (audio, sr)` API, different sample map).
Sister library **VCSL** (same author, also CC0) is on GitHub if a specific instrument
is missing.

**Effort / quality / risk.** Two to three cycles of ordinary Claude work (a brief per
layer set, executed in the PC shell where numpy + ffmpeg are already proven). Quality
ceiling: a good *MIDI mockup* — richer than now, still "arranged by rules", never
mistaken for a studio recording. Risk: low (nothing to install; the only new step is
Nathan's browser download of VSCO). Timing: perfect by construction — this is the only
path where every note is placed by us, so the gates never need re-deriving. Cost: 0.
It does not remove the §2 licensing question unless the melody is rewritten.

## 4. Option B — open-weight generative models, run locally

| Model | Licence (weights) | Commercial use? | Needs | Length / control | Notes |
|---|---|---|---|---|---|
| **Stable Audio 3 Small** (May 2026) | Stability Community License | yes, under $1 M revenue | ~0.57 B params; the autoencoder is "optimized for CPU inference" | ≤2 min; text prompt only (`TrackType: Music, VocalType: Instrumental,` prefix), inpainting / continuation editing | The realistic local candidate. No BPM or reference-audio conditioning — timing is by prompt + measurement. |
| Stable Audio 3 Medium | same | yes | ~2.25 B params, GPU | ≤6:20, same controls | Better quality, needs a real GPU. |
| **Stable Audio Open 1.0 / Small** (2024–25) | same | yes | ~1.2 B / 0.34 B; Small was built with Arm to run on CPU | ≤47 s / ≤11 s | Has explicit `seconds_start`/`seconds_total` timing conditioning; short output suits a *loop* well. |
| ACE-Step | Apache 2.0 | yes | 8 GB+ VRAM | ~4 min | Song-oriented (vocals); heavier. |
| Magenta RealTime (Google) | Apache 2.0 code / CC-BY weights | yes, attribution | "laptop-class" | streaming, live style prompts | Interesting for a loop that evolves; young project. |
| YuE | Apache 2.0 | yes, with credit | 16–24 GB VRAM | minutes | Vocal songs; overkill here. |
| **MusicGen / AudioCraft (Meta)** | code MIT, **weights CC-BY-NC 4.0** | **no** | 8–16 GB VRAM | 30 s native, *melody conditioning* | Would be ideal (feed it our melody), but non-commercial weights rule it out for a public app's marketing. Do not use. |

**Feasibility here.** All of these need PyTorch (~2 GB) plus 1–5 GB of weights from
PyPI / Hugging Face. The cloud sandbox has no network to either — impossible there.
Claude's shell on Nathan's PC has numpy + ffmpeg but its package-install network is
unverified and probably allow-listed; assume *Nathan* installs Python + torch + the model
himself in Windows (a one-evening job if it goes well, a lost evening if CUDA doesn't).
We do not know his GPU; Small on CPU is the safe assumption (minutes per clip, fine for
a 30 s loop). After that, Claude can script generation from the PC shell.

**Quality / risk.** Small models produce usable ambient/cinematic beds and weak
"songs"; Medium is competitive with the commercial services. Risk: install time; no
timing control, so §1(ii) re-timing is required; outputs are not reproducible run to
run (keep the WAV you like). Cost: 0.

## 5. Option C — commercial AI music services and APIs

| Service | Access | Price (Sept 2026) | Length / timing control | Stems? | Commercial terms | Fit |
|---|---|---|---|---|---|---|
| **ElevenLabs Music** | API + web; official `elevenlabs-mcp` (uvx/pip) exposes music *inpainting* and *video-to-music*, community forks add compose | ~$0.15 / generated minute via API; any paid plan | 3 s – 5 min; section-by-section composition + inpainting; instrumental mode; an audio reference can steer tempo/mood | not documented | "cleared for nearly all commercial uses"; Stability's comparison says film/TV/games need Enterprise — read the music terms before publishing | **Best API fit**: scriptable from the PC shell (plain HTTPS), cheap per try, instrumental, editable. Timing still by §1(ii). |
| **Stable Audio 3.0 (hosted)** | API + web | $12–199 / month (660–14 000 credits) | up to 6:20, *per-second length control*, inpainting/extension | no | own the output under Community License (< $1 M revenue) | Good second choice; exact length is handy for a loop of period P. |
| **Suno** (v5 / Studio) | web app only — no public API (partners only) | Pro $8 / mo, Premier $24 / mo; **downloads capped 20 / 60 per month since Sept 2026** | up to 8 min; Suno Studio is a timeline DAW with stems, WAV, MIDI extraction (10 credits each) | **yes** (stems + MIDI) | commercial use on paid plans | Highest "song" quality by reputation, but it is *Nathan's hands*, not a script: he generates, exports stems + MIDI, and hands us the files. MIDI export would let us re-render his stems through our own samplers, gate layer included. |
| Google Lyria 3 | Gemini / Vertex API | ~$0.08 / track | ≤184 s; instrumental | no | preview terms; **SynthID watermark** | Cheap and scriptable; watermark and preview terms make it a weak public-marketing choice. |
| AIVA | web; API by negotiation | €49 / mo (Pro, full copyright) | ~5.5 min; orchestral / cinematic focus; **MIDI export** | no | full copyright on Pro only | Cinematic strength matches the mood; MIDI export fits our pipeline like Suno's. |
| Loudly | API, quote-based | volume pricing | soundtrack focus | **yes** (instrument stems) | royalty-free + indemnification | Enterprise-shaped; overkill. |
| Mubert | API | $14 / mo creator → $199 business for ads | loops up to 25 min | no | licence, not ownership; no streaming/Content ID | Loop-native, but the licence is the weakest. |
| Udio | web | $30 / mo | 2:10 | — | **downloads disabled since Oct 2025** | Out. |

**Common caveat.** All of them make *whole songs*, not click-locked stems. The recipe
that works for our sync problem is: prompt a fixed BPM and "instrumental, minimal,
loopable", generate 3–5 candidates, pick one, measure its real beat grid with our onset
scanner, cut a clean loop of period P on that grid, re-derive `PULSE_T` (§1), and lay
our gate layer on top ourselves. Services with stems (Suno) or MIDI (Suno, AIVA) let us
also *re-balance* the bed per scene. Costs are small but real — flagged for Nathan's
decision, none is irreversible beyond one month's plan.

## 6. Option D — royalty-free loops, arranged programmatically

**What it is.** Multi-track loop packs (drums / bass / pad / arp at one BPM, 2–8 bars
each) dropped into the existing numpy pipeline: `window_mix.py` already places, fades and
gains buffers, so a "song" becomes a placement table — which loops play during which
scene, the arp joining at the second ride, the gate layer on top. Sources: **Looperman**
(free, user-uploaded, per-loop "free to use in your projects" terms — attribution is the
norm, quality varies a lot), **Freesound** (CC0 / CC-BY per sound — check each),
**Cymatics** and similar free packs (royalty-free, sign-up), **Loopmasters / Splice**
(paid per pack or credit, royalty-free for commercial use), **Tracklib** (paid clearance,
for real recordings). Effort: low on Claude's side, but Claude cannot *audition* loops —
Nathan picks the pack in his browser. Quality: "genre stock" — clean and produced, but
generic, and matching a mood is luck. Timing: excellent — loops are rigidly on-grid, so
`PULSE_T` becomes the bar grid (§1) and the wobble goes away. Licence: check per loop /
pack; the paid libraries are the safe ones. Cost: 0–~$15.

## 7. Claude skills and MCP connectors — nothing for composition today

- **Enabled skills** (checked with the skills list): the only audio-adjacent ones are
  `elevenreader-audio-script`, `paper-podcast`, `grant-podcast` — spoken-word narration
  for ElevenReader, not music. Nothing targets composition, MIDI or synthesis. What
  *would* help is a small project skill capturing the audio-studio conventions (round
  folders, `window_mix` recipes, the onset scan, the mux commands) — a process aid Claude
  could write with `skill-packager`, not a sound tool.
- **MCP registry** (searched "music generation / audio / sound design / soundtrack /
  suno / elevenlabs"): hits are ElevenLabs (*voice agents* only — not music), Sonos,
  Audible, Riverside (video editing), and unrelated marketing tools. No music-generation
  connector is in the registry.
- **Outside the registry:** ElevenLabs' official `elevenlabs-mcp` (GitHub; `uvx
  elevenlabs-mcp` or `pip install elevenlabs-mcp`; needs an API key and credits) lists
  music inpainting and video-to-music; community forks (e.g. `claude-code-elevenlabs-mcp`,
  MisterVitoPro's v1.2.0) add compose. Installable only where pip/uvx have network — i.e.
  by Nathan on Windows, or not at all from the cloud sandbox. For our use a direct HTTPS
  call to the ElevenLabs REST API from a 30-line Python script in the PC shell is simpler
  than an MCP server and needs no install (if that shell's allow-list admits
  `api.elevenlabs.io` — to be tested before committing; a test call costs cents).
- **GitHub repos worth knowing, not installing yet:** `sgossner/VSCO-2-CE` and
  `sgossner/VCSL` (CC0 samples, option A), `Stability-AI/stable-audio-3` (option B),
  `facebookresearch/audiocraft` (non-commercial — reference only).

## 8. The menu (pick one; the gate layer works with all of them)

| Path | One line | Effort | Quality | Risk / cost |
|---|---|---|---|---|
| **A. Hand-arrange it, with real free instruments** | Add pad, arpeggio, countermelody, light percussion and reverb to the existing pipeline; strings/percussion from the CC0 VSCO 2 CE library through a sibling of the Salamander sampler. | 2–3 cycles, all Claude, no installs | "good MIDI mockup" — clearly richer, still rule-arranged | Low; €0. Timing untouched. Interstellar licensing question stays unless the melody is rewritten. |
| **B. Generate the bed with ElevenLabs Music (or Stable Audio) by script, keep our gate layer** | Prompt a 124-BPM instrumental loop in the Zimmer mood, pick one of a few candidates, measure its beat, re-derive `PULSE_T`, place our gate hits on top. | 1–2 cycles; needs one network test from the PC shell | "real production" bed | ~$5–25 for the experiments, monthly plan optional; read the music terms for marketing use; gates need one re-timing + re-render. Sidesteps the Zimmer issue. |
| **C. Nathan makes the song in Suno Studio, exports stems + MIDI, we assemble** | Best-sounding "song" path; Suno's stems/MIDI let us re-render pieces through our samplers and keep the gate layer separate. | Nathan's hands: an evening in the browser; 1 cycle for us | highest | $8–24 / month; 20–60 downloads a month cap; no API, so every change is Nathan's manual step. Same re-timing as B. |
| **D. Local open-weight model (Stable Audio 3 Small) on the PC** | Free and offline once installed; scripted by Claude afterwards. | High up front (Nathan installs torch + weights; GPU unknown) | small-model grade — fine for ambient beds, weak for "a song" | €0; install may eat an evening; no timing control; same re-timing as B. |

Not on the menu: MusicGen (non-commercial weights), Udio (no downloads), Mubert
(licence), a full DAW workflow (Nathan has not asked to become the producer).

**Suggested default, if Nathan wants one:** B for the bed (cheapest route to "sounds
like a song", scriptable, commercial-cleared), with A's VSCO-based gate instrument on
top — and a rewritten, original melody line for the gate layer so the Zimmer question
goes away at the same time. A alone is the zero-cost fallback if the network test in B
fails.

## Sources (read 2026-09-23)

- [Stable Audio vs. Suno, Udio, ElevenLabs, Mubert and Lyria — Stability AI (9 Sept 2026; vendor-written)](https://stability.ai/explainers/stable-audio-vs-competitors-licensing-export-rights-and-self-hosting-compared)
- [AI Music Generation API Comparison — aimusicapi.ai (3 July 2026)](https://aimusicapi.ai/en/blog/ai-music-generation-api-comparison)
- [Best Open-Source AI Music Models — Boppy (29 July 2026)](https://boppy.me/blog/best-open-source-ai-music-models)
- [Stability AI releases Stable Audio 3 — MarkTechPost (26 May 2026)](https://www.marktechpost.com/2026/05/26/stability-ai-releases-stable-audio-3-a-family-of-fast-latent-diffusion-models-for-audio-generation-and-editing/)
- [Stable Audio Open Small with Arm](https://stability.ai/news-updates/stability-ai-and-arm-release-stable-audio-open-small-enabling-real-world-deployment-for-on-device-audio-control)
- [Eleven Music capabilities — ElevenLabs docs](https://elevenlabs.io/docs/overview/capabilities/music)
- [elevenlabs/elevenlabs-mcp — GitHub](https://github.com/elevenlabs/elevenlabs-mcp)
- [Suno help: Exporting from Studio](https://help.suno.com/en/articles/8128193) · [Suno Studio guide 2026 (SL Studio)](https://www.slstudio.pro/blog/suno-studio-guide-2026)
- [AudioCraft weights CC-BY-NC — facebookresearch/audiocraft issue #198](https://github.com/facebookresearch/audiocraft/issues/198)
- [VSCO 2 Community Edition — Versilian Studios (CC0)](https://versilian-studios.com/vsco-community/) · [sgossner/VSCO-2-CE](https://github.com/sgossner/VSCO-2-CE) · [sgossner/VCSL](https://github.com/sgossner/VCSL)
- [Looperman free loops](https://www.looperman.com/loops) · [Tracklib: free & royalty-free loops](https://www.tracklib.com/blog/free-music-samples-royalty-free-loops-every-genre) · [Loopmasters](https://www.loopmasters.com/)
- ["Interstellar" copyright holders — Easy Song listing](https://www.easysong.com/search/songs/song-copyright-holder-information.aspx?s=1880648)
