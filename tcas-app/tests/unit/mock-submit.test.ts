import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitMock } from '@/lib/mock/submit'

// DB integration: score → goal/cutoff lookup → recordMockBatch ผ่าน seam เดียว
describe('submitMock (DB)', () => {
  const db = createAdminClient()
  let userId: string

  async function makeQuestion(topic: string) {
    const { data, error } = await db.from('questions').insert({
      subject: 'math', topic, difficulty_level: 3,
      difficulty_value: 1500, rating_deviation: 200, difficulty_frozen: false,
      body: { q: 'x', choices: ['a', 'b'], answer: 'a' },
    }).select('id').single()
    if (error) throw error
    return data!.id as string
  }

  beforeAll(async () => {
    const { data } = await db.auth.admin.createUser({
      email: `submit-mock-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
  })

  it('ไม่มี goal ตั้งไว้: admitChance เป็น null แต่ score/weakTopics คำนวณปกติ + record attempt', async () => {
    const qId = await makeQuestion('algebra')
    const result = await submitMock(db, {
      userId, answers: [{ topic: 'algebra', questionId: qId, correct: true }],
    })
    expect(result.score).toBe(100)
    expect(result.weakTopics).toEqual([])
    expect(result.admitChance).toBeNull()

    const { count } = await db.from('user_attempts').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('question_id', qId)
    expect(count).toBe(1)
  })

  it('มี goal ตรงกับ faculty_cutoffs ที่ seed ไว้: คำนวณ admitChance', async () => {
    await db.from('goals').upsert({ user_id: userId, target_faculty: 'วิศวะ จุฬา' })
    const q1 = await makeQuestion('calculus')
    const q2 = await makeQuestion('calculus')
    const result = await submitMock(db, {
      userId,
      answers: [
        { topic: 'calculus', questionId: q1, correct: false },
        { topic: 'calculus', questionId: q2, correct: false },
      ],
    })
    // score = 0, cutoff วิศวะจุฬา min=75 median=82 → ต่ำกว่า min → 'ต่ำ'
    expect(result.score).toBe(0)
    expect(result.admitChance).toBe('ต่ำ')
    expect(result.weakTopics).toEqual(['calculus'])
  })
})
