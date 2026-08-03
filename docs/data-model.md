# Therapy Studio Data Model

## Local Database

The application database is named `therapy-studio`. It uses Dexie over IndexedDB. The
database is created lazily through `src/lib/data/database.js`; importing application
modules does not open or seed it.

Version 1 contains one table:

| Table       | Primary key | Secondary indexes |
| ----------- | ----------- | ----------------- |
| `resources` | `id`        | None              |

Stable Resource IDs are the IndexedDB primary keys. No secondary index is justified by
the current repository operations or collection size. Repository archive state is
stored as a boolean alongside each Resource but is not part of the shared Resource
schema and is not indexed.

Version 1 contains no profiles, sessions, outcomes, preferences, canvas data,
documents, or collaboration state.

## Resource Compatibility

The repository supports ordinary Resources through `resourceSchema` and Prompt Deck
Resources through `promptDeckSchema`. Prompt Decks retain their nested prompt order,
stable deck and prompt IDs, repaired UUIDs, `legacyId` values, legacy metadata,
attribution, and provenance.

The immutable prompt export under `imports/` remains the Prompt Library source of
truth. The library continues reading through its existing data module; database-backed
feature reads are deferred.

## Repository Boundary

`src/lib/data/resourceRepository.js` owns Resource persistence. Components do not
import Dexie. The public repository operations are:

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

Version 1 remains immutable after release. Future schema changes must add a new Dexie
version and use a transactional migration. Migrations must preserve stable Resource
IDs and validate transformed records. Tests must exercise each new version and cleanup
without touching the application database.

## Privacy Boundary

This milestone persists Resources only. It does not store Current Session context,
identifiable client information, therapist notes, profiles, outcomes, or clinical
records. Therapy Studio remains outside EHR scope.
