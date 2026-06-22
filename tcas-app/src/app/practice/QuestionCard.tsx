'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitAnswer } from '@/app/actions/practice'
import { AnswerChoices } from '@/components/AnswerChoices'

interface Props {
  questionId: string
  q: string
  choices: string[]
  answer: string
}

export function QuestionCard({ questionId, q, choices, answer }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const startMs = useRef(0)
  const router = useRouter()

  // เริ่มจับเวลาเมื่อโจทย์ถูก mount (อ่าน clock นอก render เพื่อความ pure)
  useEffect(() => {
    startMs.current = Date.now()
  }, [])

  async function handleChoice(choice: string) {
    if (selected) return
    setSelected(choice)
    const isCorrect = choice === answer
    setCorrect(isCorrect)
    await submitAnswer({ questionId, correct: isCorrect, timeMs: Date.now() - startMs.current })
  }

  function handleNext() {
    router.refresh()
  }

  return (
    <div className="bg-paper border border-ruled rounded-2xl shadow-sm p-6 sm:p-8 max-w-2xl w-full mx-auto">
      {/* Question text */}
      <p data-testid="question-text" className="text-base sm:text-lg text-ink leading-relaxed mb-8">
        {q}
      </p>

      {/* Choices */}
      <AnswerChoices choices={choices} answer={answer} selected={selected} onSelect={handleChoice} />

      {/* Feedback + Next */}
      {selected && (
        <div data-testid="result" className="mt-6 pt-5 border-t border-ruled flex items-center justify-between gap-4 flex-wrap">
          <p className={`text-sm font-semibold ${correct ? 'text-correct' : 'text-red-500'}`}>
            {correct ? 'ถูกต้อง!' : `ผิด — เฉลยคือ "${answer}"`}
          </p>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm btn-pen"
          >
            ข้อต่อไป
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
