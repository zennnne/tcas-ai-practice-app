import { readFileSync } from 'node:fs'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SeedQuestion {
  subject: string
  topic: string
  difficulty_level: number
  body: { q: string; choices: string[]; answer: string; solution?: string }
}

export function validateSeedQuestion(q: SeedQuestion): { ok: boolean; reason?: string } {
  if (q.difficulty_level < 1 || q.difficulty_level > 5)
    return { ok: false, reason: 'difficulty_level out of 1-5' }
  if (!q.body?.answer) return { ok: false, reason: 'missing answer' }
  if (!q.subject || !q.topic) return { ok: false, reason: 'missing subject/topic' }
  return { ok: true }
}

// seed difficulty_value = กลาง band ของ level (cold-start prior §5.1); frozen=true จนมีหลักฐาน
function seedDifficultyValue(level: number): number {
  return level // band กลาง = level เอง (scale tune ภายหลัง)
}

export async function importSeed(path: string) {
  const items: SeedQuestion[] = JSON.parse(readFileSync(path, 'utf-8'))
  const valid = items.filter((q) => validateSeedQuestion(q).ok)
  const rows = valid.map((q) => ({
    subject: q.subject, topic: q.topic,
    difficulty_level: q.difficulty_level,
    difficulty_value: seedDifficultyValue(q.difficulty_level),
    difficulty_frozen: true,
    confidence_score: 90,   // seed = พี่ verify มือ → ขึ้น mock-eligible ได้เลย
    mock_eligible: true,
    body: q.body,
  }))
  const db = createAdminClient()
  const { error } = await db.from('questions').insert(rows)
  if (error) throw error
  return { imported: rows.length, skipped: items.length - valid.length }
}

// CLI: pnpm tsx scripts/import-seed.ts <path.json>
if (process.argv[2]) {
  importSeed(process.argv[2]).then((r) => console.log('seed import:', r))
}
