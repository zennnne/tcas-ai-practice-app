'use client'
import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const r = await login(email, pw)
    setLoading(false)
    if (r.error) setErr(r.error)
    else router.push('/practice')
  }

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <div className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-1 text-lg font-bold text-ink">
          TCAS
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pen text-paper text-[11px] font-bold">
            ai
          </span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-2">ยินดีต้อนรับกลับ</p>
            <h1 className="text-3xl font-bold text-ink">เข้าสู่ระบบ</h1>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink-soft">อีเมล</label>
              <input
                id="email"
                aria-label="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="field-line"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink-soft">รหัสผ่าน</label>
              <input
                id="password"
                aria-label="password"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                placeholder="••••••••"
                className="field-line"
              />
            </div>

            {err && <p role="alert" className="text-sm text-red-500 -mt-2">{err}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-3.5 btn-pen"
            >
              {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-ink-soft">
            ยังไม่มีบัญชี?{' '}
            <Link href="/signup" className="text-pen font-semibold hover:underline">
              สมัครฟรีเลย
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
