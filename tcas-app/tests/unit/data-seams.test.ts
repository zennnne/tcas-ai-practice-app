import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSubscription, isPaidSubscriber } from '@/lib/billing/subscription'
import { joinRoomWithToken } from '@/lib/social/join'
import { hasRecentAttempt } from '@/lib/attempts/record'
import { pickQuestion } from '@/lib/practice/serving'

// DB integration: ยืนยัน data-access seam ใหม่ (deepen ตาม behavior — B)
describe('data-access seams (DB)', () => {
  const db = createAdminClient()
  let userId: string

  async function makeUser(prefix: string) {
    const { data } = await db.auth.admin.createUser({
      email: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      password: 'test123456', email_confirm: true,
    })
    return data.user!.id
  }

  async function makeQuestion(topic: string, level: number) {
    const { data, error } = await db.from('questions').insert({
      subject: 'math', topic, difficulty_level: level,
      difficulty_value: 1500, rating_deviation: 200, difficulty_frozen: false,
      status: 'active', body: { q: 'x', choices: ['a', 'b'], answer: 'a' },
    }).select('id').single()
    if (error) throw error
    return data!.id as string
  }

  beforeAll(async () => {
    userId = await makeUser('seam')
  })

  describe('getSubscription', () => {
    it('ไม่มี row → default free/free (ไม่ throw)', async () => {
      const fresh = await makeUser('nosub')
      const sub = await getSubscription(db, fresh)
      expect(sub).toEqual({ status: 'free', tier: 'free' })
      expect(await isPaidSubscriber(db, fresh)).toBe(false)
    })

    it('paid → isPaidSubscriber true', async () => {
      await db.from('subscriptions').upsert({ user_id: userId, status: 'paid', tier: 'tier2' })
      expect(await getSubscription(db, userId)).toEqual({ status: 'paid', tier: 'tier2' })
      expect(await isPaidSubscriber(db, userId)).toBe(true)
    })
  })

  describe('joinRoomWithToken', () => {
    async function makeRoom(hostId: string) {
      const code = `R${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 12)
      const { data, error } = await db.from('rooms').insert({
        code, host_id: hostId, subject: 'math', settings: { topic: 'algebra' },
      }).select('code').single()
      if (error) throw error
      return data!.code as string
    }

    it('token พอ → spend 1 + เพิ่ม participant', async () => {
      const u = await makeUser('join')
      await db.from('tokens').upsert({ user_id: u, social_balance: 2 })
      const code = await makeRoom(u)

      const r = await joinRoomWithToken(db, u, code)
      expect(r.ok).toBe(true)

      const { data: tok } = await db.from('tokens').select('social_balance').eq('user_id', u).single()
      expect(tok!.social_balance).toBe(1)
      const { count } = await db.from('room_participants')
        .select('*', { count: 'exact', head: true }).eq('user_id', u)
      expect(count).toBe(1)
    })

    it('token ไม่พอ → error, ไม่เพิ่ม participant', async () => {
      const u = await makeUser('join')
      await db.from('tokens').upsert({ user_id: u, social_balance: 0 })
      const code = await makeRoom(u)

      const r = await joinRoomWithToken(db, u, code)
      expect(r).toEqual({ ok: false, error: 'social token ไม่พอ' })
      const { count } = await db.from('room_participants')
        .select('*', { count: 'exact', head: true }).eq('user_id', u)
      expect(count).toBe(0)
    })

    it('code ผิด → error + ไม่เสีย token (ordering fix: หา room ก่อน spend)', async () => {
      const u = await makeUser('join')
      await db.from('tokens').upsert({ user_id: u, social_balance: 3 })

      const r = await joinRoomWithToken(db, u, 'NOPE-NOPE')
      expect(r).toEqual({ ok: false, error: 'ไม่พบห้อง' })
      const { data: tok } = await db.from('tokens').select('social_balance').eq('user_id', u).single()
      expect(tok!.social_balance).toBe(3) // token ไม่ถูกหัก
    })
  })

  describe('hasRecentAttempt', () => {
    it('ยังไม่เคยตอบ → false; ตอบแล้ว → true', async () => {
      const u = await makeUser('exp')
      const qId = await makeQuestion('algebra', 3)
      expect(await hasRecentAttempt(db, u, qId)).toBe(false)

      await db.from('user_attempts').insert({
        user_id: u, question_id: qId, correct: true, context: 'social', count_in_calibration: true,
      })
      expect(await hasRecentAttempt(db, u, qId)).toBe(true)
    })
  })

  describe('pickQuestion (inject db)', () => {
    it('คืนโจทย์ใน pool ที่ตรง level + ตัด locked ออก', async () => {
      const u = await makeUser('pick')
      const topic = `geo-${Math.random().toString(36).slice(2)}` // isolate pool จาก test อื่น
      const free = await makeQuestion(topic, 2)
      const locked = await makeQuestion(topic, 2)
      await db.from('user_question_locks').insert({
        user_id: u, question_id: locked,
        lock_until: new Date(Date.now() + 864e5).toISOString(),
      })

      const picked = await pickQuestion(db, u, 'math', topic, 2)
      expect(picked).not.toBeNull()
      expect(picked!.id).toBe(free) // locked ถูกตัด
    })
  })
})
