'use client'
import { useState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import { CURRENT_POLICY_VERSION } from '@/lib/consent/consent'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const r = await signup(email, pw, consentGiven, CURRENT_POLICY_VERSION)
    setLoading(false)
    if (r.error) setErr(r.error)
    else router.push('/practice')
  }

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-1 text-lg font-bold text-ink rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen">
          TCAS
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pen text-paper text-[11px] font-bold">
            ai
          </span>
        </Link>
      </header>

      <main id="main-content" className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-2">เริ่มต้นฟรี ไม่ต้องใส่บัตร</p>
            <h1 className="text-3xl font-bold text-ink">สร้างบัญชีใหม่</h1>
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
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="field-line"
              />
            </div>

            {/* PDPA consent checkbox — Human TODO: replace placeholder links with real policy wording */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-pen"
                aria-required="true"
              />
              <span className="text-sm text-ink-soft leading-snug">
                ฉันอ่านและยอมรับ{' '}
                <Link href="/terms" target="_blank" className="text-pen underline hover:text-pen-deep">
                  ข้อกำหนดการใช้งาน
                </Link>{' '}
                และ{' '}
                <Link href="/privacy" target="_blank" className="text-pen underline hover:text-pen-deep">
                  นโยบายความเป็นส่วนตัว
                </Link>
                {' '}(รวมถึงการเก็บและประมวลผลข้อมูลส่วนบุคคลตาม PDPA)
                {/* Human TODO (parental consent): ผู้ที่อายุต่ำกว่า 20 ปีต้องได้รับความยินยอมจากผู้ปกครอง — กลไกนี้รอคำแนะนำกฎหมายก่อนสร้าง */}
              </span>
            </label>

            {err && <p role="alert" className="text-sm text-red-600 -mt-2">{err}</p>}

            <button
              type="submit"
              disabled={loading || !consentGiven}
              className="mt-1 py-3.5 btn-pen"
            >
              {loading ? 'กำลังสมัคร…' : 'สมัครฟรีวันนี้'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-ink-soft">
            มีบัญชีอยู่แล้ว?{' '}
            <Link href="/login" className="text-pen font-semibold hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
