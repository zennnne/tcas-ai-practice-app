'use client'
import { useState } from 'react'
import { createRoom, joinRoom } from '@/app/actions/social'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function SocialLobbyPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<'create' | 'join' | null>(null)

  async function handleCreate() {
    setLoading('create')
    setError('')
    const res = await createRoom({ subject: 'math', topic: 'algebra', count: 10, timerSec: 30, mode: 'wait-all' })
    setLoading(null)
    if (!res.ok) { setError(res.error); return }
    router.push(`/social/room/${res.code}`)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setLoading('join')
    setError('')
    const res = await joinRoom(joinCode.trim().toUpperCase())
    setLoading(null)
    if (!res.ok) { setError(res.error); return }
    router.push(`/social/room/${joinCode.trim().toUpperCase()}`)
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-dvh bg-paper pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-2">แข่งกับเพื่อนสูงสุด 10 คน</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">สนามสอบ Real-time</h1>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Create room card */}
            <div className="bg-paper border border-ruled rounded-2xl p-7 flex flex-col gap-5">
              <div>
                <p className="font-mono text-xs tracking-wider text-pen uppercase mb-2">เจ้าของห้อง</p>
                <h2 className="text-xl font-bold text-ink">สร้างห้องใหม่</h2>
                <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                  เปิดห้องแล้วแชร์รหัสให้เพื่อน ผู้สร้างเริ่มเกมได้เลย
                </p>
              </div>
              <button
                onClick={handleCreate}
                disabled={loading !== null}
                className="mt-auto flex items-center justify-center gap-2 py-3.5 btn-pen"
              >
                {loading === 'create' ? 'กำลังสร้างห้อง…' : 'สร้างห้องใหม่'}
              </button>
            </div>

            {/* Join room card */}
            <div className="bg-paper border border-ruled rounded-2xl p-7 flex flex-col gap-5">
              <div>
                <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-2">ผู้เข้าร่วม</p>
                <h2 className="text-xl font-bold text-ink">เข้าร่วมห้อง</h2>
                <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                  ใส่รหัส 6 หลักที่ได้รับจากเพื่อนแล้วกด “เข้าร่วม”
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <label htmlFor="join-code" className="sr-only">รหัสห้อง</label>
                <input
                  id="join-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="รหัสห้อง เช่น ABC123"
                  maxLength={6}
                  className="bg-panel border border-ruled rounded-xl px-4 py-3 font-mono text-center text-xl tracking-[0.3em] text-ink placeholder:text-graphite placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:border-pen focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen transition-colors"
                />
                <button
                  onClick={handleJoin}
                  disabled={loading !== null || !joinCode.trim()}
                  className="flex items-center justify-center gap-2 border-2 border-pen text-pen font-semibold py-3 rounded-full hover:bg-pen hover:text-paper transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen"
                >
                  {loading === 'join' ? 'กำลังเข้าร่วม…' : 'เข้าร่วม'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-5 text-center text-sm text-red-600">{error}</p>
          )}
        </div>
      </main>
    </>
  )
}
