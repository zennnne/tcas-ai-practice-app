'use client'

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
 */
export function AnswerChoices({ choices, answer, selected, onSelect }: Props) {
  const revealed = selected !== null

  return (
    <div data-testid="choices" className="flex flex-col gap-3">
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
            onClick={() => onSelect(c)}
            disabled={revealed}
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
  )
}
