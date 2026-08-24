# demos/ — browser prototypes and design tools

None of these are the app — they're prototypes and tools that inform it. See
`HOW-THE-APP-IS-BUILT.md` for "mockup vs. app."

| File | One line |
|---|---|
| `mockup.html` | The current browser mockup of the app's screens — the design reference this folder's other tools point to. Regenerated incrementally as the real app's screens change. |
| `index.html` | Landing page linking out to the demos below. |
| `workbench.html` (+ `workbench-data.js`) | The route workbench tool — browse a GPX, inspect gate/sector candidates, propose a reference ride, without touching the live app. |
| `routes-check.html` (+ `routes-data.js`) | Visual check of every route's drawn line and gates against the map. |
| `gates-check.html` | Visual check of gate placement and detection logic. |
| `tower-ghosts.html` | Prototype of the live timing tower against ghost data. |
| `earcons-audition.html` | Listen to the E-major earcon set (D-019) outside the app. |
| `basemap-capture.html` | Tool for capturing/testing the map basemap tiles. |
| `routemap-preview.html` | Standalone preview of the route map rendering. |
| `legacy-mockup-cycle007.html` | The cycle-007 mockup, kept for reference — superseded by `mockup.html`. |
| `ways/` | One HTML page per way (e.g. `home--work.html`), visualising that way's routes and gates individually. |

Read by: the Designer and Mobile Dev (design reference and rendering checks), Nathan
(mockup.html is the fastest way to see a proposed screen without a rebuild).
