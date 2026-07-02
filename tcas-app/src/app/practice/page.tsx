import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { pickQuestion, rankToLevel } from '@/lib/practice/serving'
import { canTriggerGen } from '@/lib/practice/free-pool'
import { getSubscription } from '@/lib/billing/subscription'
import { countAttempts, isFirstVisit } from '@/lib/onboarding/status'
import { QuestionCard } from './QuestionCard'
import Navbar from '@/components/Navbar'
import { OnboardingBanner } from '@/components/OnboardingBanner'

// default subject/topic; query params ขยายได้ภายหลัง
const DEFAULT_SUBJECT = 'math'
const DEFAULT_TOPIC = 'algebra'

const SUBJECT_LABEL: Record<string, string> = {
  math: 'คณิตศาสตร์',
  physics: 'ฟิสิกส์',
}
const TOPIC_LABEL: Record<string, string> = {
  algebra: 'พีชคณิต',
  calculus: 'แคลคูลัส',
  mechanics: 'กลศาสตร์',
}

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ดึง subscription status (กฎเหล็ก §3.1: free ห้าม trigger gen)
  const { status: subStatus } = await getSubscription(supabase, user.id)

  // ดึง user_ratings (lazy — อาจยังไม่มีถ้าเพิ่ง signup)
  const { data: ur } = await supabase
    .from('user_ratings')
    .select('true_rank')
    .eq('user_id', user.id)
    .eq('subject', DEFAULT_SUBJECT)
    .eq('topic', DEFAULT_TOPIC)
    .single()

  const level = rankToLevel(ur?.true_rank ?? 1500)
  const question = await pickQuestion(supabase, user.id, DEFAULT_SUBJECT, DEFAULT_TOPIC, level)

  const subjectLabel = SUBJECT_LABEL[DEFAULT_SUBJECT] ?? DEFAULT_SUBJECT
  const topicLabel = TOPIC_LABEL[DEFAULT_TOPIC] ?? DEFAULT_TOPIC

  if (!question) {
    // กฎเหล็ก §3.1: free = recycled only — ถ้า pool ว่าง ไม่ gen สด
    if (!canTriggerGen(subStatus)) {
      return (
        <>
          <Navbar />
          <main className="min-h-dvh bg-paper pt-24 pb-16 px-4 flex items-center justify-center">
            <div className="max-w-md w-full bg-panel/60 border border-ruled rounded-2xl p-8 text-center">
              <span className="inline-block w-11 h-11 rounded-full bg-mark/40 mb-4" aria-hidden />
              <p data-testid="quota-exhausted" className="text-lg font-bold text-ink mb-2">
                โจทย์วันนี้หมดแล้ว
              </p>
              <p className="text-sm text-ink-soft mb-7">
                อัปเกรดเพื่อฝึกโจทย์ได้ไม่จำกัด AI ปรับระดับให้ตลอด
              </p>
              <Link
                href="/upgrade"
                className="inline-flex items-center gap-2 px-7 py-3 text-sm btn-pen"
              >
                ดูแพ็กเกจ →
              </Link>
            </div>
          </main>
        </>
      )
    }
    // trial/paid: escape-hatch จะ trigger เมื่อ gen pipeline พร้อม (P4+)
    return (
      <>
        <Navbar />
        <main className="min-h-dvh bg-paper pt-24 pb-16 px-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-panel/60 border border-ruled rounded-2xl p-8 text-center">
            <p data-testid="no-question" className="text-lg font-bold text-ink mb-2">
              ไม่มีโจทย์ในช่วงนี้
            </p>
            <p className="text-sm text-ink-soft">
              กลับมาใหม่พรุ่งนี้นะ — AI กำลังสร้างโจทย์ใหม่อยู่ค่ะ
            </p>
          </div>
        </main>
      </>
    )
  }

  const body = question.body as { q: string; choices: string[]; answer: string }
  const firstVisit = isFirstVisit(await countAttempts(supabase, user.id, 'practice'))

  return (
    <>
      <Navbar />
      <main className="min-h-dvh bg-paper pt-24 pb-16 px-4">
        {firstVisit && (
          <OnboardingBanner
            testId="onboarding-first-practice"
            eyebrow="ยินดีต้อนรับ"
            title="นี่คือโจทย์ข้อแรกของคุณ"
            description="ลองตอบดูเลย — AI จะเรียนรู้จุดแข็งจุดอ่อนของคุณจากทุกข้อที่ทำ แล้วปรับความยากให้เหมาะกับคุณเรื่อยๆ"
          />
        )}

        {/* Meta bar */}
        <div className="max-w-2xl mx-auto mb-5 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs tracking-wider text-ink-soft uppercase">{subjectLabel}</span>
          <span className="text-graphite text-xs">·</span>
          <span className="text-sm text-ink-soft">{topicLabel}</span>
          <span className="ml-auto font-mono text-xs px-2.5 py-1 rounded-full bg-pen/10 text-pen font-semibold">
            ระดับ {level}/5
          </span>
        </div>

        <QuestionCard
          questionId={question.id}
          q={body.q}
          choices={body.choices}
          answer={body.answer}
        />
      </main>
    </>
  )
}
