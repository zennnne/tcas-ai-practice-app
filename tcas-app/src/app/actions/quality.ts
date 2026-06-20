'use server'
import { createClient } from '@/lib/supabase/server'
import { validateReport } from '@/lib/quality/antispam'

export async function submitReport(questionId: string, category: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', today.toISOString())
  const { data: existing } = await supabase.from('reports').select('id')
    .eq('user_id', user.id).eq('question_id', questionId).maybeSingle()

  const v = validateReport(category, {
    todayReportCount: count ?? 0, dailyLimit: 10, alreadyReported: !!existing,
  })
  if (!v.ok) return { error: v.reason }

  await supabase.from('reports').insert({
    question_id: questionId, user_id: user.id, category, weight: 1,
  })
  return { ok: true } // confidence recompute = background job (Task 6), ไม่ทำ sync
}

export async function submitRating(questionId: string, score: 'good' | 'neutral' | 'bad') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }
  await supabase.from('ratings').upsert({ question_id: questionId, user_id: user.id, score })
  return { ok: true }
}
