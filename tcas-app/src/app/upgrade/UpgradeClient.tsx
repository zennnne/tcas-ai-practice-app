'use client'
import { useEffect, useState } from 'react'
import { startCheckout } from '@/app/actions/billing'

declare global {
  interface Window {
    OmiseCard: {
      configure: (opts: Record<string, unknown>) => void
      open: (opts: Record<string, unknown>) => void
    }
  }
}

const TIERS = [
  {
    id: 'tier1' as const,
    label: 'Starter',
    price: 99,
    period: 'เดือน',
    desc: 'เหมาะสำหรับน้องที่เตรียมสาย Sci-Math',
    subjects: ['คณิตศาสตร์', 'ฟิสิกส์'],
    highlight: false,
  },
  {
    id: 'tier2' as const,
    label: 'Pro',
    price: 249,
    period: 'เดือน',
    desc: 'ครบทุกวิชา — AI วิเคราะห์จุดอ่อนทุกวันสอบ',
    subjects: ['คณิตศาสตร์', 'ฟิสิกส์', 'เคมี', 'ชีวะ (เร็วๆ นี้)'],
    highlight: true,
  },
]

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function UpgradeClient() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.omise.co/omise.js'
    script.async = true
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  async function handleCheckout(tier: 'tier1' | 'tier2') {
    setLoading(tier)
    setError(null)
    window.OmiseCard.configure({ publicKey: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY })
    window.OmiseCard.open({
      frameLabel: 'TCAS Practice',
      submitLabel: 'ชำระเงิน',
      currency: 'THB',
      onCreateTokenSuccess: async (token: string) => {
        const result = await startCheckout(tier, token)
        if (!result.ok) {
          setError(result.error)
          setLoading(null)
          return
        }
        if (result.authorizeUri) {
          window.location.href = result.authorizeUri
        }
      },
      onFormClosed: () => setLoading(null),
    })
  }

  return (
    <main id="main-content" className="min-h-dvh bg-paper flex flex-col">
      {/* Header */}
      <div className="border-b border-ruled py-16 px-4 text-center">
        <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-3">ราคาและแพ็กเกจ</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-tight mb-4">
          เลือกแพ็กเกจที่<span className="mark">ใช่สำหรับคุณ</span>
        </h1>
        <p className="text-ink-soft text-base max-w-md mx-auto">
          ยกเลิกได้ทุกเมื่อ ไม่มีข้อผูกมัด
        </p>
      </div>

      {/* Pricing cards */}
      <div className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="grid sm:grid-cols-2 gap-5 w-full max-w-2xl items-start">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className={`relative flex flex-col rounded-2xl p-7 border-2 transition-shadow ${
                t.highlight
                  ? 'border-pen bg-pen/[0.03] shadow-[0_16px_48px_-16px_rgba(47,91,255,0.22)]'
                  : 'border-ruled bg-paper'
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-wider uppercase bg-pen text-paper px-3.5 py-1 rounded-full whitespace-nowrap">
                  แนะนำ
                </span>
              )}

              <div className="mb-6">
                <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-1">{t.label}</p>
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="text-4xl font-bold text-ink tabular-nums">{t.price}</span>
                  <span className="text-ink-soft text-sm">บาท / {t.period}</span>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">{t.desc}</p>
              </div>

              <ul className="flex flex-col gap-2.5 mb-8">
                {t.subjects.map((s) => (
                  <li key={s} className="flex items-center gap-2.5 text-sm text-ink">
                    <span className="text-correct flex-shrink-0"><Check /></span>
                    {s}
                  </li>
                ))}
                <li className="flex items-center gap-2.5 text-sm text-ink">
                  <span className="text-correct flex-shrink-0"><Check /></span>
                  AI ปรับระดับโจทย์อัตโนมัติ
                </li>
                <li className="flex items-center gap-2.5 text-sm text-ink">
                  <span className="text-correct flex-shrink-0"><Check /></span>
                  ดูโอกาสติดคณะ
                </li>
              </ul>

              <button
                onClick={() => handleCheckout(t.id)}
                disabled={loading === t.id}
                className={`mt-auto py-3.5 rounded-full font-semibold text-sm transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen ${
                  t.highlight
                    ? 'bg-pen text-paper hover:bg-pen-deep'
                    : 'border-2 border-pen text-pen hover:bg-pen hover:text-paper'
                }`}
              >
                {loading === t.id ? 'กำลังโหลด…' : `สมัคร ${t.label}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="pb-8 text-center text-sm text-red-600">{error}</p>
      )}

      {/* Trust footer */}
      <div className="border-t border-ruled py-8 px-4 text-center">
        <p className="text-xs text-ink-soft">
          ชำระเงินผ่าน <span className="font-semibold text-ink">Omise</span> · รองรับ PromptPay / TrueMoney / บัตรเครดิต
        </p>
      </div>
    </main>
  )
}
