# Qualifire

A mobile app that applies **F1 qualifying** logic to a daily bike commute: track the ride by GPS, split the route into sectors, and colour each sector by whether you beat your own benchmark.

Personal app first. Nathan is the only user, the only rider, and the product owner.

---

## How this repository is organised

The project is developed by a **virtual team**: a set of agent roles, each with its own file, coordinated by a Team Principal, running in periodic work cycles. This folder is the team's shared brain.

```
Qualifire/
├── README.md          You are here. Orientation only.
├── IDEAS.md           Nathan's raw idea log, in his own words. Append-only. Never edited by agents.
├── STATE.md           SINGLE SOURCE OF TRUTH. Current state, active priorities, blockers.
│
├── product/           What we are building.
│   ├── CONCEPT.md     The app concept, distilled and structured.
│   ├── DECISIONS.md   Decision log. Every settled question, dated, with rationale.
│   └── BACKLOG.md     Prioritised open work.
│
├── team/              Who is building it.
│   ├── TEAM.md        Roster, activation status, escalation path.
│   └── <role>.md      One file per member: remit, working rules, running log.
│
├── process/           How they work.
│   ├── CYCLE.md       The work-cycle protocol.
│   └── CONVENTIONS.md Logging, file and token-discipline rules.
│
├── cycles/            One short report per completed cycle.
└── archive/           Compacted history. Outside the normal read path.
```

## The two rules that matter most

1. **`STATE.md` is the only source of truth.** If a fact appears in two places, `STATE.md` wins and the other copy is a bug.
2. **Nothing is "done" because an agent said so.** Progress must point at something checkable — a file that exists, code that runs, or a decision Nathan approved.

## Where to start reading

- Want the idea? → `product/CONCEPT.md`
- Want the current status? → `STATE.md`
- Want to know how the team runs? → `process/CYCLE.md`
- Want Nathan's unfiltered thinking? → `IDEAS.md`
