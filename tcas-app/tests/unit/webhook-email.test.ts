/**
 * webhook-email.test.ts
 *
 * Verifies that the Omise webhook handler fires receipt emails correctly.
 * Both the admin DB client and sendEmail are mocked — no Supabase required.
 *
 * Key invariants under test:
 *   • successful charge → sendEmail('receipt', userEmail, { tier }) called
 *   • dedup skip (23505) → sendEmail NOT called
 *   • subscription update failure → sendEmail NOT called
 */
import { createHmac } from 'crypto'
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

// vi.mock calls are hoisted to the top of the module by vitest; they run before
// imports. Modules imported below will receive the mocked versions.
vi.mock('@/lib/supabase/admin')
vi.mock('@/lib/email/send')
vi.mock('@/lib/monitoring/capture', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { POST } from '@/app/api/webhooks/omise/route'

const TEST_SECRET = 'wh_email_test_secret_abc123'

function signedRequest(body: object): Request {
  const raw = JSON.stringify(body)
  const sig = createHmac('sha256', TEST_SECRET).update(raw).digest('hex')
  return new Request('http://localhost/api/webhooks/omise', {
    method: 'POST',
    headers: { 'x-omise-signature': sig, 'content-type': 'application/json' },
    body: raw,
  })
}

// ---------------------------------------------------------------------------
// Admin client factory — configurable per test
// ---------------------------------------------------------------------------

function makeAdminDb(opts: {
  dedupError?: { code: string } | null
  updateRows?: unknown[]
  userEmail?: string | null
}) {
  const {
    dedupError = null,
    updateRows = [{ user_id: 'u1' }],
    userEmail = 'payer@test.local',
  } = opts

  return {
    from: (table: string) => {
      if (table === 'processed_webhook_events') {
        return {
          insert: vi.fn().mockResolvedValue({ error: dedupError }),
          delete: () => ({ eq: vi.fn().mockResolvedValue({}) }),
        }
      }
      if (table === 'subscriptions') {
        return {
          update: () => ({
            eq: () => ({
              select: vi.fn().mockResolvedValue({ data: updateRows, error: null }),
            }),
          }),
          delete: () => ({ eq: vi.fn().mockResolvedValue({}) }),
        }
      }
      return {}
    },
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: userEmail ? { email: userEmail } : null },
        }),
      },
    },
  }
}

const mockCreateAdminClient = vi.mocked(createAdminClient)
const mockSendEmail = vi.mocked(sendEmail)

describe('POST /api/webhooks/omise — receipt email integration', () => {
  beforeAll(() => {
    process.env.OMISE_WEBHOOK_SECRET = TEST_SECRET
  })
  afterAll(() => {
    delete process.env.OMISE_WEBHOOK_SECRET
  })
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue(undefined)
  })

  it('successful charge → sendEmail called with type=receipt and user email', async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminDb({ userEmail: 'payer@test.local' }) as unknown as ReturnType<typeof createAdminClient>
    )

    const req = signedRequest({
      id: 'evt_email_1',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'u1', tier: 'tier1' } },
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledWith(
      'receipt',
      'payer@test.local',
      expect.objectContaining({ tier: 'tier1' })
    )
  })

  it('dedup skip (23505) → sendEmail NOT called', async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminDb({ dedupError: { code: '23505' } }) as unknown as ReturnType<typeof createAdminClient>
    )

    const req = signedRequest({
      id: 'evt_email_dup',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'u1', tier: 'tier1' } },
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('subscription update returns 0 rows → sendEmail NOT called', async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminDb({ updateRows: [] }) as unknown as ReturnType<typeof createAdminClient>
    )

    const req = signedRequest({
      id: 'evt_email_norow',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'ghost_user', tier: 'tier1' } },
    })
    const res = await POST(req)

    expect(res.status).toBe(500)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('getUserById returns no email → sendEmail NOT called (graceful skip)', async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminDb({ userEmail: null }) as unknown as ReturnType<typeof createAdminClient>
    )

    const req = signedRequest({
      id: 'evt_email_noemail',
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'u1', tier: 'tier2' } },
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
