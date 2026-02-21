import { test, expect } from '@playwright/test'

test.use({ baseURL: 'http://localhost:5209' })

test('editor content appears on first note click', async ({ page }) => {
  const logs: string[] = []
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`))

  await page.goto('/')
  // Wait for note list to load
  await page.waitForSelector('.app__note-list .cursor-pointer', { timeout: 15000 })
  await page.waitForTimeout(200)

  // Click the FIRST note in the note list (not sidebar)
  const noteList = page.locator('.app__note-list')
  const firstNote = noteList.locator('.cursor-pointer').first()
  const noteText = await firstNote.locator('.truncate').textContent().catch(() => 'unknown')
  console.log('Clicking note:', noteText)
  await firstNote.click()

  // Check at 500ms
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/debug-after-500ms.png', fullPage: true })
  const pm = page.locator('.ProseMirror')
  const pmText500 = await pm.textContent().catch(() => '')
  console.log('After 500ms - ProseMirror text length:', pmText500?.length)
  console.log('After 500ms - ProseMirror text:', JSON.stringify(pmText500?.substring(0, 100)))

  // Check at 3s
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'test-results/debug-after-3000ms.png', fullPage: true })
  const pmText3000 = await pm.textContent().catch(() => '')
  console.log('After 3000ms - ProseMirror text length:', pmText3000?.length)
  console.log('After 3000ms - ProseMirror text:', JSON.stringify(pmText3000?.substring(0, 100)))

  // Print errors and relevant logs
  console.log('\n--- Browser errors ---')
  for (const log of logs) {
    if (log.includes('[error]') || log.includes('Failed') || log.includes('flushSync')) {
      console.log(log)
    }
  }

  // THE BUG: content should appear
  expect(pmText3000?.trim().length, 'Editor content should not be empty after 3s').toBeGreaterThan(5)
})
