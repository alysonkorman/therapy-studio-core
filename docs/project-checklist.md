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
- **Working tree:** Dashboard, Worksheet Builder, Intervention Library, and telehealth
  privacy work remain uncommitted; Layer 1 foundations are verified and pending commit
- **Current next milestone:** Resource Reflection and Outcome Tracking
- **Last verified milestone:** Session Profiles (`4ecff03`)
- **Last complete and committed milestone:** Session Profiles (`4ecff03`)
- **Checklist updated:** August 9, 2026

## Phase 0 — Foundation

- [x] **React/Vite and repository foundation** — Established the application and
      development toolchain. Commit `09981ce`; repository evidence verified.
- [x] **Shared AppLayout and routing foundation** — Established the active dashboard,
      shared shell, route tree, and route tests. Commit `97a8a04`; verified by tests and
      build.
- [x] **Layer 1 Navigation & App Shell hardening** — Added one shared navigation
      definition, accessible skip navigation, a current-page toolbar, permanent access
      to the existing Dashboard search, complete Settings access, explicit focus
      treatment, and one responsive desktop/mobile navigation implementation. Full test,
      lint, build, and responsive verification gates pass. Commit: pending.
- [x] **Layer 1 Page Layout System** — Added shared semantic Page, Section, and EmptyState
      primitives and verified them across Interventions, Worksheets, Settings, and Saved
      at desktop, tablet, and mobile widths. Commit: pending.
- [x] **Layer 1 Design System foundation** — Added a restrained spacing, radius, surface,
      border, shadow, typography, button, form-control, and general surface foundation.
      Feature-specific Prompt, ResourceCard, Worksheet canvas, and print styles remain
      intentionally independent. Full format, lint, test, and build gates pass. Commit:
      pending.
- [x] **Layer 1 Dashboard Clinical Workspace Pass** — Kept Universal Search primary,
      surfaced up to three recently used Resources through the existing Resource Memory
      repository, reduced tool access to six relevant destinations with honest placeholder
      labeling, preserved Current Session context, and removed misleading unavailable
      actions. Desktop, tablet, mobile, test, lint, and build verification pass. Commit:
      pending.
- [x] **Layer 1 Universal Resource Model completion** — Confirmed one canonical Resource
      contract and repository boundary, made tags shared, added Activity to the
      authoritative type definition, protected global ID uniqueness for static and
      persisted Resources, and added type-aware UI identity without migrating stored IDs.
      Prompt, Worksheet, and Intervention feature data remain focused extensions. Commit:
      pending.
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
- [~] **Universal Search Data-Source Integration** — Universal Search now combines the
  validated static Prompt Deck and Intervention aggregate with active persisted
  Worksheet Resources, using deterministic type-aware deduplication, result-derived
  type filtering, valid destinations, and isolated loading/failure behavior. Full
  test, lint, and build gates pass. Commit: pending.
- [x] **Current Session Context** — Temporary whitelisted context, dashboard controls,
      transparent search boosts, and focused tests are verified. Depends on Universal
      Resource Search. Commit: pending.
- [x] **Resource Persistence Foundation** — The Dexie Resource database, validated
      repository, explicit transactional seed pathway, and isolated tests are verified.
      Commit `2d6d508`.
- [x] **Therapist Resource Memory** — Separate favorites, ratings, meaningful use,
      private resource notes, matching lists, Saved collections, and Prompt browse
      controls are implemented. Commit `9ccf88b`.
- [~] **Telehealth Session Privacy and Essential Interaction Repair** — Prompt and
  Intervention use pages now keep all therapist memory controls behind a closed
  therapist-only disclosure; private narrative values are conditionally mounted only
  after explicit opening and reset closed across Resources. Worksheet presentation and
  print surfaces remain free of Resource Memory, and real-browser Dashboard Enter
  submission now works for Prompt and Intervention queries. Focused and full quality
  gates pass. Commit: pending.
- [x] **Session Profiles** — Non-identifying reusable context, local repository, active
      selection, explicit Current Session loading, and descriptive compatibility indicators.
      Commit `4ecff03`.
- [>] **Resource Reflection and Outcome Tracking** — Planned after profiles; lightweight
  reflection and outcome records.

## Phase 1 — Content Expansion

- [~] **Intervention Library MVP** — Eight deterministic canonical Intervention
  Resources, separately validated session guidance, local search and lightweight
  filters, detail routes, shared Resource Memory, and direct Universal Search,
  Saved, and recent-resource destinations are implemented and verified. The older
  source-based Toolkit collection remains excluded pending individual source and
  clinical review. Commit: pending.
- [x] **Prompt Authoring Toolkit** — Create, edit, archive, and duplicate decks; inline
      editing where appropriate; bulk add prompts; create and edit categories; choose deck
      colors; assign icons; reorder decks and prompts; create playlists or collections;
      and associate diagnoses, goals, age ranges, and tags. Smart Paste, advanced bulk
      parsing, AI-assisted authoring, and final visual polish are deferred. Planned
      implemented on Resource Persistence Foundation. Its reusable Icon Browser exposes
      the full curated library through the shared lazy Icon Service. The Prompt Library
      now keeps session-time browsing controls prominent while placing secondary
      authoring and reordering controls behind an accessible Library Tools disclosure.
      Commit `6bd1434`.
- [~] **Worksheet Library** — Ten original, validated Therapy Studio starter Worksheets
  now support library search, preview, telehealth presentation, print/PDF access,
  Universal Search, Saved, Resource Memory, and protected duplicate-to-edit behavior.
  Broader Worksheet content expansion remains future work. Commit: pending.
- [~] **Worksheet Builder** — Persisted Resource-and-document authoring, reopen/save,
  block editing, preview, session presentation, printing, and editable starter copies
  are implemented and verified. The full future Worksheet Studio remains incomplete.
  Commit: pending.
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
2. Prompt Authoring Toolkit
3. Therapist Resource Memory
4. Generic Client Profile Foundation
5. Resource Reflection and Outcome Tracking

## Parking Lot

- Prompt bundle splitting and lazy loading
- Taxonomy normalization
- Future icon-browser reuse beyond Prompt Decks and Categories
- Final visual design pass
- Smart Paste or advanced bulk parsing
- Replacement of the generic Vite README
- Curated icon-library spacing, naming, and empty-folder review
- Intervention Source Review & Migration for the older private/source-based Toolkit
  collection
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
- the feature is reachable and discoverable in the routed application;
- Codex reports remaining limitations;
- Alyson reviews the result;
- changes are committed and pushed; and
- this checklist is updated with the verified commit hash.
