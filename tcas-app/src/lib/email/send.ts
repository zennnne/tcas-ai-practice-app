import { Resend } from 'resend'
import { captureMessage } from '@/lib/monitoring/capture'

export type EmailType = 'receipt' | 'trial_reminder'

export type EmailDataMap = {
  receipt: { tier: string; date: string }
  trial_reminder: { daysLeft: number }
}

/**
 * Injectable mailer function — swap for a fake in tests.
 * Receives the rendered payload; handles the actual network send.
 */
export type MailerFn = (to: string, subject: string, html: string) => Promise<void>

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function buildTemplate(
  type: EmailType,
  data: EmailDataMap[EmailType],
): { subject: string; html: string } {
  switch (type) {
    case 'receipt': {
      const { tier, date } = data as EmailDataMap['receipt']
      return {
        subject: 'ใบเสร็จการสั่งซื้อ — TCAS AI Practice',
        html: `<p>ขอบคุณสำหรับการสมัครสมาชิก! แพ็กเกจ <strong>${tier}</strong> ของคุณถูกเปิดใช้งานแล้วเมื่อวันที่ ${date} ค่ะ</p>`,
      }
    }
    case 'trial_reminder': {
      const { daysLeft } = data as EmailDataMap['trial_reminder']
      return {
        subject: `Trial ของคุณเหลืออีก ${daysLeft} วัน — TCAS AI Practice`,
        html: `<p>Trial ของคุณจะหมดใน <strong>${daysLeft} วัน</strong> อย่าลืม upgrade เพื่อใช้งานต่อเนื่องนะคะ 🙏</p>`,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Default mailer (Resend)
// ---------------------------------------------------------------------------

async function resendMailer(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    captureMessage('email: RESEND_API_KEY not set — skipping send', 'warning', { to, subject })
    return
  }
  const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@tcas-ai.app'
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) throw new Error(`Resend error: ${(error as { message: string }).message}`)
}

// ---------------------------------------------------------------------------
// Public seam — ONE entry point for every email in the app
// ---------------------------------------------------------------------------

/**
 * Send a transactional email.
 *
 * @param type     - Email type; determines template.
 * @param to       - Recipient email address.
 * @param data     - Template data (tier, date, daysLeft, …).
 * @param mailer   - Override the default Resend mailer (inject a fake in tests).
 *
 * Failures are captured to Sentry and swallowed — email errors must never
 * propagate into the caller's request path.
 */
export async function sendEmail<T extends EmailType>(
  type: T,
  to: string,
  data: EmailDataMap[T],
  mailer: MailerFn = resendMailer,
): Promise<void> {
  try {
    const { subject, html } = buildTemplate(type, data)
    await mailer(to, subject, html)
  } catch (err) {
    captureMessage('email: send failed', 'error', { type, to, error: String(err) })
    // intentionally swallowed — never throw into the caller
  }
}
