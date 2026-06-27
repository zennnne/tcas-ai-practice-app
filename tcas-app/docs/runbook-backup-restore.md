# Runbook: Supabase Backup & Restore

Solo-founder ops reference. Last updated: 2026-06-27.

---

## 1. What Supabase backs up automatically

| Plan | Backup type | Frequency | Retention |
|------|-------------|-----------|-----------|
| Free | Daily snapshot | 1/day | 7 days |
| Pro | Daily snapshot + PITR | 1/day + continuous WAL | 7 days (extendable) |

**PITR (Point-in-Time Recovery)** lets you restore to any second within the retention window — critical if a bad migration or accidental delete is discovered hours later.

> **Human decision required:** Check current plan at https://supabase.com/dashboard → Project → Settings → Add-ons. If on Free, decide whether PITR cost ($100/month on Pro) is justified given current runway (~80k worst-case per financial model).

---

## 2. What data is at risk

| Table group | Recovery path if lost |
|-------------|----------------------|
| `questions` (content) | **Export script** below + DB restore |
| `user_calibration`, `user_attempts` | DB restore only (no export script) |
| `subscriptions`, `token_ledger` | DB restore only; Omise is source-of-truth for payments |
| `auth.users` | DB restore only |

The question bank (`questions`) is the most expensive asset to recreate. The export script provides an **independent off-site copy** separate from Supabase backups.

---

## 3. Export the question bank (agent-implemented)

Run from `tcas-app/`:

```bash
pnpm tsx scripts/export-seed.ts <output-path.json>
```

Example:

```bash
pnpm tsx scripts/export-seed.ts backups/questions-$(date +%Y-%m-%d).json
```

Output: `SeedQuestion[]` JSON, round-trippable with `import-seed.ts`.

**Re-import after a restore:**

```bash
pnpm tsx scripts/import-seed.ts backups/questions-2026-06-27.json
```

> Note: re-import sets `confidence_score=90` and `mock_eligible=true` for all rows (seed defaults). Acceptable for a backup/restore scenario since these were all verified questions.

---

## 4. Restore procedure (Supabase dashboard — human task)

### 4a. Daily snapshot restore

1. Supabase Dashboard → Project → **Backups**
2. Select the backup point you want to restore to
3. Click **Restore** — this creates a new project from the snapshot
4. Update `.env.local` (and Vercel/hosting env vars) with the new project URL + keys
5. Verify: run `pnpm tsx scripts/export-seed.ts verify.json` and check count matches expected

### 4b. PITR restore (Pro plan only)

1. Supabase Dashboard → Project → **Backups** → **Point in Time**
2. Enter the target timestamp (UTC)
3. Click **Restore** — spins up a new project
4. Same step 4–5 as above

### 4c. Manual question-bank restore (last resort)

If only `questions` table data is lost (e.g. accidental `DELETE` via bad query):

```bash
# Import the most recent JSON backup
pnpm tsx scripts/import-seed.ts backups/questions-<date>.json
```

This works because the export/import scripts are content-only and do not touch user data.

---

## 5. Testing the restore (human task — do once before launch)

- [ ] Trigger a restore from a recent snapshot to a **throwaway Supabase project**
- [ ] Point `.env.local` at the throwaway project
- [ ] Run `pnpm tsx scripts/export-seed.ts verify.json` → check row count matches production
- [ ] Run `pnpm supabase db reset` on the throwaway project to verify migrations apply cleanly
- [ ] Record actual RTO (time taken): ____________ minutes
- [ ] Delete the throwaway project after the test

---

## 6. Human-only decisions not covered here

- Whether to upgrade to Pro for PITR (cost vs. runway tradeoff)
- Setting backup retention window beyond 7 days
- Off-site backup to S3/GCS (not needed at current scale; revisit at 1k MAU)
- Disaster recovery for auth.users and payment records (Omise is source-of-truth for payments)
