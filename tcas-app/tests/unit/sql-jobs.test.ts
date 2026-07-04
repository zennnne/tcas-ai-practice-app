import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

// DB integration: กฎ scheduled-job ทั้ง 3 มีบ้านเดียวใน SQL (ADR-0001 one home per rule)
// → test ผ่าน interface จริงของมัน = db.rpc() กับ Supabase local
describe('SQL job functions (DB)', () => {
  const db = createAdminClient()

  async function makeUser(prefix: string) {
    const { data, error } = await db.auth.admin.createUser({
      email: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      password: 'test123456', email_confirm: true,
    })
    if (error) throw error
    return data.user!.id
  }

  async function makeQuestion(overrides: Record<string, unknown> = {}) {
    const { data, error } = await db.from('questions').insert({
      subject: 'math', topic: `sqljob-${Math.random().toString(36).slice(2)}`,
      difficulty_level: 3, difficulty_value: 1500, rating_deviation: 200,
      difficulty_frozen: true, status: 'active',
      body: { q: 'x', choices: ['a', 'b'], answer: 'a' },
      ...overrides,
    }).select('id').single()
    if (error) throw error
    return data!.id as string
  }

  async function questionRow(id: string) {
    const { data } = await db.from('questions')
      .select('confidence_score, mock_eligible, status, promote_candidate')
      .eq('id', id).single()
    return data!
  }

  describe('grant_daily_tokens', () => {
    async function subscribedUser(tier: string, status: string, practice = 0, social = 0) {
      const u = await makeUser('grant')
      await db.from('subscriptions').upsert({ user_id: u, tier, status })
      await db.from('tokens').upsert({ user_id: u, practice_balance: practice, social_balance: social })
      return u
    }

    async function balances(u: string) {
      const { data } = await db.from('tokens')
        .select('practice_balance, social_balance').eq('user_id', u).single()
      return data!
    }

    it('tier1 trial: +1/+1', async () => {
      const u = await subscribedUser('tier1', 'trial')
      await db.rpc('grant_daily_tokens')
      expect(await balances(u)).toEqual({ practice_balance: 1, social_balance: 1 })
    })

    it('tier1 ชน cap 7/7 แล้วไม่ทะลุ (invariant สะสม 7 วัน)', async () => {
      const u = await subscribedUser('tier1', 'trial', 7, 6.5)
      await db.rpc('grant_daily_tokens')
      expect(await balances(u)).toEqual({ practice_balance: 7, social_balance: 7 })
    })

    it('tier2 paid: +3/+2, cap 21/14', async () => {
      const u = await subscribedUser('tier2', 'paid', 19, 13)
      await db.rpc('grant_daily_tokens')
      expect(await balances(u)).toEqual({ practice_balance: 21, social_balance: 14 })
    })

    it('free / trial_expired_free: ไม่ได้ grant (free ไม่มี token)', async () => {
      const freeU = await subscribedUser('free', 'free', 0, 0)
      const expiredU = await subscribedUser('tier1', 'trial_expired_free', 2, 2)
      await db.rpc('grant_daily_tokens')
      expect(await balances(freeU)).toEqual({ practice_balance: 0, social_balance: 0 })
      expect(await balances(expiredU)).toEqual({ practice_balance: 2, social_balance: 2 })
    })
  })

  describe('recompute_quality', () => {
    let newReporter: string   // ไม่มีแถว user_reputation → factor 1.0
    let sharpReporter: string // confirmed 3 / rejected 1 → clamp(0.5 + 0.75×1.5) = 1.625
    let noisyReporter: string // confirmed 0 / rejected 5 → clamp(0.5 + 0×1.5) = 0.5

    beforeAll(async () => {
      newReporter = await makeUser('rep-new')
      sharpReporter = await makeUser('rep-sharp')
      noisyReporter = await makeUser('rep-noisy')
      await db.from('user_reputation').upsert([
        { user_id: sharpReporter, confirmed_reports: 3, rejected_reports: 1 },
        { user_id: noisyReporter, confirmed_reports: 0, rejected_reports: 5 },
      ])
    })

    it('report จาก user ใหม่ = weight 1.0 → −8 · rating 1good/1bad หักล้างกัน', async () => {
      const q = await makeQuestion({ confidence_score: 80 })
      const raterA = await makeUser('rate')
      const raterB = await makeUser('rate')
      await db.from('reports').insert({ question_id: q, user_id: newReporter, category: 'wrong_answer' })
      await db.from('ratings').insert([
        { question_id: q, user_id: raterA, score: 'good' },
        { question_id: q, user_id: raterB, score: 'bad' },
      ])
      await db.rpc('recompute_quality')
      expect((await questionRow(q)).confidence_score).toBeCloseTo(72, 5)
    })

    it('reporter แม่น (factor 1.625) ดึงแรงกว่า → ตกฟลอร์ 50 = suspended', async () => {
      const q = await makeQuestion({ confidence_score: 60 })
      await db.from('reports').insert({ question_id: q, user_id: sharpReporter, category: 'wrong_answer' })
      await db.rpc('recompute_quality')
      const row = await questionRow(q)
      expect(row.confidence_score).toBeCloseTo(47, 5) // 60 − 8×1.625
      expect(row.status).toBe('suspended')            // practice ตก <50 → auto-remove
    })

    it('reporter มั่ว (factor 0.5) ดึงเบา → −4', async () => {
      const q = await makeQuestion({ confidence_score: 80 })
      await db.from('reports').insert({ question_id: q, user_id: noisyReporter, category: 'wrong_answer' })
      await db.rpc('recompute_quality')
      const row = await questionRow(q)
      expect(row.confidence_score).toBeCloseTo(76, 5)
      expect(row.status).toBe('active') // ไม่ตกฟลอร์
    })

    it('mock-eligible โดน report ตก <90 → เข้า review_queue (ไม่ auto-remove)', async () => {
      const q = await makeQuestion({ confidence_score: 91, mock_eligible: true })
      await db.from('reports').insert({ question_id: q, user_id: newReporter, category: 'wrong_answer' })
      await db.rpc('recompute_quality')
      const row = await questionRow(q)
      expect(row.confidence_score).toBeCloseTo(83, 5)
      expect(row.mock_eligible).toBe(false) // derived: conf >= 90
      expect(row.status).toBe('active')     // high-stakes ให้คนตัดสิน ไม่ suspend
      const { count } = await db.from('review_queue')
        .select('*', { count: 'exact', head: true }).eq('question_id', q)
      expect(count).toBe(1)
    })

    it('ไม่มี report: rating ล้วนปรับเบา (3good/1bad → +2.5)', async () => {
      const q = await makeQuestion({ confidence_score: 70 })
      const raters = await Promise.all([1, 2, 3, 4].map(() => makeUser('rate')))
      await db.from('ratings').insert(raters.map((u, i) => ({
        question_id: q, user_id: u, score: i < 3 ? 'good' : 'bad',
      })))
      await db.rpc('recompute_quality')
      expect((await questionRow(q)).confidence_score).toBeCloseTo(72.5, 5)
    })
  })

  describe('flag_promote_candidates', () => {
    let attemptUser: string
    let raters: string[]

    beforeAll(async () => {
      attemptUser = await makeUser('flag')
      raters = await Promise.all([1, 2, 3, 4].map(() => makeUser('flag-rate')))
    })

    // baseline ที่ผ่านทุกเงื่อนไข แล้วค่อย override ทีละแกนใน case ที่ fail
    async function seedCase(opts: {
      confidence?: number; rd?: number; attempts?: number
      reports?: number; good?: number; bad?: number
    } = {}) {
      const { confidence = 75, rd = 80, attempts = 50, reports = 0, good = 3, bad = 1 } = opts
      const q = await makeQuestion({ confidence_score: confidence, rating_deviation: rd })
      if (attempts > 0) {
        await db.from('user_attempts').insert(Array.from({ length: attempts }, () => ({
          user_id: attemptUser, question_id: q, correct: true, context: 'practice',
        })))
      }
      if (reports > 0) {
        await db.from('reports').insert(raters.slice(0, reports).map((u) => ({
          question_id: q, user_id: u, category: 'wrong_answer',
        })))
      }
      const ratingRows = raters.slice(0, good + bad).map((u, i) => ({
        question_id: q, user_id: u, score: i < good ? 'good' : 'bad',
      }))
      if (ratingRows.length > 0) await db.from('ratings').insert(ratingRows)
      return q
    }

    async function flagged(q: string) {
      return (await questionRow(q)).promote_candidate
    }

    it('ผ่านครบ: usage 50 · ไม่มี report · rating 0.75 · RD 80 · conf 75 → candidate', async () => {
      const q = await seedCase()
      await db.rpc('flag_promote_candidates')
      expect(await flagged(q)).toBe(true)
    })

    it('ไม่มี rating เลย = evidence ไม่พอ → ไม่ flag (strict AND ตาม §4.7)', async () => {
      const q = await seedCase({ good: 0, bad: 0 })
      await db.rpc('flag_promote_candidates')
      expect(await flagged(q)).toBe(false)
    })

    it('rating 2good/2bad (0.5 < 0.7) → ไม่ flag', async () => {
      const q = await seedCase({ good: 2, bad: 2 })
      await db.rpc('flag_promote_candidates')
      expect(await flagged(q)).toBe(false)
    })

    it('report rate 3/50 = 0.06 ≥ 0.05 → ไม่ flag', async () => {
      const q = await seedCase({ reports: 3 })
      await db.rpc('flag_promote_candidates')
      expect(await flagged(q)).toBe(false)
    })

    it('usage 49 < 50 → ไม่ flag', async () => {
      const q = await seedCase({ attempts: 49 })
      await db.rpc('flag_promote_candidates')
      expect(await flagged(q)).toBe(false)
    })

    it('RD 150 ≥ 100 (ยังไม่ converge) → ไม่ flag', async () => {
      const q = await seedCase({ rd: 150 })
      await db.rpc('flag_promote_candidates')
      expect(await flagged(q)).toBe(false)
    })
  })
})
