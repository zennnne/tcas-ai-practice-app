import { describe, it, expect } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { startMock } from '@/lib/mock/start'

// DB integration: pool fetch (mock_eligible + active) → assembleMock seam เดียว
describe('startMock (DB)', () => {
  const db = createAdminClient()

  async function makeEligibleQuestion(topic: string) {
    const { data, error } = await db.from('questions').insert({
      subject: 'physics', topic, difficulty_level: 3,
      difficulty_value: 1500, rating_deviation: 200, difficulty_frozen: true,
      mock_eligible: true, status: 'active',
      body: { q: 'x', choices: ['a', 'b'], answer: 'a' },
    }).select('id').single()
    if (error) throw error
    return data!.id as string
  }

  it('ดึง pool ที่ mock_eligible=true + active มาประกอบเป็นชุด', async () => {
    await Promise.all([
      makeEligibleQuestion('mock-start-mech'),
      makeEligibleQuestion('mock-start-mech'),
      makeEligibleQuestion('mock-start-wave'),
    ])
    const { questionIds } = await startMock(db, { subject: 'physics', count: 2 })
    expect(questionIds).toHaveLength(2)
  })

  it('pool ไม่พอ: throw', async () => {
    await expect(
      startMock(db, { subject: 'physics-empty-subject', count: 5 })
    ).rejects.toThrow('โจทย์ 90+ ไม่พอสำหรับ mock')
  })
})
