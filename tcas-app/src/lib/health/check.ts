import { NextResponse } from 'next/server'

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
