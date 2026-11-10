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

/** OpenAI text-embedding-3-small (Francisco lock). */
export const CICERON_EMBEDDING_MODEL = 'text-embedding-3-small' as const
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
      audit_events: {
        Row: {
          id: string
          firm_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          payload: Record<string, unknown>
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
          created_at?: string
        }
        Update: never
      }
    }
    Functions: {
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
    }
  }
}
