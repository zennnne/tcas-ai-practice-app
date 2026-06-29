import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail, type MailerFn } from '@/lib/email/send'

// ---------------------------------------------------------------------------
// sendEmail seam — pure unit tests, zero network calls
// ---------------------------------------------------------------------------

describe('sendEmail seam', () => {
  let mailer: ReturnType<typeof vi.fn> & MailerFn

  beforeEach(() => {
    mailer = vi.fn().mockResolvedValue(undefined)
  })

  describe('receipt email', () => {
    it('calls mailer with the right recipient', async () => {
      await sendEmail('receipt', 'user@test.local', { tier: 'tier1', date: '2026-06-29' }, mailer)
      expect(mailer).toHaveBeenCalledOnce()
      const [to] = mailer.mock.calls[0]
      expect(to).toBe('user@test.local')
    })

    it('subject contains ใบเสร็จ', async () => {
      await sendEmail('receipt', 'user@test.local', { tier: 'tier1', date: '2026-06-29' }, mailer)
      const [, subject] = mailer.mock.calls[0]
      expect(subject).toContain('ใบเสร็จ')
    })

    it('html body contains the tier name', async () => {
      await sendEmail('receipt', 'user@test.local', { tier: 'tier2', date: '2026-06-29' }, mailer)
      const [, , html] = mailer.mock.calls[0]
      expect(html).toContain('tier2')
    })

    it('html body contains the date', async () => {
      await sendEmail('receipt', 'user@test.local', { tier: 'tier1', date: '2026-06-29' }, mailer)
      const [, , html] = mailer.mock.calls[0]
      expect(html).toContain('2026-06-29')
    })
  })

  describe('trial_reminder email', () => {
    it('calls mailer with the right recipient', async () => {
      await sendEmail('trial_reminder', 'trial@test.local', { daysLeft: 3 }, mailer)
      expect(mailer).toHaveBeenCalledOnce()
      const [to] = mailer.mock.calls[0]
      expect(to).toBe('trial@test.local')
    })

    it('subject contains the days remaining', async () => {
      await sendEmail('trial_reminder', 'trial@test.local', { daysLeft: 3 }, mailer)
      const [, subject] = mailer.mock.calls[0]
      expect(subject).toContain('3')
    })

    it('html body contains daysLeft', async () => {
      await sendEmail('trial_reminder', 'trial@test.local', { daysLeft: 2 }, mailer)
      const [, , html] = mailer.mock.calls[0]
      expect(html).toContain('2')
    })
  })

  describe('error handling', () => {
    it('mailer failure is swallowed — sendEmail never throws', async () => {
      const failingMailer = vi.fn().mockRejectedValue(new Error('Resend down'))
      await expect(
        sendEmail('receipt', 'x@test.local', {}, failingMailer)
      ).resolves.toBeUndefined()
    })

    it('mailer is still called even with empty data', async () => {
      await sendEmail('receipt', 'bare@test.local', {}, mailer)
      expect(mailer).toHaveBeenCalledOnce()
    })
  })
})
