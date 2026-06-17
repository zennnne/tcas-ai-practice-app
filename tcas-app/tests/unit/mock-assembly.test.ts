import { describe, it, expect } from 'vitest'
import { assembleMock, type EligibleQ } from '@/lib/mock/assembly'

const pool: EligibleQ[] = [
  { id: 'a', topic: 'trig', mock_eligible: true },
  { id: 'b', topic: 'calc', mock_eligible: true },
  { id: 'c', topic: 'trig', mock_eligible: false }, // ไม่ 90+
  { id: 'd', topic: 'algebra', mock_eligible: true },
]

describe('assembleMock', () => {
  it('เลือกเฉพาะ mock_eligible (90+)', () => {
    const set = assembleMock(pool, 3)
    expect(set.every((q) => q.mock_eligible)).toBe(true)
    expect(set.find((q) => q.id === 'c')).toBeUndefined()
  })
  it('กระจายหลาย topic (ไม่กระจุก topic เดียว)', () => {
    const set = assembleMock(pool, 3)
    const topics = new Set(set.map((q) => q.topic))
    expect(topics.size).toBeGreaterThanOrEqual(2)
  })
  it('throw ถ้า 90+ ไม่พอ', () => {
    expect(() => assembleMock(pool, 10)).toThrow(/ไม่พอ/)
  })
})
