# stemsplitter

Stem separation for the audio-studio: splitting stock tracks into parts (strings, piano,
drums…) so a bed can be rebuilt from some of them. Started 2026-09-24.

## Contents

| path | what |
|---|---|
| `REVIEW-gemini-stemsplitter.md` | review of the Gemini chat export (`Downloads/gemini stemplitter export.pdf`): which tool to use (MVSEP, not UVR5) and whether it is worth it for cycle 16 |
| `tunetank-emotional-classical/` | the MVSEP stems of the cycle-16 ride bed, with analysis |
| `tunetank-emotional-classical/WAVEFORM-NOTES.md` | **start here**: findings, timeline, what it means for the ride |
| `tunetank-emotional-classical/sources/` | the stems (renamed) + `original.mp3` reference copy |
| `tunetank-emotional-classical/figures/` | `stems_overview.png` (all stems stacked) + one `waveform_<stem>.png` per non-empty stem |
| `tunetank-emotional-classical/analyze_stems.py` | makes the numbers and the overview figure; `analysis_output.txt` is its verbatim output |

## Log

- **2026-09-24**: Reviewed the Gemini export and recommended MVSEP's Bowed Strings model →
  `REVIEW-gemini-stemsplitter.md`.
- **2026-09-23 (Nathan)**: Ran two MVSEP jobs on `tunetank-emotional-classical-484234.mp3`
  and downloaded them to `Downloads/`.
- **2026-09-24**: Renamed the downloads in place in `Downloads/` (originals below) and copied them
  into `tunetank-emotional-classical/sources/`. Analysed the stems →
  `tunetank-emotional-classical/WAVEFORM-NOTES.md`.

### Rename map (in `Downloads/`, and the same names in `sources/`)

Folder `mvsep-tunetank-emotional-classical- strings vs other/` (MVSep Strings model):

| new | MVSEP original |
|---|---|
| `strings-model_strings.mp3` | `53839-a1-20260923222807-c75678ab76-tunetank-emotional-classical_mvsep_strings_model_mt_1_strings.mp3` |
| `strings-model_other.mp3` | `53839-a1-20260923222807-c75678ab76-tunetank-emotional-classical_mvsep_strings_model_mt_1_other.mp3` |

Folder `mvsep-tunetank-emotional-classical- fuller analysis/` (BS-Roformer 6-stem model):

| new | MVSEP original |
|---|---|
| `6stem_<stem>.mp3` for `bass, drums, guitar, instrum, other, piano, vocals` | `20260923225135-92ad3aa00f-53867-a1-20260923225133-67eddc0add-tunetank-emotional-classical_bs6stem_mt_0_<stem>_[mvsep.com].mp3` |

The Downloads copies are left in place (nothing deleted). The project copies in `sources/` are
the ones the scripts read.
