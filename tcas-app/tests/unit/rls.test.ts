import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('RLS', () => {
  // anon client (anon key, ไม่ login)
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  it('anon (unauthenticated) cannot read questions', async () => {
    const { data } = await anon.from('questions').select('*')
    expect(data).toEqual([]) // RLS ตัดทิ้ง (policy = authenticated only)
  })
})
