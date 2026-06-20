'use server'
import { withAuth } from '@/lib/auth/with-auth'
import { validateReport } from '@/lib/quality/antispam'

export async function submitReport(questionId: string, category: string) {
  return withAuth(null, async ({ userId, supabase }) => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const [{ count }, { data: existing }] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).gte('created_at', today.toISOString()),
      supabase.from('reports').select('id')
        .eq('user_id', userId).eq('question_id', questionId).maybeSingle(),
    ])

    const v = validateReport(category, { todayReportCount: count ?? 0, alreadyReported: !!existing })
    if (!v.ok) return { ok: false as const, error: v.reason ?? 'validation error' }

    await supabase.from('reports').insert({
      question_id: questionId, user_id: userId, category, weight: 1,
    })
    return { ok: true as const }
  })
}

export async function submitRating(questionId: string, score: 'good' | 'neutral' | 'bad') {
  return withAuth(null, async ({ userId, supabase }) => {
    await supabase.from('ratings').upsert({ question_id: questionId, user_id: userId, score })
    return { ok: true as const }
  })
}
