# Cycle 18: open items for Nathan

No commands to run: everything in this cycle is done. Only listening and one decision remain.

## 1. Listen (no commands)

Files are in `marketing\audio-studio\stemsplitter\tunetank-emotional-classical\sources\`.

- `strings-model_strings.mp3` soloed: are the artifacts acceptable? Judge them at bed level, not
  only soloed.
- `strings-model_other.mp3`, around 3–10 s: any plucked line (harp/pizzicato)? That would be the
  only thing the "no guitar" conclusion could miss.

## 2. Decide: what bed plays under ride 2? (cycle 16's `ride/ride_tunetank.py`)

| option | bed for ride 2 | keeps | loses |
|---|---|---|---|
| **A** | `strings-model_strings` | the clean strings | the swell (0–1.26 s), percussion, bass; about 5.4 dB quieter RMS, so `GAIN_BED` needs a bump |
| **B** | strings + `6stem_drums` + `6stem_bass` (= original without piano) | the swell, pulse and low end | only the piano: the clash is gone |
| **C** | unchanged (original) | everything | the piano-vs-E5 clash stays |

Ride 1 keeps the original in every option: its fade-out *is* the piano tail.

Once you pick, the next cycle writes a brief for a new ride sound round. `ride/soundv3` is
already taken by cycle 17's re-mux, so check the next free round number then.

## 3. Housekeeping (none required)

- The Downloads copies of the stems and the Gemini PDF stay where they are (stems renamed). The
  project copies are the ones the scripts and docs point to. Remove the Downloads ones by hand
  whenever you like.
