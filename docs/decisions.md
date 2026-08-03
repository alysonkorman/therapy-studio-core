# Therapy Studio Decisions

This file records decisions already approved and implemented. It does not authorize
future feature work.

## Local Resource Persistence

- Dexie and IndexedDB are the local persistence layer.
- UI components do not access Dexie directly.
- Repositories own persistence operations and validate data on every read and write.
- Imported prompt JSON remains immutable and outside IndexedDB.
- Prompt Library database-backed reads are deferred.
- Automatic application-startup seeding is deferred; seeding is explicit.
- Database version 1 stores Resources only.
- No identifiable client information, therapist notes, profiles, or outcomes are stored
  by this milestone.
