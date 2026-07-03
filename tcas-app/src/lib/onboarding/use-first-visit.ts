'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { countAttempts, isFirstVisit, type AttemptContext } from '@/lib/onboarding/status'

/**
 * Client hook: `true` when the signed-in user has no attempts yet in `context`
 * (→ show the first-visit onboarding banner). Returns `false` while loading and
 * for guests, so nothing flashes for users who have already played.
 *
 * Server components (e.g. practice) should call `countAttempts`/`isFirstVisit`
 * directly at render time instead — this hook exists only for the interactive
 * client pages (mock, social) that can't await in the render body.
 */
export function useFirstVisit(context: AttemptContext): boolean {
  const [firstVisit, setFirstVisit] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const count = await countAttempts(supabase, user.id, context)
      if (!cancelled) setFirstVisit(isFirstVisit(count))
    }
    check()
    return () => { cancelled = true }
  }, [context])

  return firstVisit
}
