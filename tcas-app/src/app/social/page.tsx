'use client'
import { useState } from 'react'
import { createRoom, joinRoom } from '@/app/actions/social'
import { useRouter } from 'next/navigation'

export default function SocialLobbyPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    setError('')
    const res = await createRoom({ subject: 'math', topic: 'algebra', count: 10, timerSec: 30, mode: 'wait-all' })
    setLoading(false)
    if ('error' in res) { setError(res.error); return }
    router.push(`/social/room/${res.code}`)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setLoading(true)
    setError('')
    const res = await joinRoom(joinCode.trim().toUpperCase())
    setLoading(false)
    if ('error' in res) { setError(res.error); return }
    router.push(`/social/room/${joinCode.trim().toUpperCase()}`)
  }

  return (
    <main className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">โหมดสังคม</h1>
      <button onClick={handleCreate} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-lg">
        สร้างห้องใหม่
      </button>
      <div className="flex gap-2">
        <input
          value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
          placeholder="รหัสห้อง 6 หลัก" maxLength={6}
          className="border rounded px-3 py-2 uppercase"
        />
        <button onClick={handleJoin} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
          เข้าร่วม
        </button>
      </div>
      {error && <p className="text-red-500">{error}</p>}
    </main>
  )
}
