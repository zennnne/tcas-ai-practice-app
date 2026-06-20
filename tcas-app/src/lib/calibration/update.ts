import { updatePlayer, type Rating } from './glicko'

export interface AttemptInput {
  user: Rating
  question: Rating
  correct: boolean
  questionFrozen: boolean
  countInCalibration: boolean
}

export interface CalibrationResult {
  user: Rating | null
  question: Rating | null
}

// question calibration: "ชนะ" เมื่อ user ตอบผิด · frozen = cold-start anchor ไม่ขยับ
// แยกออกมาให้ทั้ง single (computeCalibration) + mock batch (recordMockBatch) ใช้ร่วม
export function calibrateQuestion(
  question: Rating, user: Rating, correct: boolean, frozen: boolean
): Rating | null {
  if (frozen) return null
  return updatePlayer(question, [{ opponent: user, score: correct ? 0 : 1 }])
}

export function computeCalibration(i: AttemptInput): CalibrationResult {
  if (!i.countInCalibration) return { user: null, question: null }

  const userScore = i.correct ? 1 : 0
  const newUser = updatePlayer(i.user, [{ opponent: i.question, score: userScore }])
  const newQuestion = calibrateQuestion(i.question, i.user, i.correct, i.questionFrozen)

  return { user: newUser, question: newQuestion }
}

export function shouldUnfreeze(attemptsFromLowRdUsers: number, threshold = 20): boolean {
  return attemptsFromLowRdUsers >= threshold
}
