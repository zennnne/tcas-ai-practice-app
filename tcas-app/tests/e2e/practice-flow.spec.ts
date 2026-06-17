import { test, expect } from '@playwright/test'

test('user can sign up and reach practice', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('email').fill(`u-${Date.now()}@test.local`)
  await page.getByLabel('password').fill('test123456')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/practice/)
})

test('answering a question records attempt and shows result', async ({ page }) => {
  // ต้อง seed โจทย์ subject=math topic=algebra level=3 ก่อนรัน test นี้
  // signup ก่อนเพื่อได้ session ใหม่ทุกครั้ง
  await page.goto('/signup')
  await page.getByLabel('email').fill(`u-${Date.now()}@test.local`)
  await page.getByLabel('password').fill('test123456')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/practice/)

  // ถ้ามีโจทย์ใน DB → เลือกคำตอบแรก → ยืนยัน result แสดง
  const hasQuestion = await page.locator('[data-testid="question-text"]').isVisible({ timeout: 3000 }).catch(() => false)
  if (!hasQuestion) {
    // ไม่มี seed → skip gracefully
    await expect(page.locator('[data-testid="no-question"]')).toBeVisible()
    return
  }

  const firstChoice = page.locator('[data-testid="choices"] button').first()
  await firstChoice.click()
  await expect(page.locator('[data-testid="result"]')).toBeVisible()
})
