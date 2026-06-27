import { writeFileSync } from 'node:fs'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SeedQuestion } from './import-seed'

/** Map a DB row to the SeedQuestion wire format (round-trippable with import-seed). */
export function toSeedQuestion(row: {
  subject: string
  topic: string
  difficulty_level: number
  body: unknown
}): SeedQuestion {
  return {
    subject: row.subject,
    topic: row.topic,
    difficulty_level: row.difficulty_level,
    body: row.body as SeedQuestion['body'],
  }
}

/**
 * Export active questions from the DB to a JSON file (SeedQuestion[] format).
 * The output is round-trippable with import-seed.ts.
 *
 * Note: filters status='active' by default. To export suspended questions as well,
 * remove the .eq('status', 'active') filter below before running.
 */
export async function exportSeed(outPath: string) {
  const db = createAdminClient()
  const { data, error } = await db
    .from('questions')
    .select('subject, topic, difficulty_level, body')
    .eq('status', 'active')
  if (error) throw error
  const questions = (data ?? []).map((row) =>
    toSeedQuestion(row as { subject: string; topic: string; difficulty_level: number; body: unknown })
  )
  writeFileSync(outPath, JSON.stringify(questions, null, 2))
  return { exported: questions.length }
}

// CLI: pnpm tsx scripts/export-seed.ts <out.json>
if (process.argv[2]) {
  exportSeed(process.argv[2]).then((r) => console.log('seed export:', r))
}
