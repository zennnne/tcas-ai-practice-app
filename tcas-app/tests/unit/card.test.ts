import { describe, it, expect } from 'vitest'
import { buildShareCard } from '@/lib/social/card'

describe('buildShareCard', () => {
  it('แปลงผลเป็น emoji grid (🟩 ถูก 🟥 ผิด)', () => {
    const card = buildShareCard({
      results: [true, true, false, true], rank: 2, total: 5, subject: 'คณิต',
    })
    expect(card).toContain('🟩🟩🟥🟩')
    expect(card).toContain('2/5')
    expect(card).toContain('คณิต')
  })
  it('ไม่มีเนื้อโจทย์/คำตอบใน card (กัน spoil)', () => {
    const card = buildShareCard({ results: [true], rank: 1, total: 2, subject: 'คณิต' })
    expect(card).not.toMatch(/answer|เฉลย/i)
  })
})
