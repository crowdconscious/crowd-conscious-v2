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
export type CiceronLegalEdgeType = 'amends' | 'repeals' | 'cites' | 'interprets'
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
          updated_at: string
        }
        Insert: {
          firm_id: string
          monthly_budget_usd?: number
          updated_at?: string
        }
        Update: Partial<CiceronDatabase['ciceron']['Tables']['firm_ai_budgets']['Insert']>
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
        Returns: string
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
        Returns: string
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
    }
  }
}
