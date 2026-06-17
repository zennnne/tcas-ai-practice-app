import { test, expect } from '@playwright/test'

test('user can sign up and reach practice', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('email').fill(`u-${Date.now()}@test.local`)
  await page.getByLabel('password').fill('test123456')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/practice/)
})
