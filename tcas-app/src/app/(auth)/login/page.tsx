'use client'
import { useState } from 'react'
import { login } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const r = await login(email, pw)
    if (r.error) setErr(r.error)
    else router.push('/practice')
  }

  return (
    <form onSubmit={submit}>
      <input aria-label="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input aria-label="password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button type="submit">Log in</button>
      {err && <p role="alert">{err}</p>}
    </form>
  )
}
