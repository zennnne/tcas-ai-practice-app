import type { Status } from '@/lib/billing/gating'

// กฎเหล็ก §3.1: free ดึงได้แค่โจทย์ที่มีใน pool (recycled) — ห้าม trigger gen สด
export function canTriggerGen(status: Status): boolean {
  return status === 'trial' || status === 'paid'
}
