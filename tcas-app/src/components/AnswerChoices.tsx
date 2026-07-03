'use client'

import { useRef, useState } from 'react'

const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง', 'จ']

interface Props {
  choices: string[]
  answer: string
  /** คำตอบที่ผู้ใช้เลือก — null = ยังไม่เลือก (ยังไม่เฉลย) */
  selected: string | null
  onSelect: (choice: string) => void
}

/**
 * OMR-style ตัวเลือกคำตอบ พร้อม reveal state (ถูก/ผิด/จาง) — ใช้ร่วมกัน
 * ระหว่าง practice (QuestionCard) และ mock exam เพื่อให้หน้าตาโจทย์นิ่งที่เดียว
 *
 * A11y: exposed as a WAI-ARIA radiogroup with roving tabindex — arrow keys
 * move focus between choices, Enter/Space (native button activation) commits
 * the answer. Selection is terminal (submits immediately) rather than the
 * classic "arrow moves selection" radio pattern, since answering here is a
 * one-shot action, not a form field to revise before submit.
 */
export function AnswerChoices({ choices, answer, selected, onSelect }: Props) {
  const revealed = selected !== null
  const [activeIndex, setActiveIndex] = useState(0)
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function focusIndex(i: number) {
    refs.current[i]?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = choices.length - 1
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        focusIndex(i === last ? 0 : i + 1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        focusIndex(i === 0 ? last : i - 1)
        break
      case 'Home':
        e.preventDefault()
        focusIndex(0)
        break
      case 'End':
        e.preventDefault()
        focusIndex(last)
        break
    }
  }

  return (
    <div data-testid="choices" role="radiogroup" aria-label="ตัวเลือกคำตอบ" className="flex flex-col gap-3">
      {choices.map((c, i) => {
        const label = CHOICE_LABELS[i] ?? String(i + 1)
        const isSelected = c === selected
        const isAnswer = c === answer

        let wrapClass = 'border-ruled text-ink hover:border-pen hover:bg-panel/40 cursor-pointer'
        let bubbleClass = 'border-current text-current'
        if (revealed) {
          if (isAnswer) {
            wrapClass = 'border-correct bg-correct/10 text-ink cursor-default'
            bubbleClass = 'border-correct bg-correct text-white'
          } else if (isSelected) {
            wrapClass = 'border-red-600 bg-red-50 text-red-700 cursor-default'
            bubbleClass = 'border-red-600 bg-red-600 text-white'
          } else {
            wrapClass = 'border-ruled text-graphite cursor-default opacity-60'
            bubbleClass = 'border-current text-current'
          }
        }

        return (
          <button
            key={c}
            ref={(el) => { refs.current[i] = el }}
            role="radio"
            aria-checked={isSelected}
            data-choice={c}
            onClick={() => onSelect(c)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onFocus={() => setActiveIndex(i)}
            disabled={revealed}
            tabIndex={revealed ? -1 : (i === activeIndex ? 0 : -1)}
            className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen ${wrapClass}`}
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
  )
}
