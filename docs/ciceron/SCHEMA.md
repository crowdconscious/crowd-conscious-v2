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
| Expedientes / M365 sim (308–309) | `deadline_rules`, `deadline_reminders`, `saved_views`, `firm_integrations`, `firm_archive_items`, `simulated_calendar_events`, `client_notify_drafts` (+ columns on `deadlines` / `case_events`) |
| AI | `prompt_versions`, `ai_runs`, `ai_outputs`, `output_citations` |
| Oversight | `review_tasks`, `review_decisions`, `deliveries`, `audit_events` |
| Drafting | `drafts`, `draft_versions`, `comments`, `assignments` |
| Analytics | `events` |
| Prompt 7 | `firm_settings`, `evaluation_candidates`, `in_app_notifications`; audit columns `outcome` / `policy_id` / `policy_reason` / `snapshot_ref` |
| Prompt 8 | `firm_onboarding`, `briefing_previews`, `engagement_resume`; `firm_ai_budgets.threshold_alert_*`; views `metric_*`; RPC `record_product_event`; `316` events RPC-only writes |
| Prompt 9 | `invite_codes` (hashed), `demo_sessions`, `guided_story_progress`, `client_conflicts`, `access_grants`, `demo_freshness_runs`; `documents.sensitivity_level` / `matter_id` / `is_demo`; view `sales_invite_progress`; RPCs `redeem_invite`, `evaluate_access`, `refresh_demo_dates`, `reset_demo_firm`; `320` hardening (`set_actor` service_role-only; `firm_onboarding` split policies) |

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
