import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { pickQuestion, rankToLevel } from '@/lib/practice/serving'
import { canTriggerGen } from '@/lib/practice/free-pool'
import type { Status } from '@/lib/billing/gating'
import { QuestionCard } from './QuestionCard'

// default subject/topic; query params ขยายได้ภายหลัง
const DEFAULT_SUBJECT = 'math'
const DEFAULT_TOPIC = 'algebra'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ดึง subscription status (กฎเหล็ก §3.1: free ห้าม trigger gen)
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single()
  const subStatus = (sub?.status ?? 'free') as Status

  // ดึง user_ratings (lazy — อาจยังไม่มีถ้าเพิ่ง signup)
  const { data: ur } = await supabase
    .from('user_ratings')
    .select('true_rank')
    .eq('user_id', user.id)
    .eq('subject', DEFAULT_SUBJECT)
    .eq('topic', DEFAULT_TOPIC)
    .single()

  const level = rankToLevel(ur?.true_rank ?? 1500)
  const question = await pickQuestion(user.id, DEFAULT_SUBJECT, DEFAULT_TOPIC, level)

  if (!question) {
    // กฎเหล็ก §3.1: free = recycled only — ถ้า pool ว่าง ไม่ gen สด
    if (!canTriggerGen(subStatus)) {
      return (
        <main>
          <p data-testid="quota-exhausted">โจทย์ใน pool หมดแล้วสำหรับวันนี้ อัปเกรดเพื่อฝึกต่อ</p>
        </main>
      )
    }
    // trial/paid: escape-hatch จะ trigger เมื่อ gen pipeline พร้อม (P4+)
    return (
      <main>
        <p data-testid="no-question">ไม่มีโจทย์ในช่วงนี้ กลับมาใหม่พรุ่งนี้นะ</p>
      </main>
    )
  }

  const body = question.body as { q: string; choices: string[]; answer: string }

  return (
    <main>
      <QuestionCard
        questionId={question.id}
        q={body.q}
        choices={body.choices}
        answer={body.answer}
      />
    </main>
  )
}
