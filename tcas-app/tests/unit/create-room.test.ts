import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRoom } from '@/lib/social/create-room'

// DB integration: skill_tier lookup → question set in range → room insert ผ่าน seam เดียว
describe('createRoom (DB)', () => {
  const db = createAdminClient()
  let userId: string

  async function makeQuestion(topic: string, difficultyLevel: number) {
    const { data, error } = await db.from('questions').insert({
      subject: 'physics', topic, difficulty_level: difficultyLevel,
      difficulty_value: 1500, rating_deviation: 200, difficulty_frozen: true, status: 'active',
      body: { q: 'x', choices: ['a', 'b'], answer: 'a' },
    }).select('id').single()
    if (error) throw error
    return data!.id as string
  }

  beforeAll(async () => {
    const { data } = await db.auth.admin.createUser({
      email: `create-room-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
  })

  it('ไม่มี skill_tier: default tier=3 → เลือกจาก difficulty_level=3 เท่านั้น', async () => {
    const topic = `mechanics-${Date.now()}`
    const inRange = await makeQuestion(topic, 3)
    await makeQuestion(topic, 5) // นอก range, ไม่ควรถูกเลือก

    const result = await createRoom(db, {
      userId, subject: 'physics', topic, count: 5, timerSec: 30, mode: 'wait-all',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')

    const { data: room } = await db.from('rooms').select('question_ids, settings, host_id')
      .eq('code', result.code).single()
    expect(room!.host_id).toBe(userId)
    expect(room!.question_ids).toContain(inRange)
    expect(room!.settings).toMatchObject({ topic, count: 5, timerSec: 30, mode: 'wait-all' })
  })

  it('มี skill_tier: ใช้ tier ที่ตั้งไว้กำหนด range', async () => {
    const topic = `waves-${Date.now()}`
    await db.from('skill_tier').upsert({ user_id: userId, subject: 'physics', topic, tier: 5 })
    const inRange = await makeQuestion(topic, 5)
    await makeQuestion(topic, 1) // นอก range

    const result = await createRoom(db, {
      userId, subject: 'physics', topic, count: 5, timerSec: 30, mode: 'first-come',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')

    const { data: room } = await db.from('rooms').select('question_ids')
      .eq('code', result.code).single()
    expect(room!.question_ids).toEqual([inRange])
  })
})
