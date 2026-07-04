import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitReport } from '@/lib/quality/report'
import { DAILY_REPORT_LIMIT } from '@/lib/quality/antispam'

// DB integration: orchestration ทั้งชุด (context fetch → validate → insert) ผ่าน seam เดียว
describe('submitReport (DB)', () => {
  const db = createAdminClient()
  let userId: string

  async function makeQuestion() {
    const { data, error } = await db.from('questions').insert({
      subject: 'math', topic: 'algebra', difficulty_level: 3,
      difficulty_value: 1500, rating_deviation: 200, difficulty_frozen: false,
      body: { q: 'x', choices: ['a', 'b'], answer: 'a' },
    }).select('id').single()
    if (error) throw error
    return data!.id as string
  }

  beforeAll(async () => {
    const { data } = await db.auth.admin.createUser({
      email: `report-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
  })

  it('valid report: insert สำเร็จ, weight=1', async () => {
    const qId = await makeQuestion()
    const result = await submitReport(db, { userId, questionId: qId, category: 'wrong_answer' })
    expect(result.ok).toBe(true)

    const { data: row } = await db.from('reports').select('weight')
      .eq('user_id', userId).eq('question_id', qId).single()
    expect(row!.weight).toBe(1)
  })

  it('invalid category: reject ก่อนแตะ DB', async () => {
    const qId = await makeQuestion()
    const result = await submitReport(db, { userId, questionId: qId, category: 'not_a_category' })
    expect(result).toEqual({ ok: false, error: 'ต้องเลือก category ที่ถูกต้อง' })
  })

  it('report ข้อเดิมซ้ำ: reject', async () => {
    const qId = await makeQuestion()
    await submitReport(db, { userId, questionId: qId, category: 'typo' })
    const second = await submitReport(db, { userId, questionId: qId, category: 'typo' })
    expect(second).toEqual({ ok: false, error: 'report ข้อนี้ไปแล้ว' })
  })

  it('เกินโควต้ารายวัน: reject', async () => {
    const { data } = await db.auth.admin.createUser({
      email: `report-quota-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    const quotaUserId = data.user!.id

    for (let i = 0; i < DAILY_REPORT_LIMIT; i++) {
      const qId = await makeQuestion()
      const r = await submitReport(db, { userId: quotaUserId, questionId: qId, category: 'other' })
      expect(r.ok).toBe(true)
    }

    const overQId = await makeQuestion()
    const over = await submitReport(db, { userId: quotaUserId, questionId: overQId, category: 'other' })
    expect(over).toEqual({ ok: false, error: 'report เกินโควต้าวันนี้' })
  })
})
