import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAttempt, recordMockBatch } from '@/lib/attempts/record'

// DB integration: ยืนยันว่า seam ใหม่ขยับ user_ratings จริง (bug เดิม: mock/social ไม่ขยับ)
describe('attempt recorder (DB)', () => {
  const db = createAdminClient()
  let userId: string

  async function makeQuestion(topic: string, frozen: boolean, value = 1500) {
    const { data, error } = await db.from('questions').insert({
      subject: 'math', topic, difficulty_level: 3,
      difficulty_value: value, rating_deviation: 200, difficulty_frozen: frozen,
      body: { q: 'x', choices: ['a', 'b'], answer: 'a' },
    }).select('id').single()
    if (error) throw error
    return data!.id as string
  }

  async function rating(topic: string) {
    const { data } = await db.from('user_ratings').select('true_rank')
      .eq('user_id', userId).eq('subject', 'math').eq('topic', topic).maybeSingle()
    return data?.true_rank ?? null
  }

  beforeAll(async () => {
    const { data } = await db.auth.admin.createUser({
      email: `rec-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
  })

  it('practice: ขยับ true_rank + ลง lock', async () => {
    const qId = await makeQuestion('algebra', true)
    const { calibration } = await recordAttempt(db, {
      userId, questionId: qId, correct: true, timeMs: 1000,
      context: 'practice', countInCalibration: true, applyLock: true,
    })
    expect(calibration.user).not.toBeNull()
    expect(await rating('algebra')).not.toBe(1500) // ขยับจริง

    const { data: lock } = await db.from('user_question_locks').select('lock_until')
      .eq('user_id', userId).eq('question_id', qId).maybeSingle()
    expect(lock).not.toBeNull()
  })

  it('social clean attempt: ขยับ true_rank + question difficulty, ไม่ lock (bug เดิม: ไม่ขยับ)', async () => {
    const qId = await makeQuestion('calculus', false, 1600)
    await recordAttempt(db, {
      userId, questionId: qId, correct: false, timeMs: 800,
      context: 'social', countInCalibration: true, applyLock: false,
    })
    expect(await rating('calculus')).not.toBe(1500) // user ขยับ

    const { data: q } = await db.from('questions').select('difficulty_value')
      .eq('id', qId).single()
    expect(q!.difficulty_value).not.toBe(1600) // question (unfrozen) ขยับ

    const { data: lock } = await db.from('user_question_locks').select('lock_until')
      .eq('user_id', userId).eq('question_id', qId).maybeSingle()
    expect(lock).toBeNull() // ไม่ lock
  })

  it('social repeat (countInCalibration=false): insert attempt อย่างเดียว ไม่ขยับ rating', async () => {
    const qId = await makeQuestion('stats', false, 1550)
    await recordAttempt(db, {
      userId, questionId: qId, correct: true, timeMs: 600,
      context: 'social', countInCalibration: false, applyLock: false,
    })
    expect(await rating('stats')).toBeNull() // ไม่สร้าง rating row เปล่า

    const { data: q } = await db.from('questions').select('difficulty_value')
      .eq('id', qId).single()
    expect(q!.difficulty_value).toBe(1550) // question ไม่ขยับ

    const { count } = await db.from('user_attempts').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('question_id', qId)
    expect(count).toBe(1) // attempt ลงจริง
  })

  it('mock batch: bulk insert + ขยับ true_rank ต่อ topic (bug เดิม: ไม่ขยับ + N+1)', async () => {
    const q1 = await makeQuestion('vectors', false, 1500)
    const q2 = await makeQuestion('vectors', false, 1500)
    // ตอบถูกทั้งคู่กับโจทย์ rating 1500 → true_rank ต้องขึ้น (ถ้าถูก+ผิดสมมาตร rating นิ่ง = ถูกตาม Glicko)
    const { calibrationByTopic } = await recordMockBatch(db, {
      userId, answers: [
        { questionId: q1, correct: true },
        { questionId: q2, correct: true },
      ],
    })
    expect(calibrationByTopic['vectors']).toBeDefined()
    expect(await rating('vectors')).toBeGreaterThan(1500) // user ขยับขึ้น (bug เดิมไม่ขยับเลย)

    const { count } = await db.from('user_attempts').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).in('question_id', [q1, q2])
    expect(count).toBe(2) // 2 attempts, context=mock

    const { data: qs } = await db.from('questions').select('difficulty_value')
      .in('id', [q1, q2])
    expect(qs!.every((q) => q.difficulty_value !== 1500)).toBe(true) // ทั้งคู่ calibrate
  })
})
