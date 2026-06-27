import { createAdminClient } from '@/lib/supabase/admin'
import { handleHealth, pingDb } from '@/lib/health/check'

export async function GET(): Promise<Response> {
  const db = createAdminClient()
  return handleHealth(() => pingDb(db))
}
