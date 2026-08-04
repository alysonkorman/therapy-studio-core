# Therapy Studio Master Plan

This document is the authoritative roadmap for Therapy Studio. It records established
project decisions and current repository status. A milestone brief may narrow a step,
but it must not silently broaden or contradict this plan.

Execution status and the current next milestone are tracked in
[`project-checklist.md`](./project-checklist.md). This document remains the full vision
and long-term roadmap.

## Vision

Therapy Studio is Alyson's telehealth-only clinical workspace. Its purpose is to help
her quickly find something clinically meaningful, effective, and engaging for a child
in the current moment.

It is not an EHR and is not intended to become a general product for other therapists.
The older application remains available for live sessions while this application is
built on a stable, maintainable foundation.

The north star is simple: Alyson should always have something useful she can turn to
quickly that has clinical meaning and makes a child want to participate.

## Core Principles

1. Telehealth is the default setting, not an adaptation.
2. Clinical meaning and engagement must exist together.
3. Fast retrieval during a live session is more important than feature volume.
4. Multiple entry points are intentional because Alyson may think differently from
   session to session.
5. Resources are connected rather than divided into isolated libraries.
6. The interface is simple by default and reveals advanced information on demand.
7. Every resource should quickly answer: Should I use this now? How do I use it? What
   should I use with it?
8. The system should eventually preserve what Alyson learns from using resources.
9. A child's willingness to participate is a primary measure of success.
10. New capabilities must connect to the same resource and application foundations.

The core ideas are universal search, connected resources, current-session context,
live two-player activities, and therapist memory. Prompts, interventions, games,
worksheets, workbooks, psychoeducation, and interactive activities are connected
resource forms.

## Build Rules

- Work on one approved milestone at a time.
- Do not start feature expansion while foundation work remains in the active milestone.
- Do not broaden a milestone to address unrelated discoveries.
- Preserve the established React, Vite, React Router, Resource model, and shared-shell
  architecture.
- Finish the requested vertical slice before refactoring or generalizing it.
- Prefer focused reusable components and avoid duplicated rendering.
- Keep ordinary use simple; place secondary clinical metadata behind advanced views.
- A feature is not complete unless its primary workflow is reachable and discoverable
  in the routed application.
- Do not reorganize unrelated files, install packages, redesign working visuals, or
  introduce persistence/state systems without a milestone that requires them.
- Preserve curated resources, icons, documentation, attribution, and working visual
  content.
- Run format, format check, lint, tests, and build before completing implementation
  milestones.
- Never commit automatically.
- Record unrelated findings in the Parking Lot.

## Current Status

Therapy Studio is a React 19/Vite application with React Router and a shared
`AppLayout`. The active entry path is:

`main.jsx -> router -> AppLayout -> route page`

The existing dashboard design is the home route. Routes exist for the dashboard,
prompts, interventions, games, worksheets, workbooks, whiteboard, scene builder,
clients, saved items, and settings. Most non-foundation feature pages remain explicit
placeholders.

The Resource foundation includes a Zod schema, factory, sample Feelings Jenga
intervention, reusable `ResourceCard`, and focused model/component tests. The
Interventions page uses that shared card. Advanced card information is expandable;
favorite and rating persistence are not implemented.

Formatting, linting, focused tests, and the production build pass as of Milestone
0.5A. The malformed third-party Flaticon license HTML is preserved and narrowly
excluded from Prettier.

The repository contains planned folders and installed foundation dependencies for
later work. Empty folders, dependencies, and placeholder pages do not mean those
features are implemented or authorized.

## Completed Milestones

### Initial repository foundation

- Initialized React and Vite.
- Established the Therapy Studio vision.
- Added collaboration and drag-and-drop foundation dependencies.
- Built the initial dashboard design.
- Added the curated icon library.
- Created the Resource model and first intervention.

### Milestone 0.5A — Stabilize the Existing Therapy Studio Foundation

- Completed the first Resource vertical slice.
- Rendered Feelings Jenga through the shared `ResourceCard`.
- Added Resource model and ResourceCard tests.
- Restored passing format checks while preserving imported licenses.
- Established one active application entry path.
- Preserved the dashboard inside `DashboardPage` and removed the unused standalone
  application shell.

### Milestone 0.25 — Project Documentation Foundation

- Established this authoritative master plan.
- Documented current architecture and agreed direction.
- Added permanent instructions for AI coding agents.

### Milestone 0.4 — Foundation Cleanup and Architecture Hardening

- Verified the single application entry and route structure.
- Added application and route-level error handling, a not-found route, and a shared
  loading component.
- Added stable component barrels where they improve imports.
- Added shared testing setup, routing helpers, route-table coverage, placeholder smoke
  tests, and shared-foundation component tests.
- Completed the Resource model documentation and made the legacy roadmap file point to
  this authoritative plan.

This documentation milestone was completed after 0.5A in repository history; its
number describes the agreed foundation order rather than the chronological order in
which the work happened.

### Resource Persistence Foundation — complete

- Added the version 1 Dexie/IndexedDB Resource database boundary.
- Added validated repository reads, writes, archive/restore, permanent deletion, and
  explicit transactional seeding.
- Verified ordinary Resource and complete Prompt Deck compatibility without changing
  feature reads or startup behavior.
- Committed as `2d6d508`.

### Prompt Authoring Toolkit — complete

- Added explicit, conflict-reporting seeding for all 137 imported decks and 8,679
  prompts; imported JSON remains immutable.
- Added editable deck and prompt schemas, persistent categories and playlists, focused
  repositories, inline editing, bulk add, metadata/appearance controls, ordering, and
  archive/restore workflows.
- Added the additive database version 2 migration without changing existing Resource
  records.
- Replaced the temporary Prompt-only icon choices with one reusable Icon Browser and a
  shared lazy Icon Service covering the full curated SVG library. Prompt Decks and
  Categories persist semantic IDs only; Lucide remains for interface controls and
  fallback presentation.
- Committed as `6bd1434`.

### Therapist Resource Memory — implemented, pending commit

- Added additive database version 3 and a separate strict Resource Memory model and
  repository without changing imported or authored Resource content.
- Added favorites, ratings, meaningful-use history, private non-identifying notes and
  therapist matching lists, card controls, Prompt browse options, and Saved collections.
- Profiles, outcomes, recommendations, AI, remote sync, and ranking boosts remain
  deferred. Commit: pending.

## Remaining Milestones

The following established capability areas remain. They are not permission to start
work and do not imply implementation beyond an approved milestone brief:

- Universal search across connected resource types.
- Current-session context and clinically useful recommendations.
- Therapist memory, including what worked, what did not, notes, ratings, favorites,
  usage history, and clinical wins.
- Prompt and intervention libraries built on the shared Resource model.
- Games and interactive tools, including live two-player telehealth activities.
- Client profiles that support retrieval without turning Therapy Studio into an EHR.
- Worksheet Builder.
- Workbook and psychoeducation builder.
- Whiteboard.
- Scene Builder.
- Sand Tray.
- Dollhouse.
- Two-player session mode and collaboration.
- Resource import and source-document connections.

Each capability must be divided into a bounded milestone before implementation. The
approved brief determines the exact files, behaviors, and verification for that step.

## Parking Lot

- Decide the final milestone numbering and order for Phase 1 feature expansion before
  beginning it; no complete numbered Phase 1 sequence exists in the repository yet.
- Replace the generic Vite README when a dedicated project onboarding milestone is
  approved.
- Reconcile the broader resource forms in the vision with the current schema's exact
  resource-type enum in a Resource-model milestone.
- Review legacy spacing, naming inconsistencies, and empty categories in the curated
  icon library without renaming or reorganizing them during feature work.
- Define deployment, privacy, backup, and clinical-data boundaries before persistent
  client/session information is introduced.

## Fixed Build Order

The currently agreed order is:

1. **Milestone 0.25 — Project Documentation Foundation.** Establish the governing
   roadmap, architecture guide, and agent instructions.
2. **Milestone 0.4 — Foundation Cleanup and Architecture Hardening.** Verify and harden
   the repository, routes, shared foundations, testing utilities, and documentation
   without feature development.
3. **Milestone 0.5A — Stabilize the Existing Therapy Studio Foundation.** Complete the
   Resource vertical slice, automated checks, active entry path, and routed dashboard.
4. **Approved next sequence.** Complete the following milestones in this locked order:
   1. Resource Persistence Foundation.
   2. Prompt Authoring Toolkit.
   3. Therapist Resource Memory.
   4. Generic Client Profile Foundation.
   5. Resource Reflection and Outcome Tracking.

Steps 1 through 4 are complete through Prompt Authoring Toolkit. Therapist Resource
Memory is implemented and pending verification and commit; Generic Client Profile
Foundation is next only after that commit. The Prompt
Authoring Toolkit scope is deck creation, editing, archiving, and duplication; inline
editing where appropriate; bulk prompt addition; category creation and editing; deck
colors and icon assignment; deck and prompt reordering;
playlists/collections; and diagnosis, goal, age-range, and tag associations. Smart
Paste, advanced bulk parsing, AI-assisted authoring, and final visual polish are
deferred. The order may be changed only through an explicit project decision recorded
here; agents must not invent or reorder future milestones.
