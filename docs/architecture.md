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
`navigation.js` is the single configuration for shell navigation labels, paths, icons,
and parent-route matching; desktop and mobile presentations must consume that same
definition.

### `src/layouts`

Shared page structure. `AppLayout` owns the persistent Therapy Studio shell and primary
navigation. It renders the active page through `Outlet`. The shell includes an
accessible skip link, sticky toolbar, current-page context, and a permanent link to the
existing Dashboard search. The fixed desktop sidebar becomes one controlled drawer at
tablet and mobile widths rather than rendering a second set of navigation links.

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
advanced details. `components/layout` owns the opt-in `Page`, `Section`, and `EmptyState`
primitives used to standardize page width, heading hierarchy, actions, major section
spacing, and quiet empty states without turning every area into a card. `components/ui`
contains small shared controls, beginning with the composable `Button`.

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

The restrained design-system foundation lives in `src/styles/design-system.css`. It
defines the shared spacing and radius scales, surface and border concepts, subtle
elevation, core page typography, control sizing, button variants, opt-in form-control
styles, and the general-purpose surface treatment. Shared values remain CSS custom
properties so feature styles can adopt them incrementally. Features retain specialized
presentation where it communicates a real domain need; Prompt cards, Resource cards,
the Worksheet canvas, and print layouts are intentionally not normalized by the page
foundation.

Representative route pages use `Page` for one semantic page title and responsive header
actions. `Section` separates major page areas primarily through whitespace, and
`EmptyState` provides a consistent low-emphasis fallback with an optional action. These
primitives are additive; migration is incremental rather than a broad page rewrite.

The shell keeps Settings available in its shared navigation at every width. Home uses
exact route matching while nested Prompt and Worksheet routes retain their parent
navigation state. Shell controls use explicit focus-visible treatment, and the global
search entry targets the Dashboard's existing `#universal-search` section without
moving, mounting, or duplicating `ResourceSearch` in the layout.

Avoid inline styles. Preserve existing visuals unless a milestone explicitly includes
design work. A feature may gain a focused stylesheet when that prevents unrelated
global or inline styling.

## Resource Model

Resources are the common language connecting prompts, interventions, games,
worksheets, workbooks, psychoeducation, visuals, scenes, whiteboards, and other
clinical activities.

The current model validates the common Resource contract: globally unique `id`,
authoritative `type`, `title`, `description`, shared `tags`, situational fit, related
interests and goals, diagnoses, ages, settings, materials, duration, telehealth
suitability, source and research, relationship IDs, and lifecycle timestamps. Supported
types are Prompt, Prompt Deck, Intervention, Game, Worksheet, Workbook,
Psychoeducation, Activity, Visual, Scene, and Whiteboard.

All persisted Resources share one `id`-keyed table, so IDs are globally unique across
types. Repository creation and seeding reject collisions; the static Resource aggregate
applies the same check. `getResourceKey` combines type and ID for cross-resource UI keys
without changing or migrating stored IDs. Prompt Deck and Worksheet schemas extend the
base only with feature-specific presentation and document data.

`createResource` applies defaults and generates identity and timestamps. New resource
data and resource UI must use the model and `ResourceCard` rather than create parallel
shapes or duplicate the card.

Trivia exchange uses the versioned `therapy-studio-trivia` JSON envelope. Its `sets`
array contains complete Resources validated by the strict Trivia Game schema, so the
format preserves Resource and question IDs without creating a parallel representation.
The complete envelope is validated before one atomic Resource-table write. This JSON
format is the target boundary for future pasted-text, TXT, CSV, DOCX, or PDF converters;
those human-friendly converters are intentionally separate and are not implemented yet.

The vision describes some resource forms and learning fields not yet represented
exactly in the current schema. Extend the schema only through an explicit Resource
milestone; do not silently add types or fields during unrelated work.

## Shared Components

A component belongs in `src/components` or `src/shared/components` only when more than
one feature genuinely needs the same behavior or presentation. Prefer composition and
small feature-local helpers before creating a generalized system.

`ResourceCard` is already shared. It presents core information first, hides empty
optional sections, and expands source and research on demand. It composes Resource
Memory controls while persistence remains behind the repository boundary. Shared foundation components
also include the application error boundary and a neutral loading status. Component
folders expose small barrel files where that improves stable imports.

## Data and Persistence Strategy

Therapy Studio has one local Resource persistence boundary under `src/lib/data`.
`database.js` owns the lazy Dexie/IndexedDB database and version declarations;
`resourceRepository.js` owns validated reads, writes, archive state, explicit seeding,
and structured errors. UI components do not import Dexie.

Database version 1 contains the original `resources` table. Additive version 2 retains
that table and adds `categories` and `playlists`, all keyed by stable IDs. Prompt Decks
remain Resources rather than moving to a duplicate table. The Prompt Library uses its
immutable imported module until Alyson explicitly seeds it; after a successful seed,
the Prompt Authoring Toolkit reads and writes through focused repositories. It never
seeds on application startup and a later seed reports edited-record conflicts instead
of overwriting them. Zustand remains the temporary Current Session state mechanism.

Prompt authoring persistence is split among `promptDeckRepository.js`,
`categoryRepository.js`, and `playlistRepository.js`. React accesses these boundaries
through `usePromptAuthoring` and never imports Dexie. Pure import transformation remains
under `src/engines/prompts`; authoring controls remain under `src/features/prompts`.

Additive database version 3 adds `resourceMemory`, keyed by stable Resource ID, without
changing Resources, Categories, Playlists, authoring data, or icon selections.
`resourceMemoryRepository.js` owns validation, writes, structured failures, and ordered
collections. Prompt sessions mark use only when their first prompt displays; cards,
searches, Manage mode, and prompt navigation do not. Interventions use an explicit Mark
Used action. `/saved` presents Favorites, Recently Used, Most Used, and Highest Rated.

Resource Memory has an explicit presentation boundary for telehealth screen sharing.
Prompt-session and Intervention-detail pages mount only a therapist-only disclosure by
default; favorite, rating, use, and private narrative controls are not rendered until the
therapist opens it. The narrative editor conditionally mounts its private values only after
its own explicit disclosure and removes them again when closed. Changing Resources resets
the therapist-only disclosure to its safe closed state. Generic browse cards may retain
lightweight favorite, rating, and recent-use controls, but private notes and matching
narratives are not mounted while their editor is closed. Worksheet preview, print, and
session presentations do not include Resource Memory controls.

Additive database version 4 adds `sessionProfiles` for generic, non-identifying reusable
session context. `sessionProfileRepository.js` is the only persistence boundary for
profiles. A focused Zustand store keeps the active selection across route navigation;
profiles enter Current Session only through an explicit fill-empty or replace action.
Compatibility helpers are descriptive and never alter search ranking.

Additive database version 5 adds `worksheetDocuments`, keyed by the ID of a shared
Worksheet Resource. `worksheetRepository.js` owns atomic Resource-and-document creation,
validated document saves, archive/restore, and permanent deletion. Worksheet pages
consume that repository and never access Dexie directly. Builder, preview, print, and
session presentation share one document renderer.

Therapy Studio starter Worksheets are deterministic, validated Resource-and-document
pairs under `src/data/resources/worksheetStarters.js`. They remain immutable canonical
content outside IndexedDB, while `worksheetRepository.js` presents them alongside saved
therapist-created Worksheets. Preview and session routes may read a starter directly;
customization uses the repository's atomic duplication path, which assigns new Resource,
page, and block IDs before saving the editable copy. Starter Resources also join the
canonical static Resource aggregate, so Universal Search, Saved, recent use, and Resource
Memory reuse their existing type-aware behavior without a Worksheet-specific subsystem.

Manual data protection uses the same local persistence boundary. Settings exposes a
versioned JSON export with format `therapy-studio-backup` and version `1`. The backup
contains Resources, Prompt categories, Prompt playlists, Resource Memory, Session
Profiles, Worksheet documents, and imported Intervention guidance. Stored Prompt Deck copies
and categories are included because therapist edits cannot be reconstructed reliably;
private Resource Memory fields are included intentionally. Temporary Current Session
context and bundled static content are excluded.

Restore validates the complete envelope, every stored record, globally unique Resource
IDs, Worksheet Resource/document pairing, and imported Intervention Resource/guidance
pairing before opening a write transaction. A confirmed restore atomically replaces the browser-local tables. Bundled
Interventions and immutable Worksheet starters remain available because they live
outside IndexedDB; restored stored Prompt Decks preserve exact authoring changes. The
backup never leaves the browser through Therapy Studio, but the downloaded file may
contain private clinical information and must be stored securely.

Because IndexedDB is isolated by origin, manual export and restore is the supported MVP
path for moving therapist-created data from a development origin such as localhost to a
deployed Therapy Studio origin. No cloud synchronization, account, encryption, or
automatic backup service is part of this boundary.

Do not store clinical data directly from page components. Before persistent client or
session data is implemented, the relevant milestone must define privacy, data
boundaries, migrations, backup, and failure behavior. Resource Memory permits private
non-identifying resource notes, but no client, session, profile, or outcome data.
Therapy Studio must not drift into EHR behavior.

Yjs and WebSocket collaboration dependencies are installed for the eventual
two-player direction, but no collaboration architecture is currently active. That work
belongs to a dedicated milestone.

## Search Architecture

Universal Search operates across the shared Resource model and combines deterministic
text relevance with optional Current Session context. Search UI belongs in
`src/features/search`; pure indexing and scoring live under `src/engines/search`.
Recommendation logic remains deferred and belongs in `src/engines/recommendations`.

The default search source starts with the validated static Resource aggregate of
imported Prompt Decks, the initial Interventions, and immutable Worksheet starters, then asynchronously adds active,
validated Worksheet Resources and persisted Intervention Resources from their focused repositories. Worksheet documents and Intervention guidance remain
separate and are never indexed as Resources. A pure assembly helper applies type-aware
Resource keys so an accidental duplicate source entry resolves deterministically.
Worksheet loading and read failures remain isolated, allowing the static search sources
to stay usable while the page presents a quiet source-status message.

## Whiteboard Architecture

`/whiteboard` is a child-safe local workspace rather than a Resource or Game subtype.
Its strict version-1 document contains drawing strokes, plain-text objects, and visual
objects that store semantic icon IDs only. Pure document and history operations live
under `src/engines/whiteboard`; the focused repository owns the additive version-8
`whiteboardDocuments` table. The shared Icon Browser and resolver remain the only SVG
selection and loading boundary.

Whiteboard updates may synchronize between same-origin browser tabs through a focused
BroadcastChannel adapter derived from the Scene Builder collaboration pattern. This is
not remote collaboration: internet-connected sessions still require a future backend
transport. Resource Memory and other therapist-private data are not mounted inside the
Whiteboard workspace.

## Intervention Architecture

The Intervention Library is built on the canonical Resource model.
`src/data/resources/interventions.js` owns eight deterministic Intervention Resources
and separately validated session guidance keyed by the same stable Resource IDs.
`src/models/intervention.js` validates guidance without expanding the shared Resource
contract or creating a parallel Resource system. Additive database version 7 provides
`interventionGuidance`, keyed by Resource ID. `interventionRepository.js` presents the
eight bundled starters alongside therapist-imported Resource/guidance pairs and owns
transactional validation, persistence, reads, updates, and deletion. Starters remain
static and protected.

`/interventions` owns local deterministic search and restrained goal, age, duration,
and telehealth filters. `/interventions/:interventionId` presents concise session
guidance and handles unknown IDs inside the shared shell. Resource Memory remains the
only owner of favorites, ratings, therapist notes, and intentional-use history. Merely
opening a detail page does not mark use; the therapist must choose Mark Used. Universal
Search, Saved, and Dashboard recents link to the stable detail route. The Library offers
a version-1 `therapy-studio-interventions` JSON import flow that validates the complete
file before an atomic write and never overwrites starter or persisted Resource IDs.

The older Therapy Toolkit source collection is not imported directly by the browser.
Any future converter belongs at the external import boundary and must emit the same
validated Resource/guidance pairs while preserving provenance and attribution.

## Icon Strategy

Use Lucide for ordinary interface/navigation symbols where suitable. The curated
Flaticon SVG library is a preserved project asset for child-facing and activity-facing
visuals. Attribution and license files must remain intact.

The shared Icon Service under `src/services/icons` is the only Vite-specific discovery
boundary for the curated library. It exposes deterministic semantic IDs, manifest
metadata, folder counts, normalized search, lazy loading, resolution, and fallback
behavior. Feature components never import raw curated SVGs or persist asset paths.

The reusable Icon Browser under `src/features/icons` consumes that public service. It
exposes the complete curated library with folder browsing, search, and incremental
rendering, and is currently reused for Prompt Deck and Category identity. SVG assets
load only when a visible icon renderer requests them. The former limited Prompt-only
registry is retired. Do not rename, mass-format, or reorganize the raw library;
existing spacing, casing, empty directories, and legacy filenames remain preserved
asset-management concerns.

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
