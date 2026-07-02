'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setGoal, startMock, submitMock } from '@/app/actions/mock'
import Navbar from '@/components/Navbar'
import { AnswerChoices } from '@/components/AnswerChoices'
import { OnboardingBanner } from '@/components/OnboardingBanner'
import { countAttempts, isFirstVisit } from '@/lib/onboarding/status'

type Phase = 'setup' | 'exam' | 'result'
type Question = { id: string; topic: string; body: { q: string; choices: string[]; answer: string } }
type Answer = { topic: string; questionId: string; correct: boolean }

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function MockPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [faculty, setFaculty] = useState('')
  const [subject] = useState('math')
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [result, setResult] = useState<{ score: number; admitChance: string | null; weakTopics: string[] } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [firstVisit, setFirstVisit] = useState(false)

  // เคยสอบ mock มาก่อนไหม — ใช้โชว์ empty-state บอกว่า Mock คืออะไร (ไม่บล็อกการเริ่มสอบ)
  useEffect(() => {
    let cancelled = false
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const count = await countAttempts(supabase, user.id, 'mock')
      if (!cancelled) setFirstVisit(isFirstVisit(count))
    }
    check()
    return () => { cancelled = true }
  }, [])

  async function handleStart() {
    setLoading(true)
    setError('')
    if (faculty.trim()) await setGoal(faculty.trim())
    const res = await startMock(subject, 10)
    if (!res.ok) { setError(res.error); setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('questions')
      .select('id, topic, body')
      .in('id', res.questionIds)
    if (!data?.length) { setError('ไม่พบโจทย์ใน pool'); setLoading(false); return }
    setQuestions(data as Question[])
    setCurrent(0)
    setAnswers([])
    setSelectedChoice(null)
    setPhase('exam')
    setLoading(false)
  }

  function handleAnswer(choice: string) {
    if (selectedChoice) return
    setSelectedChoice(choice)
    const q = questions[current]
    const correct = choice === q.body.answer
    const newAnswers = [...answers, { topic: q.topic, questionId: q.id, correct }]
    setTimeout(() => {
      if (current + 1 < questions.length) {
        setAnswers(newAnswers)
        setCurrent(current + 1)
        setSelectedChoice(null)
      } else {
        handleSubmit(newAnswers)
      }
    }, 700)
  }

  async function handleSubmit(finalAnswers: Answer[]) {
    setLoading(true)
    const res = await submitMock({ subject, answers: finalAnswers })
    setLoading(false)
    if (!res.ok) { setError(res.error); return }
    setResult({ score: res.score, admitChance: res.admitChance ?? null, weakTopics: res.weakTopics })
    setPhase('result')
  }

  function handleRetry() {
    setPhase('setup')
    setResult(null)
    setAnswers([])
    setSelectedChoice(null)
    setCurrent(0)
  }

  // ── Setup ──────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <>
        <Navbar />
        <main className="min-h-dvh bg-paper pt-24 pb-16 px-4 flex items-center justify-center">
          <div className="w-full max-w-sm">
            {firstVisit && (
              <OnboardingBanner
                testId="onboarding-first-mock"
                eyebrow="ก่อนเริ่ม"
                title="Mock Exam คืออะไร"
                description="สอบจำลองสนามจริง 10 ข้อ ประเมินโอกาสติดคณะที่หวังจากคะแนนจริง — แนะนำให้ลองฝึกโจทย์ (practice) สักพักก่อน เพื่อให้ AI ปรับระดับให้ตรงจุด"
              />
            )}

            <div className="mb-8">
              <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-2">จำลองสนามจริง</p>
              <h1 className="text-3xl font-bold text-ink leading-tight">Mock Exam</h1>
              <p className="mt-2 text-sm text-ink-soft">10 ข้อ · คณิตศาสตร์ · AI วิเคราะห์จุดอ่อน</p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="faculty" className="text-sm font-medium text-ink-soft">
                  คณะเป้าหมาย <span className="text-graphite">(ไม่บังคับ)</span>
                </label>
                <input
                  id="faculty"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="เช่น วิศวะ จุฬา"
                  className="field-line"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={handleStart}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3.5 btn-pen"
              >
                {loading ? 'กำลังโหลดโจทย์…' : <>เริ่มสอบ <Arrow /></>}
              </button>
            </div>
          </div>
        </main>
      </>
    )
  }

  // ── Exam ───────────────────────────────────────────────────────
  if (phase === 'exam') {
    const q = questions[current]
    const progress = ((current) / questions.length) * 100

    return (
      <>
        <Navbar />
        <main className="min-h-dvh bg-paper pt-20 pb-16 px-4">
          {/* Progress bar */}
          <div className="fixed top-16 inset-x-0 h-1 bg-ruled z-40" aria-hidden>
            <div
              className="h-full bg-pen transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="max-w-2xl mx-auto">
            {/* Counter */}
            <div className="flex items-center justify-between mb-6 mt-4">
              <span className="font-mono text-xs text-ink-soft tracking-wider uppercase">
                ข้อ {current + 1} / {questions.length}
              </span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < current
                        ? 'bg-correct'
                        : i === current
                          ? 'bg-pen'
                          : 'bg-ruled'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Question card */}
            <div className="bg-paper border border-ruled rounded-2xl shadow-sm p-6 sm:p-8">
              <p className="text-base sm:text-lg text-ink leading-relaxed mb-8">{q.body.q}</p>

              <AnswerChoices
                choices={q.body.choices}
                answer={q.body.answer}
                selected={selectedChoice}
                onSelect={handleAnswer}
              />
            </div>

            {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
          </div>
        </main>
      </>
    )
  }

  // ── Result ─────────────────────────────────────────────────────
  const scoreVal = result?.score ?? 0
  const pct = Math.round(scoreVal)
  const scoreColor = pct >= 70 ? 'text-correct' : pct >= 50 ? 'text-pen' : 'text-red-500'

  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-paper pt-24 pb-16 px-4">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-1">ผลสอบ</p>
            <h2 className="text-2xl font-bold text-ink">Mock Exam เสร็จแล้ว</h2>
          </div>

          {/* Score card */}
          <div className="bg-panel/60 border border-ruled rounded-2xl p-8 mb-5 text-center">
            <p className={`font-mono text-7xl font-bold tabular-nums leading-none ${scoreColor}`}>
              {pct}%
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              ตอบถูก {answers.filter(a => a.correct).length} จาก {answers.length} ข้อ
            </p>
            {result?.admitChance && (
              <p className="mt-4 text-base text-ink">
                โอกาสติด: <span className="font-bold">{result.admitChance}</span>
              </p>
            )}
          </div>

          {/* Weak topics */}
          {result?.weakTopics.length ? (
            <div className="bg-paper border border-ruled rounded-2xl p-6 mb-5">
              <p className="text-sm font-semibold text-ink mb-3">หัวข้อที่ควรทบทวน</p>
              <div className="flex flex-wrap gap-2">
                {result.weakTopics.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-correct/10 border border-correct/20 rounded-2xl p-5 mb-5 text-center">
              <p className="text-sm font-semibold text-correct">ทำได้ดีทุก topic!</p>
            </div>
          )}

          <button
            onClick={handleRetry}
            className="w-full py-3.5 rounded-full border-2 border-ruled text-ink font-semibold hover:border-ink-soft hover:bg-panel/40 transition-colors"
          >
            สอบอีกครั้ง
          </button>
        </div>
      </main>
    </>
  )
}
