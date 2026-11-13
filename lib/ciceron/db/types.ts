/**
 * Hand-curated types for schema `ciceron` (Prompt 1).
 * Do not overwrite via wholesale `supabase gen types` — surgically extend.
 */

export type CiceronMembershipRole = 'socio' | 'asociado' | 'pasante' | 'admin'
export type CiceronDeadlineStatus = 'propuesto' | 'confirmado' | 'descartado'
export type CiceronAiOutputStatus =
  | 'borrador'
  | 'en_revision'
  | 'aprobado'
  | 'corregido'
  | 'rechazado'
  | 'entregado'
export type CiceronReviewDecision = 'approved' | 'corrected' | 'rejected' | 'returned'
export type CiceronLegalEdgeType =
  | 'creates'
  | 'amends'
  | 'repeals'
  | 'cites'
  | 'interprets'
export type CiceronLegalEntityKind = 'norm' | 'article' | 'thesis' | 'authority' | 'court'
export type CiceronDraftAuthorType = 'human' | 'model'

/**
 * Embedding model id for storage + gateway.
 * Prompt 5: Vercel AI Gateway slug `openai/text-embedding-3-small` @ 1536.
 */
export const CICERON_EMBEDDING_MODEL = 'openai/text-embedding-3-small' as const
/** Short name still accepted when reading older chunk rows. */
export const CICERON_EMBEDDING_MODEL_SHORT = 'text-embedding-3-small' as const
export const CICERON_EMBEDDING_DIMENSION = 1536 as const

export type CiceronDatabase = {
  ciceron: {
    Tables: {
      firms: {
        Row: {
          id: string
          name: string
          slug: string
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['firms']['Insert']>
      }
      memberships: {
        Row: {
          id: string
          firm_id: string
          user_id: string
          role: CiceronMembershipRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          user_id: string
          role: CiceronMembershipRole
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['memberships']['Insert']>
      }
      demo_personas: {
        Row: {
          id: string
          firm_id: string
          role: CiceronMembershipRole
          display_name: string
          invite_code: string
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          firm_id: string
          role: CiceronMembershipRole
          display_name: string
          invite_code: string
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['demo_personas']['Insert']>
      }
      invite_codes: {
        Row: {
          id: string
          code_hash: string
          pepper_version: number
          prospect_label: string
          firm_id: string
          default_persona_id: string
          expires_at: string | null
          max_uses: number | null
          use_count: number
          is_active: boolean
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code_hash: string
          pepper_version?: number
          prospect_label: string
          firm_id: string
          default_persona_id: string
          expires_at?: string | null
          max_uses?: number | null
          use_count?: number
          is_active?: boolean
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['invite_codes']['Insert']>
      }
      demo_sessions: {
        Row: {
          id: string
          invite_code_id: string
          firm_id: string
          persona_id: string
          work_email: string | null
          token_hash: string
          expires_at: string
          last_seen_at: string
          story_dismissed: boolean
          last_freshness_at: string | null
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invite_code_id: string
          firm_id: string
          persona_id: string
          work_email?: string | null
          token_hash: string
          expires_at: string
          last_seen_at?: string
          story_dismissed?: boolean
          last_freshness_at?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['demo_sessions']['Insert']>
      }
      guided_story_progress: {
        Row: {
          session_id: string
          firm_id: string
          current_step: number
          completed_steps: number[]
          dismissed: boolean
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          session_id: string
          firm_id: string
          current_step?: number
          completed_steps?: number[]
          dismissed?: boolean
          completed_at?: string | null
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['guided_story_progress']['Insert']>
      }
      client_conflicts: {
        Row: {
          id: string
          firm_id: string
          client_id: string
          blocked_client_id: string
          reason: string
          is_active: boolean
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          client_id: string
          blocked_client_id: string
          reason: string
          is_active?: boolean
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['client_conflicts']['Insert']>
      }
      access_grants: {
        Row: {
          id: string
          firm_id: string
          user_id: string
          resource_type: string
          resource_id: string | null
          permission: string
          expires_at: string | null
          granted_by: string | null
          reason: string | null
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          user_id: string
          resource_type: string
          resource_id?: string | null
          permission: string
          expires_at?: string | null
          granted_by?: string | null
          reason?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['access_grants']['Insert']>
      }
      sales_invite_progress: {
        Row: {
          invite_code_id: string
          prospect_label: string
          firm_id: string
          firm_name: string
          use_count: number
          max_uses: number | null
          expires_at: string | null
          is_active: boolean
          sessions_opened: number
          rooms_opened_approx: number
          max_story_steps_completed: number
          stories_finished: number
          last_seen_at: string | null
        }
        Insert: never
        Update: never
      }
      clients: {
        Row: {
          id: string
          firm_id: string
          display_name: string
          external_ref: string | null
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          display_name: string
          external_ref?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['clients']['Insert']>
      }
      matters: {
        Row: {
          id: string
          firm_id: string
          client_id: string
          title: string
          matter_ref: string | null
          status: 'activo' | 'cerrado' | 'archivado'
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          client_id: string
          title: string
          matter_ref?: string | null
          status?: 'activo' | 'cerrado' | 'archivado'
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['matters']['Insert']>
      }
      chunks: {
        Row: {
          id: string
          version_id: string
          text: string
          embedding: number[] | null
          embedding_model: string | null
          position: number
          canonical_citation_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          version_id: string
          text: string
          embedding?: number[] | null
          embedding_model?: string | null
          position: number
          canonical_citation_id?: string | null
          created_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['chunks']['Insert']>
      }
      ai_runs: {
        Row: {
          id: string
          purpose: string
          model: string
          prompt_version_id: string | null
          input_tokens: number | null
          output_tokens: number | null
          cost_estimate_usd: number | null
          latency_ms: number | null
          retrieved_chunk_ids: string[]
          firm_id: string | null
          matter_id: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          purpose: string
          model: string
          prompt_version_id?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          cost_estimate_usd?: number | null
          latency_ms?: number | null
          retrieved_chunk_ids?: string[]
          firm_id?: string | null
          matter_id?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['ai_runs']['Insert']>
      }
      dof_notes: {
        Row: {
          id: string
          note_code: string
          note_date: string
          edition: string | null
          edition_kind: 'matutina' | 'vespertina' | 'extraordinaria' | null
          section: string | null
          authority: string | null
          title: string | null
          document_id: string | null
          ingest_status:
            | 'listed'
            | 'fetched'
            | 'normalised'
            | 'chunked'
            | 'embedding_pending'
            | 'ready'
            | 'failed'
            | 'skipped'
          content_hash: string | null
          raw_storage_path: string | null
          last_error: string | null
          ready_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<CiceronDatabase['ciceron']['Tables']['dof_notes']['Row']> & {
          note_code: string
          note_date: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['dof_notes']['Row']>
      }
      source_incidents: {
        Row: {
          id: string
          source_key: string
          incident_date: string
          kind: 'zero_notes' | 'consecutive_failures' | 'other'
          severity: 'info' | 'warning' | 'critical'
          message: string
          details: Record<string, unknown>
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_key: string
          incident_date: string
          kind: 'zero_notes' | 'consecutive_failures' | 'other'
          severity?: 'info' | 'warning' | 'critical'
          message: string
          details?: Record<string, unknown>
          resolved_at?: string | null
          created_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['source_incidents']['Insert']>
      }
      research_queries: {
        Row: {
          id: string
          firm_id: string
          matter_id: string | null
          user_id: string | null
          question: string
          ai_output_id: string | null
          ai_run_id: string | null
          retrieved_chunk_ids: string[]
          coverage_note: string | null
          degraded: boolean
          feedback: 'useful' | 'incorrect' | 'incomplete' | null
          feedback_comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          matter_id?: string | null
          user_id?: string | null
          question: string
          ai_output_id?: string | null
          ai_run_id?: string | null
          retrieved_chunk_ids?: string[]
          coverage_note?: string | null
          degraded?: boolean
          feedback?: 'useful' | 'incorrect' | 'incomplete' | null
          feedback_comment?: string | null
          created_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['research_queries']['Insert']>
      }
      firm_ai_budgets: {
        Row: {
          firm_id: string
          monthly_budget_usd: number
          threshold_alert_50_at: string | null
          threshold_alert_80_at: string | null
          threshold_alert_100_at: string | null
          updated_at: string
        }
        Insert: {
          firm_id: string
          monthly_budget_usd?: number
          threshold_alert_50_at?: string | null
          threshold_alert_80_at?: string | null
          threshold_alert_100_at?: string | null
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['firm_ai_budgets']['Insert']>
      }
      firm_onboarding: {
        Row: {
          firm_id: string
          described_client: boolean
          saw_matched_alert: boolean
          sent_alert_through_review: boolean
          completed_at: string | null
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          firm_id: string
          described_client?: boolean
          saw_matched_alert?: boolean
          sent_alert_through_review?: boolean
          completed_at?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['firm_onboarding']['Insert']>
      }
      briefing_previews: {
        Row: {
          id: string
          firm_id: string
          user_id: string
          preview_date: string
          kind: 'morning' | 'weekly_socio'
          line_count: number
          empty_state: boolean
          reviewed_count: number
          payload: Record<string, unknown>
          email_simulated: boolean
          is_demo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          user_id: string
          preview_date: string
          kind: 'morning' | 'weekly_socio'
          line_count?: number
          empty_state?: boolean
          reviewed_count?: number
          payload?: Record<string, unknown>
          email_simulated?: boolean
          is_demo?: boolean
          created_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['briefing_previews']['Insert']>
      }
      engagement_resume: {
        Row: {
          firm_id: string
          user_id: string
          room: string
          href: string
          label: string
          entity_type: string | null
          entity_id: string | null
          updated_at: string
        }
        Insert: {
          firm_id: string
          user_id: string
          room: string
          href: string
          label: string
          entity_type?: string | null
          entity_id?: string | null
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['engagement_resume']['Insert']>
      }
      audit_events: {
        Row: {
          id: string
          firm_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          payload: Record<string, unknown>
          outcome: 'allowed' | 'denied'
          policy_id: string | null
          policy_reason: string | null
          snapshot_ref: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          payload?: Record<string, unknown>
          outcome?: 'allowed' | 'denied'
          policy_id?: string | null
          policy_reason?: string | null
          snapshot_ref?: Record<string, unknown>
          created_at?: string
        }
        Update: never
      }
      firm_settings: {
        Row: {
          firm_id: string
          four_eyes_output_types: string[]
          email_allowlist: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          firm_id: string
          four_eyes_output_types?: string[]
          email_allowlist?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['firm_settings']['Insert']>
      }
      evaluation_candidates: {
        Row: {
          id: string
          firm_id: string
          matter_id: string
          review_decision_id: string
          ai_run_id: string | null
          ai_output_id: string | null
          model_output: string
          human_output: string | null
          reason: string | null
          decision: 'corrected' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          matter_id: string
          review_decision_id: string
          ai_run_id?: string | null
          ai_output_id?: string | null
          model_output: string
          human_output?: string | null
          reason?: string | null
          decision: 'corrected' | 'rejected'
          created_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['evaluation_candidates']['Insert']>
      }
      review_tasks: {
        Row: {
          id: string
          matter_id: string
          ai_output_id: string | null
          assignee_id: string | null
          assignee_persona: string | null
          status: 'pendiente' | 'en_curso' | 'cerrado'
          due_at: string | null
          title: string | null
          output_type: string | null
          draft_id: string | null
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          matter_id: string
          ai_output_id?: string | null
          assignee_id?: string | null
          assignee_persona?: string | null
          status?: 'pendiente' | 'en_curso' | 'cerrado'
          due_at?: string | null
          title?: string | null
          output_type?: string | null
          draft_id?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['review_tasks']['Insert']>
      }
      bulletin_sources: {
        Row: {
          id: string
          source_key: string
          state_code: string
          state_name: string
          display_name: string
          landing_url: string
          branch_or_subject: string | null
          publication_form: string | null
          file_format: string | null
          proposed_tier: 'A' | 'B' | 'C' | 'D' | 'E' | 'not_verified'
          needs_login: boolean
          has_captcha: boolean
          robots_ok: boolean
          terms_ok: boolean
          terms_of_use_url: string | null
          proposed_match_key: string | null
          difficulty_note: string | null
          verified_by: string | null
          verified_on: string | null
          terms_reviewed_on: string | null
          counsel_reviewed_on: string | null
          enabled: boolean
          adapter_key: string | null
          retention_days: number
          is_demo: boolean
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_key: string
          state_code: string
          state_name: string
          display_name: string
          landing_url: string
          branch_or_subject?: string | null
          publication_form?: string | null
          file_format?: string | null
          proposed_tier: 'A' | 'B' | 'C' | 'D' | 'E' | 'not_verified'
          needs_login?: boolean
          has_captcha?: boolean
          robots_ok?: boolean
          terms_ok?: boolean
          terms_of_use_url?: string | null
          proposed_match_key?: string | null
          difficulty_note?: string | null
          verified_by?: string | null
          verified_on?: string | null
          terms_reviewed_on?: string | null
          counsel_reviewed_on?: string | null
          enabled?: boolean
          adapter_key?: string | null
          retention_days?: number
          is_demo?: boolean
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['bulletin_sources']['Insert']>
      }
      bulletin_matter_catalogue: {
        Row: {
          id: string
          firm_id: string
          matter_id: string | null
          case_file_id: string | null
          state_code: string
          state_name: string
          court_name: string
          expediente_number: string
          party_name_variants: string[]
          is_active: boolean
          is_demo: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          matter_id?: string | null
          case_file_id?: string | null
          state_code: string
          state_name: string
          court_name: string
          expediente_number: string
          party_name_variants?: string[]
          is_active?: boolean
          is_demo?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<
          CiceronDatabase['ciceron']['Tables']['bulletin_matter_catalogue']['Insert']
        >
      }
      bulletin_runs: {
        Row: {
          id: string
          firm_id: string
          source_id: string
          publication_date: string
          bulletin_number: string | null
          status: 'ok' | 'failed' | 'partial' | 'manual'
          failure_stage:
            | 'fetch'
            | 'parse'
            | 'count_check'
            | 'terms'
            | 'disabled'
            | 'manual_required'
            | null
          failure_message: string | null
          entries_parsed: number
          matters_searched: number
          hits_exact: number
          hits_possible: number
          duration_ms: number | null
          parser_version: string
          source_url: string | null
          is_demo: boolean
          metadata: Record<string, unknown>
          started_at: string
          finished_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          source_id: string
          publication_date: string
          bulletin_number?: string | null
          status: 'ok' | 'failed' | 'partial' | 'manual'
          failure_stage?:
            | 'fetch'
            | 'parse'
            | 'count_check'
            | 'terms'
            | 'disabled'
            | 'manual_required'
            | null
          failure_message?: string | null
          entries_parsed?: number
          matters_searched?: number
          hits_exact?: number
          hits_possible?: number
          duration_ms?: number | null
          parser_version?: string
          source_url?: string | null
          is_demo?: boolean
          metadata?: Record<string, unknown>
          started_at?: string
          finished_at?: string | null
          created_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['bulletin_runs']['Insert']>
      }
      bulletin_entries: {
        Row: {
          id: string
          firm_id: string
          run_id: string
          source_id: string
          publication_date: string
          court_name: string | null
          expediente_number: string | null
          party_names: string | null
          summary: string | null
          source_url: string | null
          raw_excerpt: string | null
          retain_until: string
          is_demo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          run_id: string
          source_id: string
          publication_date: string
          court_name?: string | null
          expediente_number?: string | null
          party_names?: string | null
          summary?: string | null
          source_url?: string | null
          raw_excerpt?: string | null
          retain_until: string
          is_demo?: boolean
          created_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['bulletin_entries']['Insert']>
      }
      bulletin_hits: {
        Row: {
          id: string
          firm_id: string
          run_id: string
          entry_id: string
          catalogue_id: string | null
          matter_id: string | null
          case_file_id: string | null
          match_kind: 'exact' | 'possible'
          score: number
          reason: string
          review_state: 'pendiente' | 'en_revision' | 'confirmado' | 'descartado'
          review_task_id: string | null
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          run_id: string
          entry_id: string
          catalogue_id?: string | null
          matter_id?: string | null
          case_file_id?: string | null
          match_kind: 'exact' | 'possible'
          score?: number
          reason: string
          review_state?: 'pendiente' | 'en_revision' | 'confirmado' | 'descartado'
          review_task_id?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['bulletin_hits']['Insert']>
      }
      bulletin_manual_checks: {
        Row: {
          id: string
          firm_id: string
          source_id: string
          run_id: string | null
          check_date: string
          status: 'pendiente' | 'asignado' | 'hecho' | 'omitido'
          source_url: string
          assigned_to: string | null
          assigned_by: string | null
          completed_by: string | null
          notes: string | null
          completed_at: string | null
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          source_id: string
          run_id?: string | null
          check_date: string
          status?: 'pendiente' | 'asignado' | 'hecho' | 'omitido'
          source_url: string
          assigned_to?: string | null
          assigned_by?: string | null
          completed_by?: string | null
          notes?: string | null
          completed_at?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<
          CiceronDatabase['ciceron']['Tables']['bulletin_manual_checks']['Insert']
        >
      }
    }
    Functions: {
      decide_review: {
        Args: {
          p_actor: string
          p_task_id: string
          p_decision: string
          p_notes?: string | null
          p_edited_body?: string | null
        }
        Returns: Record<string, unknown>
      }
      save_review_edit: {
        Args: {
          p_actor: string
          p_task_id: string
          p_edited_body: string
        }
        Returns: string
      }
      reassign_review: {
        Args: {
          p_actor: string
          p_task_id: string
          p_new_assignee: string
        }
        Returns: undefined
      }
      create_delivery: {
        Args: {
          p_actor: string
          p_ai_output_id: string
          p_matter_id: string
          p_channel: string
          p_recipient: string
          p_subject: string
          p_body: string
          p_confirm?: boolean
        }
        Returns: Record<string, unknown>
      }
      search_chunks: {
        Args: {
          query_text: string | null
          query_embedding: number[] | null
          p_firm_id: string
          p_matter_id?: string | null
          p_limit?: number
        }
        Returns: {
          chunk_id: string
          document_id: string
          chunk_text: string
          fused_score: number
          fts_rank: number
          vector_distance: number | null
        }[]
      }
      search_chunks_as_actor: {
        Args: {
          p_actor: string
          query_text: string | null
          query_embedding: number[] | null
          p_firm_id: string
          p_matter_id?: string | null
          p_limit?: number
        }
        Returns: {
          chunk_id: string
          document_id: string
          chunk_text: string
          fused_score: number
          fts_rank: number
          vector_distance: number | null
        }[]
      }
      record_bulletin_run: {
        Args: {
          p_firm_id: string
          p_source_id: string
          p_publication_date: string
          p_status: string
          p_bulletin_number?: string | null
          p_failure_stage?: string | null
          p_failure_message?: string | null
          p_entries_parsed?: number
          p_matters_searched?: number
          p_hits_exact?: number
          p_hits_possible?: number
          p_duration_ms?: number | null
          p_parser_version?: string
          p_source_url?: string | null
          p_is_demo?: boolean
          p_metadata?: Record<string, unknown>
          p_started_at?: string
          p_run_id?: string | null
        }
        Returns: string
      }
      record_bulletin_hit: {
        Args: {
          p_firm_id: string
          p_run_id: string
          p_source_id: string
          p_publication_date: string
          p_match_kind: string
          p_score: number
          p_reason: string
          p_court_name?: string | null
          p_expediente_number?: string | null
          p_party_names?: string | null
          p_summary?: string | null
          p_source_url?: string | null
          p_raw_excerpt?: string | null
          p_catalogue_id?: string | null
          p_matter_id?: string | null
          p_case_file_id?: string | null
          p_retention_days?: number
          p_is_demo?: boolean
        }
        Returns: string
      }
      ensure_bulletin_manual_check: {
        Args: {
          p_firm_id: string
          p_source_id: string
          p_check_date: string
          p_source_url: string
          p_run_id?: string | null
          p_is_demo?: boolean
        }
        Returns: string
      }
      assign_bulletin_manual_check: {
        Args: {
          p_firm_id: string
          p_check_id: string
          p_actor: string
          p_assignee: string
        }
        Returns: Record<string, unknown>
      }
      complete_bulletin_manual_check: {
        Args: {
          p_firm_id: string
          p_check_id: string
          p_actor: string
          p_notes?: string | null
        }
        Returns: Record<string, unknown>
      }
    }
  }
}
