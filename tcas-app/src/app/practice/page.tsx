import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { pickQuestion, rankToLevel } from '@/lib/practice/serving'
import { QuestionCard } from './QuestionCard'

// default subject/topic; query params ขยายได้ภายหลัง
const DEFAULT_SUBJECT = 'math'
const DEFAULT_TOPIC = 'algebra'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
        subject={DEFAULT_SUBJECT}
        topic={DEFAULT_TOPIC}
        q={body.q}
        choices={body.choices}
        answer={body.answer}
      />
    </main>
  )
}
