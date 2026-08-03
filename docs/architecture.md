# Therapy Studio Architecture

This document describes the current organization of Therapy Studio and the agreed
direction already represented by the repository. It is a guide to preserving the
architecture, not a proposal to replace it.

## Application Shape

Therapy Studio is a client-side React application built with Vite. The active rendering
path is:

`src/main.jsx -> src/app/router.jsx -> src/layouts/AppLayout.jsx -> route page`

There must be one application shell. Route pages render inside `AppLayout` through
React Router's `Outlet`; feature pages must not create their own sidebar or second root
shell.

## Folder Responsibilities

### `src/app`

Application-level wiring. It currently owns the route table. Keep route definitions
centralized here unless a future approved milestone explicitly changes that approach.

### `src/layouts`

Shared page structure. `AppLayout` owns the persistent Therapy Studio shell and primary
navigation. It renders the active page through `Outlet`.

### `src/features`

Feature-owned pages and components. Each domain has its own folder, including the
dashboard, prompts, interventions, games, worksheets, workbooks, whiteboard, scene
builder, clients, settings, search, sessions, sand tray, and dollhouse.

Keep code inside a feature when it serves only that feature. Move something to shared
code only after it is genuinely reused across domains.

### `src/models`

Domain shapes, validation, and creation rules. `resource.js` contains the shared Zod
Resource schema, supported types, defaults, timestamps, and factory. Resource-driven
features must reuse this model rather than define parallel resource objects.

### `src/components`

Reusable application components that are not owned by one feature. `ResourceCard`
provides the shared simple-by-default presentation for resource metadata and expandable
advanced details.

### `src/data`

Seed data and static domain data. Resource seed modules live under
`src/data/resources`; client and setting data have reserved folders. Static data files
may construct resources through the shared factory, but they should not become an
alternative model or persistence layer.

### `src/engines`

Domain logic that is broader than a component or page. Reserved areas include canvas,
collaboration, games, import, PDF, prompts, recommendations, resources, and sessions.
Most are currently empty foundations.

Search and retrieval logic belongs in `src/engines/resources` and recommendation logic
in `src/engines/recommendations`. Search-specific UI belongs in
`src/features/search`. Do not embed the eventual universal-search engine in a page
component.

### `src/lib` and `src/lib/data`

Infrastructure adapters and data-access implementation. Persistent storage adapters
belong here rather than in components, models, or seed-data files.

### `src/shared`

Code proven to be shared across multiple features: small components, constants, hooks,
icons, and utilities. Avoid placing speculative abstractions here.

### Other reserved folders

`hooks`, `stores`, `styles`, `types`, `utils`, and `widgets` exist for focused concerns
their names describe. They are not a requirement to move existing code, and empty
folders do not authorize new infrastructure. `public` contains files served as-is;
`docs` contains governing project documentation; `tests` is available for broader
cross-feature tests when needed.

## Routing

`createBrowserRouter` defines the route tree. `/` uses `AppLayout`, with the dashboard
as its index page. Current child routes are:

- `/prompts`
- `/interventions`
- `/games`
- `/worksheets`
- `/workbooks`
- `/whiteboard`
- `/scene-builder`
- `/clients`
- `/saved`
- `/settings`
- `*` (not-found fallback)

Not every route is linked in primary navigation, and most routes are placeholders.
Route existence must not be mistaken for feature completion. Navigation expansion
requires its own approved scope. The root route supplies a route-level error fallback,
and the application entry wraps the router in the shared error boundary.

## Layouts and Styling

`AppLayout` owns the shell; route pages own their content. Existing global application
styles are in `src/App.css`, with foundational document styles in `src/index.css`.
Component-specific styles, such as `ResourceCard.css`, stay with their component.

Avoid inline styles. Preserve existing visuals unless a milestone explicitly includes
design work. A feature may gain a focused stylesheet when that prevents unrelated
global or inline styling.

## Resource Model

Resources are the common language connecting prompts, interventions, games,
worksheets, workbooks, psychoeducation, visuals, scenes, whiteboards, and other
clinical activities.

The current model validates identity, type, title, description, situational fit,
related interests and goals, diagnoses, ages, settings, materials, duration,
telehealth suitability, source and research, Alyson's notes, rating, favorite status,
related resource IDs, usage history, and timestamps.

`createResource` applies defaults and generates identity and timestamps. New resource
data and resource UI must use the model and `ResourceCard` rather than create parallel
shapes or duplicate the card.

The vision describes some resource forms and learning fields not yet represented
exactly in the current schema. Extend the schema only through an explicit Resource
milestone; do not silently add types or fields during unrelated work.

## Shared Components

A component belongs in `src/components` or `src/shared/components` only when more than
one feature genuinely needs the same behavior or presentation. Prefer composition and
small feature-local helpers before creating a generalized system.

`ResourceCard` is already shared. It presents core information first, hides empty
optional sections, and expands source, research, Alyson's notes, and usage information
on demand. Persistence is deliberately outside the card. Shared foundation components
also include the application error boundary and a neutral loading status. Component
folders expose small barrel files where that improves stable imports.

## Data and Persistence Strategy

Therapy Studio has one local Resource persistence boundary under `src/lib/data`.
`database.js` owns the lazy Dexie/IndexedDB database and version declarations;
`resourceRepository.js` owns validated reads, writes, archive state, explicit seeding,
and structured errors. UI components do not import Dexie.

Database version 1 contains only the `resources` table with stable Resource IDs as its
primary keys. It is not seeded automatically. The Prompt Library and other features
continue using their existing in-repository data modules until a later milestone
explicitly changes feature reads. Zustand remains the temporary Current Session state
mechanism and is not persistence.

Do not store clinical data directly from page components. Before persistent client or
session data is implemented, the relevant milestone must define privacy, data
boundaries, migrations, backup, and failure behavior. Version 1 stores no client,
session, profile, therapist-memory, or outcome data. Therapy Studio must not drift into
EHR behavior.

Yjs and WebSocket collaboration dependencies are installed for the eventual
two-player direction, but no collaboration architecture is currently active. That work
belongs to a dedicated milestone.

## Search Architecture

Universal search will operate across the shared Resource model and combine resource
metadata with optional current-session context. Search UI belongs in
`src/features/search`; reusable resource query/index logic belongs in
`src/engines/resources`; ranking and context-sensitive recommendations belong in
`src/engines/recommendations`.

Search must not create type-specific silos or duplicate Resource definitions. The
engine, index, ranking behavior, and persistence of search data remain unimplemented
until approved milestones define them.

## Icon Strategy

Use Lucide for ordinary interface/navigation symbols where suitable. The curated
Flaticon SVG library is a preserved project asset for child-facing and activity-facing
visuals. Attribution and license files must remain intact.

Curated icons should be accessed through the shared icon area/registry when that
registry is implemented by an approved milestone. Do not rename, mass-format,
reorganize, or import the entire raw library into feature code. Existing spacing,
casing, empty directories, and legacy filenames are asset-management concerns, not a
reason to alter unrelated features.

## Testing Philosophy

Tests should protect clinically and architecturally meaningful behavior without
coupling to incidental markup.

- Model tests verify validation, generated fields, defaults, and metadata preservation.
- Shared-component tests verify visible information, conditional sections, and user
  interactions.
- Feature tests should verify feature composition and user outcomes.
- Engine and repository tests should be added with those layers, including failure and
  migration cases where relevant.
- Prefer focused tests near the code they cover; use the root `tests` folder only for
  broader integration behavior.
- Shared test setup and rendering helpers live in `src/test`. The setup owns DOM
  matchers and automatic cleanup; `renderWithRouter` supplies a minimal memory router
  for component tests that need routing context.
- Route-table tests protect known paths and the not-found fallback. Placeholder-page
  smoke tests ensure reserved routes remain compilable while features are unfinished.
- Do not add a test framework or helper package when the installed Vitest and Testing
  Library setup is sufficient.

Every implementation milestone finishes by running formatting, format checking, lint,
the non-watch test suite, and a production build.
