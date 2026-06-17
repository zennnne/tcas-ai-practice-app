import { describe, it, expect } from 'vitest'
import { scoreParticipant, leaderboard, hardestQuestion } from '@/lib/social/scoring'

describe('social scoring', () => {
  const answers = [
    { qIndex: 0, correct: true, timeMs: 5000 },
    { qIndex: 1, correct: true, timeMs: 3000 },
    { qIndex: 2, correct: false, timeMs: 8000 },
  ]
  it('score = จำนวนถูก (ความเร็วเป็น tiebreak ไม่ใช่คะแนนหลัก)', () => {
    expect(scoreParticipant(answers).correct).toBe(2)
  })

  it('leaderboard เรียงถูกมากก่อน, เร็วกว่าชนะถ้าเสมอ', () => {
    const board = leaderboard([
      { userId: 'a', correct: 2, avgMs: 6000 },
      { userId: 'b', correct: 2, avgMs: 4000 },
      { userId: 'c', correct: 3, avgMs: 9000 },
    ])
    expect(board.map((p) => p.userId)).toEqual(['c', 'b', 'a']) // c ถูกสุด, b เร็วกว่า a
  })

  it('hardestQuestion = ข้อที่ทั้งห้องผิดมากสุด', () => {
    const all = [
      [{ qIndex: 0, correct: true }, { qIndex: 1, correct: false }],
      [{ qIndex: 0, correct: true }, { qIndex: 1, correct: false }],
    ]
    expect(hardestQuestion(all)).toBe(1)
  })
})
