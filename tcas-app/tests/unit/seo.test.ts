import { describe, it, expect } from 'vitest'
import sitemapFn from '@/app/sitemap'
import robotsFn from '@/app/robots'

// ─── Sitemap ─────────────────────────────────────────────────

describe('sitemap', () => {
  it('includes the landing page root', () => {
    const urls = sitemapFn().map((e) => e.url)
    // root: either bare domain or trailing slash
    expect(urls.some((u) => /tcas\.ai\/?$/.test(u))).toBe(true)
  })

  it('includes the upgrade / pricing page', () => {
    const urls = sitemapFn().map((e) => e.url)
    expect(urls.some((u) => u.includes('/upgrade'))).toBe(true)
  })

  it('excludes auth-required routes', () => {
    const joined = sitemapFn().map((e) => e.url).join(',')
    for (const priv of ['/practice', '/mock', '/social', '/login', '/signup', '/api']) {
      expect(joined).not.toContain(priv)
    }
  })

  it('each entry has a priority between 0 and 1', () => {
    for (const entry of sitemapFn()) {
      if (entry.priority !== undefined) {
        expect(entry.priority).toBeGreaterThan(0)
        expect(entry.priority).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ─── Robots ──────────────────────────────────────────────────

describe('robots', () => {
  it('provides a sitemap URL', () => {
    const r = robotsFn()
    expect(r.sitemap).toBeTruthy()
    expect(typeof r.sitemap === 'string' ? r.sitemap : '').toContain('/sitemap.xml')
  })

  it('disallows auth-required and API routes', () => {
    const r = robotsFn()
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules]
    const disallowed = rules
      .flatMap((rule) => (Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []))
      .join(',')

    for (const priv of ['/practice', '/mock', '/social', '/login', '/signup', '/api']) {
      expect(disallowed).toContain(priv)
    }
  })

  it('allows landing and upgrade', () => {
    const r = robotsFn()
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules]
    const allowed = rules
      .flatMap((rule) => (Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : []))
      .join(',')

    expect(allowed).toContain('/')
    expect(allowed).toContain('/upgrade')
  })
})
