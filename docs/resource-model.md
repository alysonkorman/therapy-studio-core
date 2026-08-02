# Resource Model

The Resource model is the shared domain foundation for clinically useful content in
Therapy Studio. Resource-driven features must use this model rather than define
parallel shapes.

## Current Implementation

The implementation lives in `src/models/resource.js` and is exported through
`src/models/index.js`. It uses Zod for runtime validation and `nanoid` for IDs.
`createResource(input)` supplies generated and default values, then validates the
result with `resourceSchema`.

Current resource types are:

- `prompt`
- `prompt-deck`
- `intervention`
- `game`
- `worksheet`
- `workbook`
- `psychoeducation`
- `visual`
- `scene`
- `whiteboard`

Changing this enum is Resource architecture work and requires an explicit milestone.

## Imported Prompt Decks

A prompt deck is a Resource with type `prompt-deck`. The imported Therapy Toolkit JSON
remains the neutral source artifact under `imports/`; application code accesses it
through `src/data/resources/promptDecks.js`. That module delegates validation and
deterministic transformation to `src/engines/prompts/importPromptDecks.js`. Pages must
not read or transform the raw JSON directly.

`promptDeckSchema` extends `resourceSchema` with:

- `category`
- `tags`
- `prompts`
- `legacyMetadata`

The deck's imported `goals`, `diagnoses`, and `ageRanges` map directly to the shared
Resource fields. Imported category and taxonomy strings are preserved exactly. A
nullable description or source becomes the Resource default empty string. Imported
decks do not use `createResource`, because that factory generates new identity and
timestamps. Instead, their stable IDs are converted to strings and the export
timestamp supplies deterministic lifecycle timestamps.

Deck `legacyMetadata` preserves the original typed ID, color, icon ID, archived state,
attribution, and export provenance. These fields remain available without making
legacy presentation details part of the shared Resource contract.

### Nested prompt items

Individual prompts are lightweight nested records, not independent Resources.
`promptItemSchema` includes:

- required string `id` and required non-empty `text`;
- `type`, `category`, nullable `subcategory`, and nullable `depth`;
- `tags`, `ageRanges`, `goals`, `diagnoses`, and `settings`;
- optional `legacyId` for repaired prompt-ID collisions;
- normalized `source`; and
- `legacyMetadata` containing the original typed ID, artwork, attribution, and export
  provenance.

At the model boundary, numeric and string imported IDs become `String(importedId)`.
The original typed value remains in `legacyMetadata.originalId`. Repaired UUID IDs are
already strings and are preserved exactly; their `legacyId` remains unchanged. The
importer rejects duplicate deck IDs after conversion, duplicate prompt IDs within a
deck after conversion, empty prompt text, unsupported export versions, mismatched
declared counts, and all other Zod validation failures. It does not remove duplicate
prompt text or normalize taxonomy values.

Persistence, editing, favorites, ratings, usage history, search, and collaboration for
prompt decks remain deferred.

## Fields

### Identity and classification

- `id`
- `type`
- `title`
- `description`

### Clinical fit and retrieval metadata

- `worksWellWhen`
- `useWith`
- `kidsWhoLike`
- `goals`
- `diagnoses`
- `ageRanges`
- `settings`
- `materials`
- `durationMinutes`
- `telehealthFriendly`

### Sources and therapist knowledge

- `source`
- `research`
- `myNotes`
- `rating`
- `favorite`
- `relatedResourceIds`

### Usage and lifecycle

- `usageCount`
- `lastUsedAt`
- `createdAt`
- `updatedAt`

The factory generates `id`, `createdAt`, and `updatedAt`. New resources begin with no
usage history. Optional arrays and strings receive empty defaults; duration, rating,
and last-used time may be `null`.

## Presentation

`src/components/ResourceCard` is the established shared presentation. It displays core
information immediately, omits empty optional sections, and reveals source, supporting
research, Alyson's notes, and usage count through its advanced control.

Persistence does not belong in the model or card. Favorites, ratings, usage history,
related-resource resolution, and therapist memory remain non-persistent until a
dedicated milestone establishes the repository layer.

## Testing Contract

Model tests verify valid creation, generated identity and timestamps, defaults,
preservation of supplied metadata, and rejection of invalid required data. Component
tests verify visible information, conditional sections, advanced disclosure, and
unrated resources.

The broader vision mentions additional resource forms and learning fields that do not
map exactly to the current schema. Those differences are recorded in the master-plan
Parking Lot and must not be resolved incidentally.
