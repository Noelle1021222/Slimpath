#!/usr/bin/env node
/**
 * End-to-end smoke test + accessibility audit, run against the in-browser demo
 * backend (no Supabase needed).
 *
 *   npm run e2e                       # starts Vite in demo mode on a free port
 *   E2E_BASE_URL=http://localhost:5173 npm run e2e   # reuse a running server
 *
 * Optional: CHROMIUM_PATH=/path/to/chrome, E2E_HEADED=1, E2E_SKIP_A11Y=1.
 * Exits non-zero when a flow fails or axe reports a serious/critical issue.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const axeSource = require.resolve('axe-core/axe.min.js')

const SEEKER = 'a1111111-0000-4000-8000-000000000001'
const PROVIDER = 'b2222222-0000-4000-8000-000000000001'
const SESSION_KEY = 'silvercompanion:demo-session'

const results = []
const check = async (name, fn) => {
  const started = Date.now()
  try {
    await fn()
    results.push({ name, ok: true, ms: Date.now() - started })
    console.log(`  ✓ ${name} (${Date.now() - started} ms)`)
  } catch (error) {
    results.push({ name, ok: false, error })
    console.log(
      `  ✗ ${name}\n    ${String(error?.message ?? error)
        .split('\n')
        .join('\n    ')}`,
    )
  }
}

function freePort() {
  return new Promise((ok, fail) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', fail)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => ok(port))
    })
  })
}

async function waitFor(url, timeoutMs = 60_000) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Server did not start: ${url}`)
}

async function startServer() {
  if (process.env.E2E_BASE_URL) return { base: process.env.E2E_BASE_URL.replace(/\/$/, ''), stop: () => {} }
  const port = await freePort()
  const child = spawn(resolve(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    env: { ...process.env, VITE_DEMO_MODE: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stderr.on('data', (d) => process.env.E2E_VERBOSE && process.stderr.write(d))
  const base = `http://127.0.0.1:${port}`
  await waitFor(base)
  return { base, stop: () => child.kill('SIGTERM') }
}

function launchOptions() {
  const fallback = '/opt/pw-browsers/chromium'
  const executablePath = process.env.CHROMIUM_PATH || (existsSync(fallback) ? fallback : undefined)
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy
  // Keep localhost off the proxy (Playwright's own proxy option would force loopback through it).
  const args = proxy ? [`--proxy-server=${proxy}`, '--proxy-bypass-list=127.0.0.1;localhost'] : []
  return { executablePath, args, headless: !process.env.E2E_HEADED }
}

async function asRole(context, role) {
  const page = await context.newPage()
  if (role) await page.addInitScript(([key, id]) => sessionStorage.setItem(key, id), [SESSION_KEY, role === 'seeker' ? SEEKER : PROVIDER])
  page.on('pageerror', (e) => results.push({ name: `page error on ${page.url()}`, ok: false, error: e }))
  return page
}

async function audit(page, label) {
  if (process.env.E2E_SKIP_A11Y) return
  await page.addScriptTag({ path: axeSource })
  const { violations } = await page.evaluate(() =>
    // eslint-disable-next-line no-undef
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }),
  )
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  for (const v of violations) {
    const where = v.nodes
      .slice(0, 3)
      .map((n) => n.target.join(' '))
      .join(' | ')
    console.log(`    ${blocking.includes(v) ? '!' : '·'} [${v.impact}] ${v.id}: ${v.help} — ${where}`)
  }
  if (blocking.length) throw new Error(`${label}: ${blocking.length} serious/critical accessibility issue(s)`)
}

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  // Walk the page once so scroll-triggered content is in its final state.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
      scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
    scrollTo(0, 0)
  })
  await page.waitForTimeout(300)
}

const { base, stop } = await startServer()
const browser = await chromium.launch(launchOptions())
console.log(`SilverCompanion e2e → ${base}\n`)

try {
  // Reduced motion: final states render immediately, which is also what axe should judge.
  const contextOptions = { locale: 'zh-TW', timezoneId: 'Asia/Taipei', reducedMotion: 'reduce', viewport: { width: 1280, height: 860 } }

  console.log('Flows')
  await check('landing: hero renders and the demo entry signs in as a family', async () => {
    const context = await browser.newContext(contextOptions)
    const page = await asRole(context, null)
    await page.goto(`${base}/`)
    await page.getByRole('heading', { level: 1 }).filter({ hasText: '有人陪著他們' }).waitFor()
    await page.getByRole('button', { name: '家屬版' }).click()
    await page.waitForURL(/\/seeker$/, { timeout: 15_000 })
    await context.close()
  })

  const shared = await browser.newContext(contextOptions)
  const seeker = await asRole(shared, 'seeker')
  const provider = await asRole(shared, 'provider')

  await check('family: books a companion and pays in cash', async () => {
    await seeker.goto(`${base}/seeker/companions/${PROVIDER}`)
    await seeker.getByRole('heading', { level: 1, name: '小君' }).waitFor()
    await seeker.getByRole('button', { name: '立即預約' }).click()
    const date = seeker.getByLabel('日期', { exact: true })
    await date.waitFor()
    const firstDate = await date.evaluate((el) => [...el.options].find((o) => o.value && !o.disabled)?.value)
    if (!firstDate) throw new Error('no open date in the next two weeks')
    await date.selectOption(firstDate)
    const time = seeker.getByLabel('開始時間', { exact: true })
    const firstHour = await time.evaluate((el) => [...el.options].find((o) => o.value)?.value)
    await time.selectOption(firstHour)
    await seeker.getByRole('button', { name: /^現金/ }).click()
    await seeker.getByRole('button', { name: '確認預約' }).click()
    await seeker.getByRole('heading', { name: '預約已送出！' }).waitFor({ timeout: 10_000 })
  })

  await check('companion: sees the new booking and accepts it', async () => {
    await provider.goto(`${base}/provider/requests`)
    const card = provider.locator('article', { hasText: '家屬：怡君' }).first()
    await card.waitFor({ timeout: 10_000 })
    await card.getByRole('button', { name: '接單' }).click()
    await provider
      .getByText(/已接下/)
      .first()
      .waitFor({ timeout: 10_000 })
  })

  await check('family: the order flips to "已接單" in real time (cross-tab)', async () => {
    await seeker.goto(`${base}/seeker/orders`)
    await seeker.getByText('已接單').first().waitFor({ timeout: 10_000 })
  })

  await check('companion: arrives, writes the care log, finishes the service', async () => {
    await provider.goto(`${base}/provider/schedule`)
    await provider.getByRole('button', { name: '我已抵達' }).first().click()
    await provider
      .getByRole('button', { name: /填寫聯絡簿/ })
      .first()
      .click()
    await provider.getByRole('radio', { name: /開心/ }).click()
    await provider.getByLabel('今天的陪伴紀錄').fill('今天陪陳媽媽回診，醫師說血壓控制得很好。回程一起吃了湯麵，她說好久沒有出門吃飯了。')
    await provider.getByRole('button', { name: '送出聯絡簿並完成服務' }).click()
    await provider.getByText('服務完成，辛苦了！').waitFor({ timeout: 10_000 })
  })

  await check('family: the new care log is in the contact book', async () => {
    await seeker.goto(`${base}/seeker/care-logs`)
    await seeker.getByText('醫師說血壓控制得很好').first().waitFor({ timeout: 10_000 })
  })
  await shared.close()

  console.log('\nAccessibility (axe-core, WCAG 2.2 AA)')
  const routes = [
    [null, '/'],
    [null, '/auth'],
    ['seeker', '/seeker'],
    ['seeker', '/seeker/search'],
    ['seeker', `/seeker/companions/${PROVIDER}`],
    ['seeker', '/seeker/orders'],
    ['seeker', '/seeker/care-logs'],
    ['seeker', '/seeker/messages'],
    ['seeker', '/seeker/profile'],
    ['seeker', '/seeker/profile/family'],
    ['provider', '/provider'],
    ['provider', '/provider/requests'],
    ['provider', '/provider/schedule'],
    ['provider', '/provider/profile'],
  ]
  for (const viewport of [
    { width: 1280, height: 860 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ ...contextOptions, viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 })
    for (const [role, path] of routes) {
      await check(`a11y ${viewport.width}px ${role ?? 'guest'} ${path}`, async () => {
        const page = await asRole(context, role)
        await page.goto(`${base}${path}`)
        await settle(page)
        await audit(page, path)
        await page.close()
      })
    }
    await context.close()
  }
} finally {
  await browser.close()
  stop()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
process.exit(failed.length ? 1 : 0)
