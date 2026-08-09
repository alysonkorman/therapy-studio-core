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
- `activity`
- `visual`
- `scene`
- `whiteboard`

Changing this enum is Resource architecture work and requires an explicit milestone.

Resource IDs are globally unique across types because all Resources share the same
`id`-keyed repository table. Repository creation and seeds reject collisions, and the
static aggregate performs the same check. `getResourceKey(resource)` produces a
type-aware UI key such as `prompt-deck:123` without changing persisted IDs or Resource
Memory records.

## Imported Prompt Decks

A prompt deck is a Resource with type `prompt-deck`. The imported Therapy Toolkit JSON
remains the neutral source artifact under `imports/`; application code accesses it
through `src/data/resources/promptDecks.js`. That module delegates validation and
deterministic transformation to `src/engines/prompts/importPromptDecks.js`. Pages must
not read or transform the raw JSON directly.

`promptDeckSchema` inherits shared tags and extends `resourceSchema` with:

- `category`
- nullable `categoryId`
- validated `color` and safe `iconId`
- non-negative `sortOrder`
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
- non-negative `sortOrder`;
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

Imported items retain their stable IDs. New user-authored decks and prompts receive an
ID once at repository creation; updates preserve identity and `createdAt` while changing
`updatedAt` on the deck. Prompt text, clinical matching arrays, source, and imported
legacy metadata are validated before every write. Favorites, ratings, and usage are
stored separately as Resource Memory. Collaboration remains deferred.

## Worksheet Resources

An original Worksheet is a shared Resource with `type: "worksheet"`, validated by
`worksheetSchema`. It retains common identity, clinical matching, source, lifecycle,
and Resource Memory behavior, with Worksheet presentation metadata for category,
six-digit color, icon ID, attribution, and provenance. Tags remain part of the shared
Resource contract.

Editable page content is not embedded in the Resource. A separate strict, versioned
`worksheetDocumentSchema` stores pages and blocks under the same stable Worksheet ID.
This keeps Resource concerns reusable while allowing the Builder document format to
evolve through explicit versions. See `docs/worksheet-builder.md`.

## Therapist Resource Memory

`resourceMemorySchema` is a strict record keyed by `resourceId`. Defaults are
`favorite: false`, `rating: null`, `useCount: 0`, `lastUsedAt: null`, empty private
notes, and empty `worksWellWhen`, `kidsWhoUsuallyLikeThis`, and `adaptations` arrays.
Identity includes stable ISO `createdAt` and `updatedAt` values.

Ratings accept only integers 1–5 or null; use counts cannot be negative. Plain text
rejects HTML. List values trim blanks and remove case-insensitive duplicates while
preserving the first retained wording. Memory never mutates imported source,
attribution, evidence, provenance, or nested prompts. Profiles, outcomes,
recommendations, and ranking boosts remain deferred.

## Prompt Authoring Records

`promptCategorySchema` validates persistent category identity, name, six-digit color,
icon reference, order, archive state, and lifecycle timestamps. Category names are
unique without case sensitivity; taxonomy values are otherwise not normalized.

`promptPlaylistSchema` validates title, description, order/archive/lifecycle fields,
and ordered `prompt-deck` or `prompt-item` references. Prompt Item references include
both their owning deck ID and prompt ID. Repositories reject broken references.

Inline single-line fields save with Enter and cancel with Escape. Multiline deck
descriptions and prompt text use explicit Save/Cancel controls. Failed saves retain the
draft. Basic bulk add treats each nonblank line as one prompt, keeps duplicate wording,
and does not interpret headings or metadata. Smart Paste remains deferred.

## Fields

### Identity and classification

- `id`
- `type`
- `title`
- `description`
- `tags`

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
and therapist notes are owned by the separate Resource Memory repository. The older
similarly named fields retained in the base Resource shape are compatibility fields;
new shared behavior must not create a second favorites or memory state. Relationship
resolution remains deferred.

## Testing Contract

Model tests verify valid creation, generated identity and timestamps, defaults,
preservation of supplied metadata, and rejection of invalid required data. Component
tests verify visible information, conditional sections, advanced disclosure, and
unrated resources.

The broader vision mentions additional resource forms and learning fields that do not
map exactly to the current schema. Those differences are recorded in the master-plan
Parking Lot and must not be resolved incidentally.
