import { describe, it, expect } from 'vitest'
import { genRoomCode, selectQuestionSet, skillRange } from '@/lib/social/room'

describe('room', () => {
  it('genRoomCode = 6 ตัวอักษร A-Z0-9', () => {
    const c = genRoomCode()
    expect(c).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('skillRange จาก levels ผู้เล่น → [min,max]', () => {
    expect(skillRange([3, 4, 3, 5])).toEqual({ min: 3, max: 5 })
  })

  it('selectQuestionSet เลือกเฉพาะโจทย์ใน level range, จำนวนตามขอ', () => {
    const pool = [
      { id: 'a', difficulty_level: 2 }, { id: 'b', difficulty_level: 3 },
      { id: 'c', difficulty_level: 4 }, { id: 'd', difficulty_level: 5 },
    ]
    const set = selectQuestionSet(pool, { min: 3, max: 4 }, 2)
    expect(set).toHaveLength(2)
    expect(set.every((q) => q.difficulty_level >= 3 && q.difficulty_level <= 4)).toBe(true)
  })

  it('selectQuestionSet ignore lock (ไม่กรองอะไรนอกจาก range)', () => {
    const pool = [{ id: 'b', difficulty_level: 3 }, { id: 'c', difficulty_level: 4 }]
    expect(selectQuestionSet(pool, { min: 3, max: 4 }, 5)).toHaveLength(2) // มีแค่ 2 ก็เอา 2
  })
})
