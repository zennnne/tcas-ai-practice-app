import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { captureMessage } from '@/lib/monitoring/capture'

const DAYS_BEFORE = 3

/**
 * POST /api/jobs/trial-reminders
 *
 * Cron endpoint — call this on a daily schedule (e.g. Vercel Cron or pg_cron).
 * Protected by x-cron-secret header (set CRON_SECRET env var).
 *
 * Sends a trial-expiry reminder to users whose trial ends within DAYS_BEFORE
 * days and who haven't been reminded yet (idempotent via trial_reminder_sent_at).
 */
export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const db = createAdminClient()

  const { data: candidates, error } = await db.rpc('get_trial_reminder_candidates', {
    days_before: DAYS_BEFORE,
  })

  if (error) {
    captureMessage('trial-reminders: failed to fetch candidates', 'error', {
      error: error.message,
    })
    return new Response('internal_error', { status: 500 })
  }

  let sent = 0
  for (const row of candidates ?? []) {
    const daysLeft = Math.max(
      1,
      Math.ceil((new Date(row.trial_ends_at).getTime() - Date.now()) / 86_400_000)
    )

    await sendEmail('trial_reminder', row.email, { daysLeft })

    // Mark as sent so this user isn't reminded again on the next run
    const { error: markError } = await db.rpc('mark_trial_reminder_sent', { p_user_id: row.user_id })
    if (markError) {
      captureMessage('trial-reminders: failed to mark sent', 'warning', {
        userId: row.user_id,
        error: markError.message,
      })
      continue
    }
    sent++
  }

  return new Response(JSON.stringify({ sent }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
