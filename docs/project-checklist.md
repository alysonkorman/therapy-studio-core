# Therapy Studio Project Checklist

This is the concise execution tracker and source of truth for what comes next. See
[`master-plan.md`](./master-plan.md) for the full vision and long-term roadmap.

## Status Key

- `[x]` Complete and committed
- `[~]` Implemented or verified but not yet committed
- `[>]` Current next milestone
- `[ ]` Planned and not yet implemented
- `[!]` Blocked or partially implemented

## Current Snapshot

- **Branch:** `main`, aligned with `origin/main`
- **Working tree:** Verified implementation work is ready for commit
- **Current next milestone:** Resource Persistence Foundation
- **Last verified milestone:** Current Session Context, ready for commit
- **Last complete and committed milestone:** First Usable Prompt Library (`97815a5`)
- **Checklist updated:** August 3, 2026

## Phase 0 — Foundation

- [x] **React/Vite and repository foundation** — Established the application and
      development toolchain. Commit `09981ce`; repository evidence verified.
- [x] **Shared AppLayout and routing foundation** — Established the active dashboard,
      shared shell, route tree, and route tests. Commit `97a8a04`; verified by tests and
      build.
- [x] **Documentation foundation** — Added governing agent, architecture, Resource, and
      master-plan documentation. Commit `97a8a04`; files verified.
- [x] **Foundation cleanup and architecture hardening** — Added error handling, 404 and
      loading foundations, route coverage, and one active application path. Commit
      `97a8a04`; tests and build verified.
- [x] **Resource model and ResourceCard vertical slice** — Established the shared model,
      reusable card, and first intervention slice. Commit `97a8a04`; model and component
      tests verified.
- [x] **Prompt-deck export/import foundation** — Added immutable import artifacts,
      schemas, deterministic transformation, 137 decks, and 8,679 nested prompts. Commit
      `b0d58ac`; importer tests verified.
- [x] **First Usable Prompt Library** — Added library and deck routes, local filtering,
      and prompt-session controls. Commit `97815a5`; feature and route tests verified.
- [x] **Prompt Library search submission and keyboard behavior** — Semantic submission,
      Enter and button behavior, preserved filters, and tests are verified. Commit: pending.
- [x] **Universal Resource Search** — Deterministic cross-Resource engine, dashboard UI,
      explanations, and tests are verified. Commit: pending.
- [x] **Current Session Context** — Temporary whitelisted context, dashboard controls,
      transparent search boosts, and focused tests are verified. Depends on Universal
      Resource Search. Commit: pending.
- [>] **Resource Persistence Foundation** — Establishes the Dexie repository boundary
  without changing feature reads.
- [ ] **Therapist Resource Memory** — Planned after persistence; favorites, ratings,
      notes, and recent-use metadata.
- [ ] **Generic Client Profile Foundation** — Planned after Therapist Resource Memory;
      generic profile model, repository, and UI shell only.
- [ ] **Resource Reflection and Outcome Tracking** — Planned after profiles; lightweight
      reflection and outcome records.

## Phase 1 — Content Expansion

- [!] **Full Intervention Library migration** — The first Resource-based intervention
  exists, but the complete library import and repository integration are missing.
- [ ] **Prompt Authoring Toolkit** — Categories, deck colors, icon assignment, deck and
      prompt reordering, playlists/collections, diagnosis associations, bulk add, and inline
      editing where appropriate. Depends on the locked Phase 0 sequence.
- [ ] **Worksheet Library** — Planned connected worksheet resources.
- [ ] **Worksheet Builder** — Planned authoring workflow.
- [ ] **Workbook Builder** — Planned connected workbook authoring.
- [ ] **Psychoeducation Builder** — Planned connected psychoeducation authoring.
- [ ] **Games** — Planned clinical game resources and activities.
- [ ] **Whiteboard** — Planned telehealth whiteboard workspace.
- [ ] **Scene Builder** — Planned scene-based activity workspace.
- [ ] **Sand Tray** — Planned future activity workspace.
- [ ] **Dollhouse** — Planned future activity workspace.

## Phase 2 — Advanced Workspace

- [ ] **Session planning and randomizer** — Planned after the core resource and content
      foundations.
- [ ] **Recommendation engine** — Planned deterministic recommendations using established
      Resource, session, and memory data.
- [ ] **Therapist memory across resources and profiles** — Planned expansion after both
      foundations exist.
- [ ] **Two-player collaboration** — Planned live telehealth collaboration.
- [ ] **AI-assisted features** — Deferred until the non-AI core is mature.

## Locked Build Order

1. Resource Persistence Foundation
2. Therapist Resource Memory
3. Generic Client Profile Foundation
4. Resource Reflection and Outcome Tracking
5. Full Intervention Library migration
6. Prompt Authoring Toolkit

## Parking Lot

- Prompt bundle splitting and lazy loading
- Taxonomy normalization
- Final icon registry
- Final visual design pass
- Smart Paste or advanced bulk parsing
- Replacement of the generic Vite README
- Curated icon-library spacing, naming, and empty-folder review
- Deployment, privacy, backup, and clinical-data boundaries for persistent information

## Definition of Done

A milestone is complete only when:

- its original directive is satisfied;
- all relevant tests pass;
- `npm run format:check` passes;
- `npm run lint` passes;
- `npm run test:run` passes;
- `npm run build` passes;
- the Git diff is reviewed;
- Codex reports remaining limitations;
- Alyson reviews the result;
- changes are committed and pushed; and
- this checklist is updated with the verified commit hash.
