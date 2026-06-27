import { createHmac } from 'crypto'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { parseChargeComplete, verifySignature } from '@/lib/billing/webhook'
import { POST } from '@/app/api/webhooks/omise/route'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Pure-function tests (no DB, run anywhere)
// ---------------------------------------------------------------------------

describe('parseChargeComplete', () => {
  it('successful charge → upgrade (user_id, tier, paid, eventId)', () => {
    const event = {
      id: 'evt_s1',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'u1', tier: 'tier2' } },
    }
    expect(parseChargeComplete(event)).toEqual({ userId: 'u1', tier: 'tier2', upgrade: true, eventId: 'evt_s1' })
  })
  it('failed charge → no upgrade (but eventId present)', () => {
    const event = { id: 'evt_f1', key: 'charge.complete', data: { status: 'failed', metadata: { user_id: 'u1', tier: 'tier1' } } }
    const result = parseChargeComplete(event)
    expect(result!.upgrade).toBe(false)
    expect(result!.eventId).toBe('evt_f1')
  })
  it('non-charge event → null', () => {
    expect(parseChargeComplete({ key: 'refund.create', data: { status: 'successful' } })).toBeNull()
  })
  it('missing metadata → null (ป้องกัน undefined userId ใน DB update)', () => {
    expect(parseChargeComplete({ id: 'evt_x', key: 'charge.complete', data: { status: 'successful' } })).toBeNull()
  })
  it('metadata บางส่วน (ไม่มี tier) → null', () => {
    expect(parseChargeComplete({
      id: 'evt_x', key: 'charge.complete', data: { status: 'successful', metadata: { user_id: 'u1' } },
    })).toBeNull()
  })
  it('missing event.id → null (cannot dedup without event id)', () => {
    expect(parseChargeComplete({
      key: 'charge.complete', data: { status: 'successful', metadata: { user_id: 'u1', tier: 'tier1' } },
    })).toBeNull()
  })
})

describe('verifySignature', () => {
  const secret = 'test_webhook_secret'
  const body = '{"key":"charge.complete"}'
  const validSig = createHmac('sha256', secret).update(body).digest('hex')

  it('signature ถูกต้อง → true', () => {
    expect(verifySignature(body, validSig, secret)).toBe(true)
  })
  it('signature ผิด → false', () => {
    expect(verifySignature(body, 'deadeaddeadbeef', secret)).toBe(false)
  })
  it('signature null → false', () => {
    expect(verifySignature(body, null, secret)).toBe(false)
  })
  it('secret ว่าง → false', () => {
    expect(verifySignature(body, validSig, '')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Route handler — early-exit cases (no DB path exercised)
// ---------------------------------------------------------------------------

const TEST_SECRET = 'route_test_secret'

function signedRequest(body: object): Request {
  const raw = JSON.stringify(body)
  const sig = createHmac('sha256', TEST_SECRET).update(raw).digest('hex')
  return new Request('http://localhost/api/webhooks/omise', {
    method: 'POST',
    headers: { 'x-omise-signature': sig, 'content-type': 'application/json' },
    body: raw,
  })
}

describe('POST /api/webhooks/omise — early-exit (no DB)', () => {
  beforeAll(() => { process.env.OMISE_WEBHOOK_SECRET = TEST_SECRET })
  afterAll(() => { delete process.env.OMISE_WEBHOOK_SECRET })

  it('bad signature → 401', async () => {
    const req = new Request('http://localhost/api/webhooks/omise', {
      method: 'POST',
      headers: { 'x-omise-signature': 'badsig' },
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('non-upgrade event (failed charge) → 200 without reaching DB', async () => {
    const req = signedRequest({
      id: 'evt_fail',
      key: 'charge.complete',
      data: { status: 'failed', metadata: { user_id: 'u1', tier: 'tier1' } },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('invalid tier → 400', async () => {
    const req = signedRequest({
      id: 'evt_bad_tier',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'u1', tier: 'unknown_tier' } },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('missing event.id → 200 (parseChargeComplete returns null → not our event)', async () => {
    const req = signedRequest({
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'u1', tier: 'tier1' } },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Route handler — DB integration (requires Supabase; deferred to integration)
// These tests are intentionally written correctly and will pass when a local
// Supabase instance is running (`pnpm supabase start` + `pnpm supabase db reset`).
// ---------------------------------------------------------------------------

describe('POST /api/webhooks/omise — DB integration', () => {
  const db = createAdminClient()
  let userId: string

  beforeAll(async () => {
    process.env.OMISE_WEBHOOK_SECRET = TEST_SECRET
    const { data } = await db.auth.admin.createUser({
      email: `wh-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
    // seed subscription row so upgrade can land
    await db.from('subscriptions').insert({ user_id: userId, tier: 'free', status: 'trial' })
  })

  afterAll(async () => {
    // clean up dedup rows written by these tests
    await db.from('processed_webhook_events').delete().like('event_id', 'evt_int_%')
    if (userId) await db.auth.admin.deleteUser(userId)
    delete process.env.OMISE_WEBHOOK_SECRET
  })

  it('successful charge → subscription paid + dedup row created → 200', async () => {
    const req = signedRequest({
      id: 'evt_int_1',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: userId, tier: 'tier1' } },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const { data: sub } = await db.from('subscriptions').select('status,tier').eq('user_id', userId).single()
    expect(sub).toMatchObject({ status: 'paid', tier: 'tier1' })

    const { data: dedup } = await db.from('processed_webhook_events').select('event_id').eq('event_id', 'evt_int_1').single()
    expect(dedup?.event_id).toBe('evt_int_1')
  })

  it('duplicate event_id → 200, subscription state unchanged', async () => {
    // Second call with same event id
    const req = signedRequest({
      id: 'evt_int_1',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: userId, tier: 'tier2' } }, // different tier to detect double-apply
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // tier should still be 'tier1' from first event, not 'tier2'
    const { data: sub } = await db.from('subscriptions').select('tier').eq('user_id', userId).single()
    expect(sub?.tier).toBe('tier1')
  })

  it('successful charge but no subscription row → 500 + dedup row cleaned up', async () => {
    // Use a user_id that has no subscription row
    const ghostId = '00000000-0000-0000-0000-000000000001'
    const req = signedRequest({
      id: 'evt_int_2',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: ghostId, tier: 'tier1' } },
    })
    const res = await POST(req)
    expect(res.status).toBe(500)

    // dedup row must not persist (cleaned up so Omise can retry)
    const { data: dedup } = await db.from('processed_webhook_events').select('event_id').eq('event_id', 'evt_int_2')
    expect(dedup).toEqual([])
  })
})
