# Launch Checklist — TCAS AI Practice App

Human tasks required before the app can open for real. Everything here is
**code-complete but needs a person** — sign up for a service, paste a key, make
a call, or run a manual step. The code side of each is already merged to `main`
(GitHub issues closed); this doc tracks the part GitHub can't.

Last updated: 2026-07-04 · Owner: Zen (solo founder)

---

## 🔴 0. Showstoppers — no launch without these (not in any issue)

These block a *real* launch even though the app scaffolding is done. They are a
separate track from the pre-launch hardening below.

- [ ] **Question bank (seed content)** — DB has schema but zero questions.
      Produce a `SeedQuestion[]` JSON and import it:
      `pnpm tsx scripts/import-seed.ts <path>`. Without this, practice/mock are empty.
- [ ] **AI generation pipeline** — the Claude gen → blind-solve verify → promote
      pipeline is designed but not built. Until it exists the bank can't grow
      past hand-seeded content. The cost-guardrail seam
      (`src/lib/cost-guardrail/guardrail.ts`) is waiting for it to call
      `checkAndRecordSpend` before each AI call.

---

## ☁️ 1. Provision production infrastructure — REQUIRED

- [ ] **Supabase prod project** — create at supabase.com → copy URL + anon +
      service-role keys into prod env.
- [ ] **Apply migrations** to the prod project (`0001`–`0015`). Verify with a
      row count / `pnpm supabase db reset` on a throwaway first.
- [ ] **Domain** — point `NEXT_PUBLIC_SITE_URL` at the real domain (OG images,
      sitemap, canonical URLs depend on it).
- [ ] **CRON_SECRET** — generate a random string (`openssl rand -hex 32`) to
      protect `/api/jobs/*`; give the same value to whatever calls the cron jobs.

---

## 🔑 2. Sign up for services + paste keys — per closed issue

Each row = a `ready-for-agent` issue whose **code shipped** but whose **account
+ keys are still on you**. Env var names match `.env.example`.

| Done | Service | Issue | Action | Env vars |
|------|---------|-------|--------|----------|
| [ ] | **Omise** (payment) | billing | Merchant account → keys; pass Omise 3-phase verification; set webhook → `/api/webhooks/omise` | `NEXT_PUBLIC_OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY`, `OMISE_WEBHOOK_SECRET` |
| [ ] | **Upstash Redis** | #3 | Create free Redis DB → REST URL + token. ⚠️ Also required for the cost guardrail to work at all | `UPSTASH_REDIS_REST_URL/TOKEN` |
| [ ] | **Sentry** | #5 | Create project → DSN; add CI token for source maps | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN/ORG/PROJECT` |
| [ ] | **Resend** | #6 | Account + **verify sending domain** → API key | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| [ ] | **PostHog** | #11 | Create project → API key + host | `NEXT_PUBLIC_POSTHOG_KEY/HOST` |
| [ ] | **UptimeRobot** (or equiv) | #7 | External monitor pinging `/api/health`, alert on non-2xx | — (no env) |
| [ ] | **Anthropic** | — | Billing + API key (for the gen pipeline, once built) | `ANTHROPIC_API_KEY` |

---

## ⚖️ 3. Human-decision / judgment tasks — can't be automated

- [ ] **Legal pages + PDPA** (#4, still open) — write real privacy/terms wording,
      PDPA consent copy, and the **parental-consent mechanism for under-20 users**
      (`src/app/(auth)/signup/page.tsx`, `src/lib/consent/consent.ts`). Needs legal
      advice before building the parental-consent flow.
- [ ] **Supabase backup policy** (#9, still open) — decide whether **PITR
      ($100/month on Pro)** is worth it at current runway. See
      `docs/runbook-backup-restore.md`.
- [ ] **Test a restore once before launch** — trigger a snapshot restore to a
      throwaway project, verify row count + migrations, record RTO, delete it
      (runbook §5).
- [ ] **Cost guardrail caps** (#8) — the defaults (`ai_call` soft 500 / hard 1000,
      `ai_tokens` soft 5M / hard 10M per day) are **placeholders**, not a budget.
      Set real numbers from the financial model + actual per-question token cost
      via `COST_GUARDRAIL_*` env vars (no code change). See
      `src/lib/cost-guardrail/guardrail.ts`.
- [ ] **Supabase usage alerts** — enable the dashboard's own alerts for DB rows /
      storage / egress (not covered by app code).

---

## 🔁 4. Operational — ongoing after launch (human)

- [ ] **Content spot-check** — the core invariant "2 models agreeing ≠ correct."
      A human must spot-check questions at the mock / 90+ tier, review
      `candidate`-flagged promotions (`supabase/migrations/0010_promote_job.sql`),
      and handle mock-eligible questions reported down below confidence 90
      (`src/lib/quality/routing.ts`) — these route to human review, not auto-remove.

---

## Notes

- Closing a pre-launch issue meant **code merged**, not **launch-ready** — this
  doc is the gap between the two.
- `.env.example` lists every var above with a where-to-get-it comment.
- Issues still open on GitHub: **#4** (legal/PDPA) and **#9** (backup) — both
  `ready-for-human`, both mirrored in §3 here.
