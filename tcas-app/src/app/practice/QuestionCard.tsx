'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitAnswer } from '@/app/actions/practice'

const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง', 'จ']

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
    // eslint-disable-next-line react-hooks/purity -- event handler, runs on click not during render
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
      <div data-testid="choices" className="flex flex-col gap-3">
        {choices.map((c, i) => {
          const label = CHOICE_LABELS[i] ?? String(i + 1)
          const isSelected = c === selected
          const isAnswer = c === answer
          const revealed = selected !== null

          let wrapClass = 'border-ruled text-ink hover:border-pen hover:bg-panel/40 cursor-pointer'
          let bubbleClass = 'border-current text-current'
          if (revealed) {
            if (isAnswer) {
              wrapClass = 'border-correct bg-correct/10 text-ink cursor-default'
              bubbleClass = 'border-correct bg-correct text-white'
            } else if (isSelected) {
              wrapClass = 'border-red-400 bg-red-50 text-red-700 cursor-default'
              bubbleClass = 'border-red-400 bg-red-400 text-white'
            } else {
              wrapClass = 'border-ruled text-graphite cursor-default opacity-60'
              bubbleClass = 'border-current text-current'
            }
          }

          return (
            <button
              key={c}
              data-choice={c}
              onClick={() => handleChoice(c)}
              disabled={!!selected}
              className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 ${wrapClass}`}
            >
              <span className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold transition-colors ${bubbleClass}`}>
                {label}
              </span>
              <span className="text-sm leading-snug flex-1">{c}</span>
              {revealed && isAnswer && (
                <svg className="flex-shrink-0 text-correct" width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* Feedback + Next */}
      {selected && (
        <div data-testid="result" className="mt-6 pt-5 border-t border-ruled flex items-center justify-between gap-4 flex-wrap">
          <p className={`text-sm font-semibold ${correct ? 'text-correct' : 'text-red-500'}`}>
            {correct ? 'ถูกต้อง!' : `ผิด — เฉลยคือ "${answer}"`}
          </p>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 bg-pen text-paper text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-pen-deep transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen"
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
