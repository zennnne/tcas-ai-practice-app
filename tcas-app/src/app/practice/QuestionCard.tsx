'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitAnswer } from '@/app/actions/practice'

interface Props {
  questionId: string
  q: string
  choices: string[]
  answer: string
}

export function QuestionCard({ questionId, q, choices, answer }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const startMs = useRef(Date.now())
  const router = useRouter()

  async function handleChoice(choice: string) {
    if (selected) return // ป้องกันกดซ้ำ
    setSelected(choice)
    const isCorrect = choice === answer
    setCorrect(isCorrect)
    await submitAnswer({
      questionId,
      correct: isCorrect,
      timeMs: Date.now() - startMs.current,
    })
  }

  function handleNext() {
    router.refresh()
  }

  return (
    <div>
      <p data-testid="question-text">{q}</p>
      <div data-testid="choices">
        {choices.map((c) => (
          <button
            key={c}
            data-choice={c}
            onClick={() => handleChoice(c)}
            disabled={!!selected}
            style={{
              display: 'block',
              margin: '4px 0',
              background: selected ? (c === answer ? '#4caf50' : c === selected ? '#f44336' : undefined) : undefined,
            }}
          >
            {c}
          </button>
        ))}
      </div>
      {selected && (
        <div data-testid="result">
          <p>{correct ? 'ถูกต้อง!' : `ผิด เฉลยคือ ${answer}`}</p>
          <button onClick={handleNext}>ข้อต่อไป</button>
        </div>
      )}
    </div>
  )
}
