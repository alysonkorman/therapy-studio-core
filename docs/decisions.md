# Therapy Studio Decisions

This file records decisions already approved and implemented. It does not authorize
future feature work.

## Local Resource Persistence

- Dexie and IndexedDB are the local persistence layer.
- UI components do not access Dexie directly.
- Repositories own persistence operations and validate data on every read and write.
- Imported prompt JSON remains immutable and outside IndexedDB.
- Prompt Library database-backed authoring begins only after explicit seeding.
- Seeding never runs at application startup and never overwrites edited records.
- Database version 2 additively stores Categories and Playlists; Prompt Decks stay in
  the Resource table.
- No identifiable client information, therapist notes, profiles, or outcomes are stored
  by this milestone.

## Prompt Authoring Foundation

- Prompt Items remain nested inside Prompt Deck Resources.
- Categories and playlists are separate validated persistent records.
- Ordering is explicit and transactional through `sortOrder`.
- Small inline edits use Enter to save and Escape to cancel; multiline fields use
  explicit Save and Cancel so Enter remains available for line breaks.
- Bulk add accepts one prompt per line, ignores blanks, preserves wording, order, and
  duplicates, and performs no Smart Paste parsing.
- Curated Flaticon references identify deck/category content; Lucide remains for
  controls. Stored colors must be valid six-digit hex values.
- Free-text diagnoses, goals, age ranges, and tags are preserved without taxonomy
  normalization.
- Feature completion requires a reachable, discoverable routed workflow; passing
  isolated component or repository tests is not sufficient by itself.

## Shared Icon Service

- Curated Flaticon SVGs use deterministic semantic IDs and are discovered only through
  the shared Icon Service; persisted records never store raw asset or filesystem paths.
- The reusable Icon Browser provides full-library search, folder browsing, selection,
  and incremental rendering for Prompt Decks and Categories and is the standard
  identity-icon selector for later approved resource features.
- Curated SVG assets load on demand. Lucide remains reserved for interface controls and
  fallback presentation.
- The temporary limited Prompt-only icon registry is retired.
