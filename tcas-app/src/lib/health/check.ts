import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function pingDb(db: SupabaseClient): Promise<boolean> {
  const { error } = await db.from('questions').select('id').limit(1)
  return error == null
}

/** exported for unit tests — inject a fake pinger to avoid a live DB */
export async function handleHealth(ping: () => Promise<boolean>): Promise<Response> {
  try {
    const ok = await ping()
    if (ok) return NextResponse.json({ status: 'ok' })
    return NextResponse.json({ status: 'error' }, { status: 503 })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
