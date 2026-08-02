# Therapy Studio Agent Instructions

These instructions apply to all work in this repository. Follow the active user request
and milestone brief in addition to this file. When instructions conflict, stop and
surface the conflict rather than silently changing architecture or scope.

## General Rules

- Work on one milestone at a time.
- Never broaden a milestone.
- Finish the requested work before refactoring.
- Preserve the established architecture.
- Do not reorganize unrelated files.
- Prefer reusable components where reuse is real.
- Avoid duplicated models, rendering, state, and business logic.
- Keep components reasonably small and focused.
- Use shared folders only for code that is truly shared.
- Treat empty folders and installed dependencies as reserved foundations, not
  authorization to implement them.
- Preserve existing dirty work unless the milestone explicitly replaces it.
- Preserve curated icons, attribution, documentation, resource data, and working visual
  content.
- Do not install packages unless explicitly authorized.
- Do not redesign visuals unless design work is in scope.
- Do not start another feature while finishing the current milestone.
- Run `npm run format`, `npm run format:check`, `npm run lint`,
  `npm run test:run`, and `npm run build` after implementation work.
- Never commit automatically.
- Capture unrelated discoveries and ideas under a brief Parking Lot heading.

Before editing, inspect the working tree, relevant documentation, active application
path, and existing implementation. State the intended file scope when the milestone
brief requires it. After editing, report every created, changed, moved, and deleted
file, along with verification results and known limitations.

## Project Philosophy

Therapy Studio is:

- telehealth-first;
- built specifically for Alyson;
- centered on quickly finding clinically meaningful, effective, and engaging
  activities for the child in the current moment;
- simple by default;
- expandable through advanced information;
- designed around reusable, connected resources;
- intended to preserve therapist learning and memory over time; and
- eventually collaborative through live two-player activities.

Therapy Studio is not an EHR. Universal search, connected resources, current-session
context, live two-player activities, and therapist memory are core ideas. Prompts,
interventions, games, worksheets, workbooks, psychoeducation, and interactive
activities must participate in the same underlying resource system rather than become
isolated feature silos.

## Coding Standards

- Avoid inline styles. Use existing styles or a focused stylesheet in the appropriate
  component or feature.
- Reuse the Resource model for resource data.
- Reuse `ResourceCard` for the established resource-card presentation.
- Prefer composition over duplication.
- Preserve the shared application shell and active path:
  `main.jsx -> router -> AppLayout -> route page`.
- Route pages render content inside `AppLayout`; do not create a second shell.
- Respect folder responsibilities documented in `docs/architecture.md`.
- Keep feature-specific code in its feature until it is genuinely shared.
- Keep persistence, search, recommendation, and collaboration logic out of page
  components.
- Do not introduce Zustand, Dexie, Yjs, repositories, or global state outside an
  approved milestone that requires them.
- Keep ordinary resource information immediately visible and advanced clinical details
  expandable.
- Hide empty optional sections rather than rendering empty headings.
- Maintain accessible labels and semantic controls for interactive UI.
- Add focused tests for new model behavior, shared-component behavior, engines, and
  repositories as those layers are implemented.

Use `docs/master-plan.md` as the roadmap and `docs/architecture.md` as the organization
guide. A milestone brief controls the immediate work; the roadmap backlog is not
permission to begin future features.
