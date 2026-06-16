import { createClient } from '@supabase/supabase-js'

// ⚠️ service-role bypass RLS — ใช้เฉพาะใน scripts/ server-only ห้ามใน client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
