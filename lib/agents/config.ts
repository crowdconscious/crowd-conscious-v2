import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// --- Model Selection ---
// Haiku 4.5: Fast, cheap ($1/$5 per MTok) — use for data digestion, summarization, ranking
// Sonnet 4.5: Balanced, creative ($3/$15 per MTok) — use for content creation, social media copy
// Verified via /api/test-anthropic: claude-haiku-4-5-20251001 works. Claude 3.5 models return 404.
export const MODELS = {
  FAST: 'claude-haiku-4-5-20251001',     // Verified working
  CREATIVE: 'claude-sonnet-4-5-20250929', // Sonnet 4.5 (same family as Haiku 4.5)
} as const;

// --- Token Limits ---
// These cap how much Claude can write back. Output tokens are 5x more expensive than input.
// 1024 tokens ≈ 750 words. More than enough for a digest or a few social posts.
export const TOKEN_LIMITS = {
  DIGEST: 1024,        // CEO digest, inbox curator
  NEWS: 1024,          // News monitor summaries
  SOCIAL_CONTENT: 4096, // Social media posts + image prompts, carousel ideas, memes
} as const;

// --- Clients ---
export function getAnthropicClient(): Anthropic {
  console.log('[AGENT] ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
  console.log('[AGENT] Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 10) ?? 'N/A');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to Vercel environment variables.');
  }
  return new Anthropic({ apiKey });
}

export function getSupabaseAdmin() {
  console.log('[AGENT] SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, key);
}

// --- Logging ---
// Call this at the end of every agent run to track costs and errors
export async function logAgentRun(params: {
  agentName: string;
  status: 'success' | 'error' | 'skipped';
  durationMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  errorMessage?: string;
  summary?: Record<string, any>;
}) {
  const supabase = getSupabaseAdmin();
  
  // Cost estimation based on model
  // Haiku: $1/$5 per MTok → $0.000001 per input token, $0.000005 per output token
  // Sonnet: $3/$15 per MTok → $0.000003 per input token, $0.000015 per output token
  const isCreative = params.agentName === 'content-creator' || params.agentName === 'ceo-digest';
  const inputRate = isCreative ? 0.000003 : 0.000001;
  const outputRate = isCreative ? 0.000015 : 0.000005;
  const costEstimate = 
    ((params.tokensInput || 0) * inputRate) + 
    ((params.tokensOutput || 0) * outputRate);

  await supabase.from('agent_runs').insert({
    agent_name: params.agentName,
    status: params.status,
    duration_ms: params.durationMs,
    tokens_input: params.tokensInput || 0,
    tokens_output: params.tokensOutput || 0,
    cost_estimate: costEstimate,
    error_message: params.errorMessage || null,
    summary: params.summary || {},
  });
}

// --- Safe JSON Parse ---
// Claude sometimes wraps JSON in markdown code fences or adds extra text. Extract and parse.
function extractBalanced(str: string, open: string, close: string): string | null {
  const start = str.indexOf(open);
  if (start === -1) return null;
  let depth = 1;
  for (let i = start + 1; i < str.length; i++) {
    if (str[i] === open) depth++;
    else if (str[i] === close) {
      depth--;
      if (depth === 0) return str.slice(start, i + 1);
    }
  }
  return null;
}

export function parseAgentJSON(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid input');
  }
  const cleaned = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Extract first complete JSON array
    const arrayStr = extractBalanced(cleaned, '[', ']');
    if (arrayStr) {
      try {
        return JSON.parse(arrayStr);
      } catch {
        // Fall through
      }
    }
    // Extract first complete JSON object and wrap in array
    const objectStr = extractBalanced(cleaned, '{', '}');
    if (objectStr) {
      try {
        return [JSON.parse(objectStr)];
      } catch {
        // Fall through
      }
    }
  }
  throw new Error(`Could not parse JSON from response (length: ${text.length})`);
}

// --- Date helpers ---
export function mexicoCityNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
}

export function formatDateMX(date: Date): string {
  return date.toLocaleDateString('es-MX', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
}
