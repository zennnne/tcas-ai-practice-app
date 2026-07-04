'use server'
import { withAuth } from '@/lib/auth/with-auth'
import { submitReport as submitReportOrchestration } from '@/lib/quality/report'

export async function submitReport(questionId: string, category: string) {
  return withAuth(null, ({ userId, supabase }) =>
    submitReportOrchestration(supabase, { userId, questionId, category }))
}

export async function submitRating(questionId: string, score: 'good' | 'neutral' | 'bad') {
  return withAuth(null, async ({ userId, supabase }) => {
    await supabase.from('ratings').upsert({ question_id: questionId, user_id: userId, score })
    return { ok: true as const }
  })
}
