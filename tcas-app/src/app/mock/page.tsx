'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setGoal, startMock, submitMock } from '@/app/actions/mock'

type Phase = 'setup' | 'exam' | 'result'
type Question = { id: string; topic: string; body: { q: string; choices: string[]; answer: string } }
type Answer = { topic: string; questionId: string; correct: boolean }

export default function MockPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [faculty, setFaculty] = useState('')
  const [subject] = useState('math')
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [result, setResult] = useState<{ score: number; admitChance: string | null; weakTopics: string[] } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    setLoading(true)
    setError('')
    if (faculty.trim()) await setGoal(faculty.trim())
    const res = await startMock(subject, 10)
    if (!res.ok) { setError(res.error); setLoading(false); return }
    // ดึงเนื้อหาโจทย์ด้วย browser client
    const supabase = createClient()
    const { data } = await supabase
      .from('questions')
      .select('id, topic, body')
      .in('id', res.questionIds)
    if (!data?.length) { setError('ไม่พบโจทย์ใน pool'); setLoading(false); return }
    setQuestions(data as Question[])
    setCurrent(0)
    setAnswers([])
    setPhase('exam')
    setLoading(false)
  }

  function handleAnswer(choice: string) {
    const q = questions[current]
    const correct = choice === q.body.answer
    const newAnswers = [...answers, { topic: q.topic, questionId: q.id, correct }]
    if (current + 1 < questions.length) {
      setAnswers(newAnswers)
      setCurrent(current + 1)
    } else {
      handleSubmit(newAnswers)
    }
  }

  async function handleSubmit(finalAnswers: Answer[]) {
    setLoading(true)
    const res = await submitMock({ subject, answers: finalAnswers })
    setLoading(false)
    if (!res.ok) { setError(res.error); return }
    setResult({ score: res.score, admitChance: res.admitChance ?? null, weakTopics: res.weakTopics })
    setPhase('result')
  }

  if (phase === 'setup') {
    return (
      <main className="flex flex-col items-center gap-6 p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold">Mock Exam</h1>
        <div className="w-full flex flex-col gap-2">
          <label className="font-medium">คณะเป้าหมาย (ไม่บังคับ)</label>
          <input
            value={faculty} onChange={(e) => setFaculty(e.target.value)}
            placeholder="เช่น วิศวะ จุฬา"
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={handleStart} disabled={loading}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'เริ่มสอบ (10 ข้อ)'}
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </main>
    )
  }

  if (phase === 'exam') {
    const q = questions[current]
    return (
      <main className="flex flex-col items-center gap-6 p-8 max-w-xl mx-auto">
        <p className="text-sm text-gray-500">ข้อ {current + 1} / {questions.length}</p>
        <p className="text-lg font-medium text-center">{q.body.q}</p>
        <div className="flex flex-col gap-3 w-full">
          {q.body.choices.map((c, i) => (
            <button
              key={i} onClick={() => handleAnswer(c)} disabled={loading}
              className="px-4 py-3 border rounded-lg text-left hover:bg-gray-50 disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        {error && <p className="text-red-500">{error}</p>}
      </main>
    )
  }

  // result phase
  return (
    <main className="flex flex-col items-center gap-6 p-8 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold">ผลสอบ</h2>
      <p className="text-4xl font-bold text-indigo-600">{result?.score.toFixed(0)}%</p>
      {result?.admitChance && (
        <p className="text-lg">โอกาสติด: <span className="font-semibold">{result.admitChance}</span></p>
      )}
      {result?.weakTopics.length ? (
        <div className="w-full">
          <p className="font-medium mb-2">หัวข้อที่ต้องทบทวน:</p>
          <ul className="list-disc list-inside text-red-600">
            {result.weakTopics.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      ) : (
        <p className="text-green-600">ทำได้ดีทุก topic!</p>
      )}
      <button
        onClick={() => setPhase('setup')}
        className="px-6 py-2 bg-gray-200 rounded-lg"
      >
        สอบอีกครั้ง
      </button>
    </main>
  )
}
