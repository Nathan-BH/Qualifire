# The Team

Roster of the virtual development team. Roles are drawn from how real mobile-app teams are composed, trimmed to what a solo-first MVP actually needs, plus two roles specific to this project.

Research note (web search, 2026-08-14): standard mobile teams run product owner / project manager, UI-UX designer, mobile developer(s), backend developer, QA engineer, sometimes a business analyst, with DevOps and security added only at scale. Industry guidance is consistent that at the earliest stage **roles overlap and dedicated PM/DevOps roles add cost without value** — so this roster stays deliberately small, and several members start dormant. Sources listed at the foot of this file.

**Status note:** the roster below is `PROVISIONAL` until Nathan approves it. `team/TEAM.md` is the authority for activation status; each role file's `**Status:**` header mirrors this table and must never be edited independently of it.

---

## Roster

| Role | File | Real-world equivalent | Status |
|---|---|---|---|
| **Team Principal** | `team-principal.md` | Project manager / delivery lead | **ACTIVE** |
| **Product Owner** | `product-owner.md` | Product owner | **ACTIVE** |
| **Race Engineer** | `race-engineer.md` | Domain / algorithms specialist | **ACTIVE** |
| **Designer** | `designer.md` | UI/UX designer | **ACTIVE** |
| **Librarian** | `librarian.md` | Tech writer / knowledge management | **ACTIVE** |
| Mobile Developer | `mobile-dev.md` | iOS/Android or cross-platform dev | **ACTIVE** — woken early by Nathan (cycle 002) |
| Backend Developer | `backend-dev.md` | Backend / data engineer | dormant |
| QA Engineer | `qa.md` | QA engineer | dormant |
| **Art Director** | `art-director.md` | Visual identity / brand design lead | **ACTIVE** — added by Nathan (2026-08-15) after three under-delivered "livelier" requests |
| **Navigation Engineer** | `navigation-engineer.md` | Geospatial / routing specialist | **ACTIVE** — added by Nathan (2026-08-17, cycle 011) for IDEAS §28–29 |

**Dormant** means the file exists but the role is not invoked in cycles. Waking a role costs tokens every cycle thereafter, so roles wake only when there is real work for them. Concept-phase work does not need developers; asking them to contribute now produces speculative architecture for a product that hasn't been defined.

**Activation trigger for all three dormant roles** (Mobile Dev, Backend Dev, QA): the colour model (B-01) and sector definition (B-02) are both settled.

---

## Two project-specific notes

**Navigation Engineer** is the third non-standard seat, and it exists for a reason worth stating: until cycle 011 every route in this project was hand-ratified with hand-measured gates, seeded from a 624-ride personal archive. IDEAS §20 (many ways), §28 (a fresh install with no archive) and §29 (type a destination) all break that in the same place — **a route must be able to exist before it has ever been ridden.** That is a road-graph and geometry problem, not a timing problem, and putting it in the Race Engineer's seat would have overloaded the most important chair on the team with a different discipline. The boundary is explicit: Navigation hands over *candidate* sectors and *candidate* comparison sets; the Race Engineer rules on whether any of it may be coloured.

**Race Engineer** is not a standard software role. It exists because this project's hard part is not the app — it is the *timing model*: sectoring a GPS trace, defining fair comparisons, and deciding what counts as an improvement. In a normal team this would be a data or domain specialist. Here it is the most important seat on the team.

**Librarian** is not standard either, and is not optional. An autonomous team accumulates logs every cycle; without active compaction, cycle N must read N−1 cycles of history and cost grows quadratically. The Librarian is what keeps this project affordable over time.

**Deliberately absent:** DevOps (nothing to deploy), Security (single-user, no accounts), Business Analyst (Nathan is the market), Marketing (no users). These can be added later; adding them now would be theatre.

---

## Escalation path

Members → Team Principal → Nathan.

Members never address Nathan directly and never talk to each other. All cross-role information flows through the Principal. This keeps the read graph a star, not a mesh — the difference between linear and quadratic cost as the team grows.

---

## Conflict of interest, by design

The Product Owner argues for what makes the app good. The Race Engineer argues for what is measurable and fair. The Designer argues for what is legible at a glance. These pull against each other on purpose — the tension is where the good decisions come from. The Principal is required to record disagreement rather than average it away.

---

## Sources for the research note

- [Mobile app development team: roles and structure — Innowise](https://innowise.com/blog/mobile-app-development-team/)
- [Mobile App Development Team: Structure and Roles — Velvetech](https://velvetech.com/blog/mobile-app-development-team-structure/)
- [MVP Development Team: Structure, Roles, and Hiring Tips — Plavno](https://plavno.io/blog/mvp-development-team-structure-roles-and-hiring-tips)
- [MVP development team guide — DECODE](https://decode.agency/article/mvp-development-team-guide/)
