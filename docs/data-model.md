# Therapy Studio Data Model

## Local Database

The application database is named `therapy-studio`. It uses Dexie over IndexedDB. The
database is created lazily through `src/lib/data/database.js`; importing application
modules does not open or seed it.

Version 1 introduced one table. Additive version 9 has this current schema:

| Table                  | Primary key   | Secondary indexes                              |
| ---------------------- | ------------- | ---------------------------------------------- |
| `resources`            | `id`          | None                                           |
| `categories`           | `id`          | None                                           |
| `playlists`            | `id`          | None                                           |
| `resourceMemory`       | `resourceId`  | `favorite`, `rating`, `lastUsedAt`, `useCount` |
| `sessionProfiles`      | `id`          | `archived`, `updatedAt`, `lastOpenedAt`        |
| `worksheetDocuments`   | `worksheetId` | None                                           |
| `sceneDocuments`       | `id`          | `updatedAt`                                    |
| `interventionGuidance` | `resourceId`  | None                                           |
| `whiteboardDocuments`  | `id`          | `updatedAt`                                    |
| `localMediaAssets`     | `id`          | `createdAt`                                    |

Stable Resource IDs are the IndexedDB primary keys. No secondary index is justified by
the current repository operations or collection size. Repository archive state is
stored as a boolean alongside each Resource but is not part of the shared Resource
schema and is not indexed.

Version 4 adds non-identifying Session Profiles without storing Current Session state,
Resource history, outcomes, documents, or collaboration data. Resource Memory remains
separate from both source Resources and profiles.

Version 5 adds versioned Worksheet Documents. A document is keyed by its Worksheet
Resource ID and contains ordered pages, page settings, and ordered validated blocks.
Creation and save operations update Resource and document records transactionally.
Authored text is plain text and rejects HTML.

Version 7 adds Intervention guidance keyed by the matching Intervention Resource ID.
Bundled starters remain immutable outside the database. Therapist imports store each
Resource and guidance record together in one transaction.

Version 8 adds independently validated Whiteboard documents keyed by stable document
ID. Whiteboards are local tools rather than Game Resources. Their drawings, text, and
semantic icon references are also included in Therapy Studio backup and restore.

Version 9 adds reusable local media assets for imported activity images and rendered
PDF pages. Binary bytes remain in IndexedDB, while Whiteboard image objects store only
the stable asset ID, dimensions, placement, lock state, and an accessibility label.
Backup and restore encode those bytes only inside the downloaded backup file.

## Session Profiles

`sessionProfileRepository.js` owns validated profile creation, reading, editing,
duplication, archive/restore, permanent deletion, opened timestamps, and local search.
Profiles contain generic reusable matching context only. They exclude legal names,
contact details, dates of birth, clinical documentation, billing, medications, and
person-linked histories. Recently opened ordering uses `lastOpenedAt`, then `updatedAt`,
then stable ID.

## Resource Compatibility

The repository supports ordinary Resources through `resourceSchema` and Prompt Deck
Resources through `promptDeckSchema`. Prompt Decks retain their nested prompt order,
stable deck and prompt IDs, repaired UUIDs, `legacyId` values, legacy metadata,
attribution, and provenance.

Prompt Library authoring reads and writes Prompt Deck Resources in the database. There
is no bundled Prompt starter library or automatic Prompt Library seeding path.

Categories store `id`, `name`, validated six-digit `color`, `iconId`, `sortOrder`,
`archived`, `createdAt`, and `updatedAt`. Playlists store the same lifecycle/order
fields plus title, description, and ordered references to Prompt Decks or nested Prompt
Items. Reference writes validate the target before committing.

Deck, prompt, category, and playlist order is stored as a non-negative integer
`sortOrder`; repository reorder operations require every unique known ID and write in
one transaction.

## Repository Boundary

`src/lib/data/resourceRepository.js` owns general Resource persistence. Focused Prompt
Deck, Category, and Playlist repositories own authoring operations. Components do not
import Dexie. The general public operations are:

- `getAllResources(options?)`
- `getResourceById(id)`
- `createResourceRecord(resource)`
- `updateResourceRecord(id, changes)`
- `archiveResource(id)`
- `restoreResource(id)`
- `deleteResourcePermanently(id)`
- `seedResources(resources)`
- `clearResourceDatabaseForTests()`

Reads return archive state with the validated Resource. `getAllResources()` excludes
archived records by default; `{ includeArchived: true }` includes them. Results are
ordered deterministically by stable ID.

`interventionRepository.js` is the paired persistence boundary for imported
Interventions. It combines persisted records with the eight static starters and owns
transactional import, create, read, update, and permanent deletion. A future source
converter may emit the versioned import envelope, but it must remain outside this
repository and may not bypass validation.

## Validation and Errors

Every write and stored read is validated with the existing Zod schemas. Updates cannot
replace IDs, creation timestamps, update timestamps, or repository archive state.
Successful updates preserve `createdAt` and generate a new `updatedAt`. Unknown fields,
malformed stored records, and invalid updates are not silently discarded.

Repository failures use `ResourceRepositoryError` with stable codes:

- `invalid-resource`
- `duplicate-resource`
- `resource-not-found`
- `invalid-update`
- `malformed-stored-record`
- `database-unavailable`
- `database-open-failed`
- `transaction-failed`
- `write-failed`
- `seed-failed`

Errors retain their underlying cause when one exists and surface to callers.

`resourceMemoryRepository.js` separately owns favorites, ratings, meaningful usage,
private notes, Works Well When, Kids Who Usually Like This, and adaptations. It
validates reads and writes, verifies Resource IDs, returns unwritten defaults lazily,
and exposes deterministically ordered memory collections.

## Archive and Deletion

Archive and restore preserve Resource content. Archived Resources are hidden from the
default collection read. Permanent deletion is a separate repository-only operation
and reports an unknown ID rather than silently succeeding.

## Explicit Seeding and Transactions

`seedResources()` is never called automatically. It validates the complete collection
before opening its write transaction, rejects duplicate input IDs, and writes the
collection in one transaction. Identical stored records are treated as unchanged;
conflicting content produces `seed-failed`. A failed batch rolls back without leaving a
partial seed.

## Test Isolation

Database tests explicitly inject `fake-indexeddb` dependencies into Dexie. Each test
uses a unique `therapy-studio-test-*` database name and deletes it afterward. The
repository refuses its test-clear operation for a non-test database name.

## Migration Principles

Released versions remain immutable. Version 2 preserves version-1 Resources while
adding Category and Playlist tables. Version 3 preserves all earlier data and adds
Resource Memory. Future schema changes must add a new Dexie
version and use a transactional migration. Migrations must preserve stable Resource
IDs and validate transformed records. Tests must exercise each new version and cleanup
without touching the application database.

## Privacy Boundary

Resource Memory is local therapist-facing data. It must not contain client identifiers,
session narratives, psychotherapy or progress notes, risk information, treatment
plans, billing, contact details, or person-linked diagnoses. Profiles, outcomes,
recommendations, remote services, and ranking boosts remain deferred.
