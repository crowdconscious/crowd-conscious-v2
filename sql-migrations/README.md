# `/sql-migrations/` — Archived migration scripts (read-only)

> **Do not add new files here.** The canonical migration folder is
> [`/supabase/migrations/`](../supabase/migrations/). The 143 scripts in
> [`./archive/`](./archive/) are kept only because some of them were
> applied to production ad-hoc (outside `supabase db push`) and we want
> a record of what shipped.

## Folder layout

```
sql-migrations/
├── README.md      ← you are here
└── archive/       ← every legacy script that ever ran against prod
```

We moved everything into `archive/` in one sweep so future developers
stop greping the repo root for migration ordering and finding answers
in the wrong place. Order inside `archive/` is **not reliable** — see
phase notes below.

## Why this exists at all

This repo grew up in three phases:

1. **Pre-Supabase-CLI** — early product. Migrations were written
   one-off and applied via the Supabase SQL editor. They landed here
   with hyphenated or descriptive names (e.g.
   `archive/00-profiles-corporate-columns-SAFE.sql`,
   `archive/wallet-system-tables.sql`,
   `archive/update-revenue-logic-platform-modules.sql`).

2. **Numbered transitional period** — once we started prefixing files
   with a 3-digit serial (`archive/042-add-share-tracking-tables.sql`,
   `archive/043-add-external-responses-table.sql`), some serials got
   reused for variants (`archive/043-fix-external-responses.sql`) and
   some scripts were applied out of order. The numbering here is **not
   reliable**.

3. **Current convention** — all new migrations live in
   `/supabase/migrations/` with a strictly increasing numeric prefix
   (currently `000_…` through `218_…`). That folder is what
   `supabase db push` reads from, and it's the only ordering you can
   trust.

## What to do when…

- **You need to write a new migration:** put it in
  `/supabase/migrations/` and give it the next free `NNN_` prefix.
- **You're investigating a column or table on prod that isn't in
  `/supabase/migrations/`:** grep `sql-migrations/archive/`. It
  probably shipped there. Treat what you find as historical evidence,
  not a runnable recipe.
- **You think a file in `archive/` is unused / obsolete:** leave it.
  We're intentionally not deleting from this folder until we've
  migrated / rationalized every script (tracked separately in
  `docs/PLATFORM-FULL-AUDIT-2026-04-16.md`).

## What lives in `/supabase/migrations/` instead

That folder holds the canonical, ordered schema timeline that
`supabase db push` and CI replay against a fresh database. If a
column or table is in production, the migration that created it
should live there — and if it doesn't, it's a gap worth fixing.
