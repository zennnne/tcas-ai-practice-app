import { buildDefaultStore, type RateLimitStore } from '@/lib/rate-limit/store'
import { captureMessage } from '@/lib/monitoring/capture'

/**
 * Cost guardrail (issue #8) — a circuit breaker for AI generation spend.
 *
 * This is an INTERFACE only. The gen pipeline itself is out of scope here
 * (separate track) — when it's built, it must call `checkAndRecordSpend`
 * BEFORE firing each AI generation call and skip/queue the call on `false`.
 *
 * Store: reuses the rate-limit seam (issue #3) — same `RateLimitStore`
 * (Upstash Redis in prod, no-op when Redis env vars are absent, `FakeStore`
 * in tests). A daily counter is just INCRBY + TTL, identical shape to a
 * rate-limit window counter, so no new store abstraction is introduced.
 *
 * Alerts: go through the existing Sentry seam (`captureMessage`).
 *
 * Supabase usage (out of scope for code — ops/human config):
 * watch the Supabase dashboard's own usage alerts for DB rows, storage, and
 * egress. No dashboard/code is built here per the issue's scope.
 */

// ---------------------------------------------------------------------------
// Spend kinds + caps
// ---------------------------------------------------------------------------

/**
 * What's being metered. Add a kind here + a case in `getSpendCaps` when the
 * gen pipeline needs to track something new (e.g. per-model token counts).
 */
export type SpendKind = 'ai_call' | 'ai_tokens'

export interface CapConfig {
  /** Crossing this → allow the call, but fire an alert (investigate before it's expensive). */
  softCap: number
  /** Crossing this → deny the call (circuit breaker for a runaway loop or abuse). */
  hardCap: number
}

/**
 * Daily caps per spend kind, read from env with placeholder defaults.
 *
 * ⚠️ Human TODO (Zen): these defaults are conservative placeholders, not a
 * real budget analysis. Set real caps from the financial model
 * (`TCAS Financial Model.xlsx`, ~80k worst-case runway) and current Claude
 * pricing (skill `claude-api`) once the gen pipeline's actual per-question
 * token cost is known — override via the env vars below, no code change
 * needed. Raise as revenue grows.
 */
export function getSpendCaps(kind: SpendKind): CapConfig {
  switch (kind) {
    case 'ai_call':
      return {
        softCap: envInt('COST_GUARDRAIL_AI_CALL_SOFT_CAP', 500),
        hardCap: envInt('COST_GUARDRAIL_AI_CALL_HARD_CAP', 1000),
      }
    case 'ai_tokens':
      return {
        softCap: envInt('COST_GUARDRAIL_AI_TOKENS_SOFT_CAP', 5_000_000),
        hardCap: envInt('COST_GUARDRAIL_AI_TOKENS_HARD_CAP', 10_000_000),
      }
  }
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

// ---------------------------------------------------------------------------
// Alerting seam
// ---------------------------------------------------------------------------

/** Injectable alert sink — swap for a fake in tests. Default fires a Sentry warning. */
export type CostAlerter = (message: string, context?: Record<string, unknown>) => void

function defaultAlerter(message: string, context?: Record<string, unknown>): void {
  captureMessage(message, 'warning', context)
}

// ---------------------------------------------------------------------------
// checkAndRecordSpend — the seam the gen pipeline calls before an AI call
// ---------------------------------------------------------------------------

/**
 * Record `units` of spend for `kind` against today's (UTC) counter, then
 * check it against the daily soft/hard caps.
 *
 * - Under soft cap           → allow, no alert
 * - Over soft cap, under hard → allow, fire an alert
 * - Over hard cap            → deny
 *
 * Store errors fail OPEN (allow) — an outage in the counter store must never
 * block content generation; the risk of a brief unmetered window is
 * preferable to an app-wide outage.
 *
 * @param kind    What's being metered (see SpendKind)
 * @param units   Amount to add for this call (e.g. 1 per generation, or a token count)
 * @param store   Injectable counter store — defaults to the shared rate-limit store (Upstash/no-op)
 * @param alerter Injectable alert sink — defaults to Sentry via captureMessage
 * @returns       true = allowed, false = denied (hard cap exceeded)
 */
export async function checkAndRecordSpend(
  kind: SpendKind,
  units: number,
  store: RateLimitStore = buildDefaultStore(),
  alerter: CostAlerter = defaultAlerter,
): Promise<boolean> {
  const { softCap, hardCap } = getSpendCaps(kind)
  const day = new Date().toISOString().slice(0, 10) // UTC calendar day, e.g. "2026-07-02"
  const key = `cost:${kind}:${day}`
  const ttlSeconds = 2 * 24 * 60 * 60 // cover the rest of the day + a full day's buffer

  let count: number
  try {
    count = await store.increment(key, ttlSeconds, units)
  } catch {
    // Store unavailable — fail open (see doc comment above)
    return true
  }

  if (count > hardCap) {
    return false
  }
  if (count > softCap) {
    alerter(`cost guardrail: ${kind} crossed soft cap (${count}/${softCap}, hard cap ${hardCap})`, {
      kind,
      count,
      softCap,
      hardCap,
    })
  }
  return true
}
