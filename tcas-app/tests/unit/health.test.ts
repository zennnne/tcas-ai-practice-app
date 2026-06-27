import { describe, it, expect } from 'vitest'
import { handleHealth } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('healthy db → 200 + {status:"ok"}', async () => {
    const res = await handleHealth(async () => true)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('failing db (ping returns false) → 503', async () => {
    const res = await handleHealth(async () => false)
    expect(res.status).toBe(503)
  })

  it('pinger throws → 503 (defensive)', async () => {
    const res = await handleHealth(async () => {
      throw new Error('connection refused')
    })
    expect(res.status).toBe(503)
  })
})
