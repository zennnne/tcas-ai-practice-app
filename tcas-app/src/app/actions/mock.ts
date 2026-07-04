'use server'
import { withAuth } from '@/lib/auth/with-auth'
import { startMock as startMockOrchestration } from '@/lib/mock/start'
import { submitMock as submitMockOrchestration } from '@/lib/mock/submit'

export async function setGoal(targetFaculty: string) {
  return withAuth(null, async ({ userId, supabase }) => {
    await supabase.from('goals').upsert({
      user_id: userId, target_faculty: targetFaculty, updated_at: new Date().toISOString(),
    })
    return { ok: true as const }
  })
}

export async function startMock(subject: string, count: number) {
  return withAuth('mock', async ({ supabase }) => {
    const { questionIds } = await startMockOrchestration(supabase, { subject, count })
    return { ok: true as const, questionIds }
  })
}

// NB: `subject` accepted for parity with the client call site but unused by the
// orchestration below (goal/cutoff lookup is keyed by faculty, not subject) — pre-existing.
export async function submitMock(input: {
  subject: string; answers: { topic: string; questionId: string; correct: boolean }[]
}) {
  return withAuth(null, async ({ userId, supabase }) => {
    const result = await submitMockOrchestration(supabase, { userId, answers: input.answers })
    return { ok: true as const, ...result }
  })
}
