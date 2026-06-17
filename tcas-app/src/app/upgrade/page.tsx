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
  { id: 'tier1' as const, label: 'Tier 1', price: '99 บาท/เดือน', desc: 'คณิต + ฟิสิกส์' },
  { id: 'tier2' as const, label: 'Tier 2', price: '249 บาท/เดือน', desc: 'ครบทุกวิชา' },
]

export default function UpgradePage() {
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
        if ('error' in result) {
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
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-bold">อัปเกรด</h1>
      <div className="flex gap-6 flex-wrap justify-center">
        {TIERS.map((t) => (
          <div key={t.id} className="border rounded-xl p-6 w-64 flex flex-col gap-4 shadow">
            <h2 className="text-xl font-semibold">{t.label}</h2>
            <p className="text-gray-600">{t.desc}</p>
            <p className="text-2xl font-bold">{t.price}</p>
            <button
              onClick={() => handleCheckout(t.id)}
              disabled={loading === t.id}
              className="bg-blue-600 text-white rounded-lg py-2 px-4 disabled:opacity-50"
            >
              {loading === t.id ? 'กำลังโหลด…' : 'สมัครตอนนี้'}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-red-600">{error}</p>}
    </main>
  )
}
