import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

async function pingDb(db: SupabaseClient): Promise<boolean> {
  const { error } = await db.from('questions').select('id').limit(1)
  return error == null
}

/** exported for unit tests — inject a fake pinger to avoid live DB */
export async function handleHealth(ping: () => Promise<boolean>): Promise<Response> {
  try {
    const ok = await ping()
    if (ok) return NextResponse.json({ status: 'ok' })
    return NextResponse.json({ status: 'error' }, { status: 503 })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}

export async function GET(): Promise<Response> {
  const db = createAdminClient()
  return handleHealth(() => pingDb(db))
}
