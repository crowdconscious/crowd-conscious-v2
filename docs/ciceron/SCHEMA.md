# Cicerón — schema map

Prompt 1 creates the foundation under schema `ciceron`. Groups below marked
**reserved** are documented only — do not create until a later prompt needs them.

## Created in Prompt 1

| Group | Tables |
|---|---|
| Tenancy | `firms`, `memberships`, `matter_members`, `demo_personas` (302 — invite actors, not `auth.users`) |
| Practice | `clients`, `matters`, `parties`, `watch_profiles` |
| Corpus | `sources`, `documents`, `document_versions`, `chunks` |
| Legal graph | `legal_entities`, `legal_edges` |
| Monitoring | `dof_notes` (+ ingest_status), `classifications`, `matches`, `alerts`, `digests`, `source_incidents` (305) |
| Court | `case_files`, `case_events`, `deadlines`, `connector_runs`, `non_working_days` |
| AI | `prompt_versions`, `ai_runs`, `ai_outputs`, `output_citations` |
| Oversight | `review_tasks`, `review_decisions`, `deliveries`, `audit_events` |
| Drafting | `drafts`, `draft_versions`, `comments`, `assignments` |
| Analytics | `events` |

Embeddings: `extensions.vector(1536)` on `chunks.embedding` and `watch_profiles.embedding`; store `embedding_model` (`text-embedding-3-small`).

Storage bucket: `ciceron` with object paths `{firm_id}/…`.

## Reserved (document review / contracts / organisational memory)

Do **not** migrate yet. Later work adds rows and screens instead of reshaping the foundation:

| Reserved table | Intended role |
|---|---|
| `document_sets` | Bundles of firm documents under review |
| `annotations` | Lawyer highlights / notes on passages |
| `extractions` | Structured fields pulled from a document |
| `clauses` | Clause library / playbook anchors |
| `obligations` | Extracted duties with owners and due dates |
| `templates` | Firm drafting templates |
| `firm_facts` | Durable organisational memory facts |
| `playbooks` | Procedural checklists per matter type |
| `interaction_summaries` | Summaries of calls / meetings (human-approved) |

When introducing a reserved table, add it in a new numbered migration under `supabase/migrations/`, extend `lib/ciceron/db/types.ts` surgically, and add RLS using the existing helpers (`firms_of_current_user`, `is_matter_member`).
