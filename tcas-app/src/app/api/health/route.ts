import { createAdminClient } from '@/lib/supabase/admin'
import { handleHealth } from '@/lib/health/check'

export async function GET(): Promise<Response> {
  const db = createAdminClient()
  return handleHealth(async () => {
    const { error } = await db.from('questions').select('id').limit(1)
    return error == null
  })
}
