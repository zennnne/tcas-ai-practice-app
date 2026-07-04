import type { SupabaseClient } from '@supabase/supabase-js'
import { assembleMock } from './assembly'

export interface StartMockInput {
  subject: string
  count: number
}

// fetch mock-eligible pool (90+) → assemble a round-robin-by-topic set
export async function startMock(
  db: SupabaseClient, input: StartMockInput
): Promise<{ questionIds: string[] }> {
  const { data: pool } = await db.from('questions')
    .select('id, topic, mock_eligible')
    .eq('subject', input.subject).eq('mock_eligible', true).eq('status', 'active')
  const set = assembleMock((pool ?? []).map((q) => ({ ...q, mock_eligible: true })), input.count)
  return { questionIds: set.map((q) => q.id) }
}
