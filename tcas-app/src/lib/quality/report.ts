import type { SupabaseClient } from '@supabase/supabase-js'
import { validateReport } from './antispam'

export interface SubmitReportInput {
  userId: string
  questionId: string
  category: string
}

export type SubmitReportResult = { ok: true } | { ok: false; error: string }

// full report-filing flow: fetch anti-spam context (today count + already-reported) → validate → insert
export async function submitReport(
  db: SupabaseClient, input: SubmitReportInput
): Promise<SubmitReportResult> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const [{ count }, { data: existing }] = await Promise.all([
    db.from('reports').select('*', { count: 'exact', head: true })
      .eq('user_id', input.userId).gte('created_at', today.toISOString()),
    db.from('reports').select('id')
      .eq('user_id', input.userId).eq('question_id', input.questionId).maybeSingle(),
  ])

  const v = validateReport(input.category, { todayReportCount: count ?? 0, alreadyReported: !!existing })
  if (!v.ok) return { ok: false, error: v.reason ?? 'validation error' }

  await db.from('reports').insert({
    question_id: input.questionId, user_id: input.userId, category: input.category, weight: 1,
  })
  return { ok: true }
}
