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
- `intervention`
- `game`
- `worksheet`
- `workbook`
- `psychoeducation`
- `visual`
- `scene`
- `whiteboard`

Changing this enum is Resource architecture work and requires an explicit milestone.

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
