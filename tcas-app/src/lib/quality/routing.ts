import { CONFIDENCE_FLOOR } from './confidence'

export type QualityAction = 'none' | 'auto_remove_regen' | 'review_queue'

// mock-eligible (high-stakes) ถูก report จน confidence ตกต่ำกว่า 90 → human review (ไม่ auto-remove)
// ⚠️ ค่านี้ซ้ำใน 0011_moderation.sql — แก้ต้องแก้คู่กัน
export const MOCK_REVIEW_TRIGGER = 90

export function routeQuestion(q: { confidence: number; mockEligible: boolean }): QualityAction {
  if (q.mockEligible) return q.confidence < MOCK_REVIEW_TRIGGER ? 'review_queue' : 'none'
  // practice/social: ตกฟลอร์ → auto-remove + regen (ถูกกว่าเวลาตรวจ §4.6)
  return q.confidence < CONFIDENCE_FLOOR ? 'auto_remove_regen' : 'none'
}
