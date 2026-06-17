'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { leaderboard, scoreParticipant, type Answer, type Standing } from '@/lib/social/scoring'
import { buildShareCard } from '@/lib/social/card'
import { submitSocialAnswer } from '@/app/actions/social'

type RoomState = 'waiting' | 'in_progress' | 'finished'

interface AnswerPayload { userId: string; qIndex: number; correct: boolean; timeMs: number }

export default function RoomPage() {
  const { code } = useParams<{ code: string }>()
  const [roomState, setRoomState] = useState<RoomState>('waiting')
  const [answers, setAnswers] = useState<Map<string, Answer[]>>(new Map())
  const [standings, setStandings] = useState<Standing[]>([])
  const [shareText, setShareText] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`room:${code}`)

    // 1. broadcast state: waiting → in_progress → finished
    channel.on('broadcast', { event: 'state' }, (payload: { payload: { state: RoomState } }) => {
      setRoomState(payload.payload.state)
    })

    // 2. broadcast answer: สะสมคำตอบแต่ละคน → recompute leaderboard
    channel.on('broadcast', { event: 'answer' }, (payload: { payload: AnswerPayload }) => {
      const { userId, qIndex, correct, timeMs } = payload.payload
      setAnswers((prev) => {
        const next = new Map(prev)
        const existing = next.get(userId) ?? []
        next.set(userId, [...existing, { qIndex, correct, timeMs }])
        // recompute standings
        const newStandings: Standing[] = Array.from(next.entries()).map(([uid, ans]) => ({
          userId: uid,
          ...scoreParticipant(ans),
        }))
        setStandings(leaderboard(newStandings))
        return next
      })
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [code])

  function onFinish(myAnswers: Answer[], myRank: number, total: number) {
    setShareText(buildShareCard({ results: myAnswers.map((a) => a.correct), rank: myRank, total, subject: code }))
  }

  if (roomState === 'waiting') {
    return (
      <main className="flex flex-col items-center gap-4 p-8">
        <h1 className="text-xl font-bold">ห้อง: {code}</h1>
        <p>รอผู้เล่นเข้าห้อง...</p>
      </main>
    )
  }

  if (roomState === 'finished') {
    return (
      <main className="flex flex-col items-center gap-6 p-8">
        <h1 className="text-xl font-bold">ผลลัพธ์</h1>
        <ol className="space-y-2">
          {standings.map((s, i) => (
            <li key={s.userId} className="flex gap-4">
              <span>{i + 1}.</span>
              <span>{s.userId}</span>
              <span>{s.correct} ข้อ</span>
              <span>{(s.avgMs / 1000).toFixed(1)}s เฉลี่ย</span>
            </li>
          ))}
        </ol>
        {shareText && (
          <pre className="bg-gray-100 p-4 rounded text-center whitespace-pre-wrap">{shareText}</pre>
        )}
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">กำลังเล่น — ห้อง {code}</h1>
      <p>โจทย์ + leaderboard live จะแสดงที่นี่</p>
      <div className="mt-4">
        <h2 className="font-semibold mb-2">Leaderboard</h2>
        <ol className="space-y-1">
          {standings.map((s, i) => (
            <li key={s.userId}>{i + 1}. {s.userId} — {s.correct} ถูก</li>
          ))}
        </ol>
      </div>
    </main>
  )
}
