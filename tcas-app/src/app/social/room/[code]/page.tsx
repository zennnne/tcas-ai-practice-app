'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { leaderboard, scoreParticipant, type Answer, type Standing } from '@/lib/social/scoring'
import { buildShareCard } from '@/lib/social/card'
import { submitSocialAnswer } from '@/app/actions/social'
import Navbar from '@/components/Navbar'

type RoomState = 'waiting' | 'in_progress' | 'finished'

interface AnswerPayload { userId: string; qIndex: number; correct: boolean; timeMs: number }

const RANK_MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' }

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

  // Suppress unused warning — onFinish is available for future wiring
  void onFinish
  void submitSocialAnswer

  // ── Waiting ───────────────────────────────────────────────────
  if (roomState === 'waiting') {
    return (
      <>
        <Navbar />
        <main id="main-content" className="min-h-dvh bg-paper pt-24 pb-16 px-4 flex items-center justify-center">
          <div className="text-center max-w-sm w-full">
            <h1 className="sr-only">ห้องสอบ {code} — รอผู้เล่นเข้าห้อง</h1>
            <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-3">รหัสห้อง</p>
            <div className="inline-block font-mono text-5xl font-bold tracking-[0.25em] text-ink bg-panel border border-ruled rounded-2xl px-8 py-5 mb-6">
              {code}
            </div>
            <p className="text-ink mb-2 font-medium">รอผู้เล่นเข้าห้อง</p>
            <p className="text-sm text-ink-soft mb-8">แชร์รหัสนี้ให้เพื่อน สูงสุด 10 คน</p>
            {/* Pulse dots */}
            <div className="flex items-center justify-center gap-2" aria-label="กำลังรอ">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-pen opacity-70"
                  style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
          </div>
        </main>
      </>
    )
  }

  // ── Finished ──────────────────────────────────────────────────
  if (roomState === 'finished') {
    return (
      <>
        <Navbar />
        <main id="main-content" className="min-h-dvh bg-paper pt-24 pb-16 px-4">
          <div className="max-w-lg mx-auto">
            <div className="mb-8">
              <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-1">ห้อง {code}</p>
              <h1 className="text-3xl font-bold text-ink">ผลการแข่งขัน</h1>
            </div>

            <div className="bg-paper border border-ruled rounded-2xl overflow-hidden mb-5">
              <div className="px-6 py-4 border-b border-ruled flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">อันดับ</span>
                <span className="text-sm text-ink-soft">{standings.length} ผู้เล่น</span>
              </div>
              <ol className="divide-y divide-ruled">
                {standings.map((s, i) => (
                  <li key={s.userId} className={`flex items-center gap-4 px-6 py-4 ${i === 0 ? 'bg-mark/10' : ''}`}>
                    <span className="w-8 text-center font-mono font-bold text-ink text-sm">
                      {RANK_MEDAL[i] ?? `${i + 1}.`}
                    </span>
                    <span className="flex-1 font-mono text-xs text-ink-soft truncate">{s.userId}</span>
                    <span className="font-semibold text-ink tabular-nums">{s.correct} ถูก</span>
                    <span className="text-xs text-ink-soft tabular-nums">{(s.avgMs / 1000).toFixed(1)}s</span>
                  </li>
                ))}
              </ol>
            </div>

            {shareText && (
              <div className="bg-panel/60 border border-ruled rounded-2xl p-5">
                <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-3">แชร์ผล</p>
                <pre className="text-sm text-ink whitespace-pre-wrap font-mono leading-relaxed">{shareText}</pre>
              </div>
            )}
          </div>
        </main>
      </>
    )
  }

  // ── In-progress ───────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-dvh bg-paper pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-0.5">ห้อง {code}</p>
              <h1 className="text-xl font-bold text-ink">กำลังสอบ</h1>
            </div>
            <span className="font-mono text-xs px-3 py-1.5 rounded-full bg-pen/10 text-pen font-semibold animate-pulse">
              LIVE
            </span>
          </div>

          {/* Leaderboard */}
          <div className="bg-paper border border-ruled rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-ruled">
              <p className="text-sm font-semibold text-ink">Leaderboard</p>
            </div>
            {standings.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-ink-soft">
                รอคะแนนขึ้น…
              </div>
            ) : (
              <ol className="divide-y divide-ruled">
                {standings.map((s, i) => (
                  <li key={s.userId} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="w-6 text-center font-mono text-xs font-bold text-ink-soft">{i + 1}</span>
                    <span className="flex-1 font-mono text-xs text-ink-soft truncate">{s.userId}</span>
                    <span className="font-semibold text-ink tabular-nums text-sm">{s.correct} ถูก</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-ink-soft">โจทย์ + คะแนนแบบ real-time อัปเดตอัตโนมัติ</p>
        </div>
      </main>
    </>
  )
}
