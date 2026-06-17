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

export function computeCalibration(i: AttemptInput): CalibrationResult {
  if (!i.countInCalibration) return { user: null, question: null }

  const userScore = i.correct ? 1 : 0
  const newUser = updatePlayer(i.user, [{ opponent: i.question, score: userScore }])

  // question "ชนะ" เมื่อ user ตอบผิด
  const newQuestion = i.questionFrozen
    ? null
    : updatePlayer(i.question, [{ opponent: i.user, score: 1 - userScore }])

  return { user: newUser, question: newQuestion }
}

export function shouldUnfreeze(attemptsFromLowRdUsers: number, threshold = 20): boolean {
  return attemptsFromLowRdUsers >= threshold
}
