#!/usr/bin/env node
/**
 * Renders public/og-image.png (1200×630) — the link preview used by LINE,
 * Facebook, Slack and X. Re-run after changing the headline or brand colours:
 *
 *   node scripts/og-image.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const html = /* html */ `<!doctype html>
<html lang="zh-Hant-TW"><head><meta charset="utf-8" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Noto+Sans+TC:wght@700&family=Noto+Serif+TC:wght@900&display=block" />
<style>
  * { margin: 0; box-sizing: border-box }
  body { width: 1200px; height: 630px; overflow: hidden; background: #fbf6ef; font-family: 'Noto Sans TC', sans-serif; color: #2b1f18; position: relative }
  .fruit { position: absolute; right: -150px; top: 70px; width: 640px; filter: drop-shadow(0 50px 70px rgba(196,84,31,.3)) }
  .wrap { position: absolute; left: 80px; top: 70px; right: 80px }
  .logo { display: flex; align-items: center; gap: 14px; font-family: 'Noto Serif TC', serif; font-weight: 900; font-size: 34px; letter-spacing: .08em }
  .logo small { display: block; font-family: Inter, sans-serif; font-weight: 700; font-size: 14px; letter-spacing: .24em; color: #7a6556; margin-top: 4px }
  h1 { margin-top: 70px; font-family: 'Noto Serif TC', serif; font-weight: 900; font-size: 84px; line-height: 1.16; letter-spacing: -.01em }
  h1 em { font-style: normal; color: #b5481b; position: relative }
  h1 em::after { content: ''; position: absolute; left: -2%; right: -2%; bottom: .02em; height: .1em; border-radius: 99px; background: #e9803f; z-index: -1 }
  p { margin-top: 34px; font-size: 26px; font-weight: 700; color: #5c4a3e; letter-spacing: .04em }
  .tag { position: absolute; left: 80px; bottom: 56px; font-family: 'Noto Serif TC', serif; font-weight: 900; font-size: 24px; letter-spacing: .06em; color: #8e3510 }
</style></head>
<body>
  <svg class="fruit" viewBox="0 0 400 400">
    <defs>
      <radialGradient id="b" cx="36%" cy="34%" r="78%"><stop offset="0" stop-color="#ffd7a3"/><stop offset=".28" stop-color="#f6a45e"/><stop offset=".62" stop-color="#e7783a"/><stop offset="1" stop-color="#b9481c"/></radialGradient>
      <radialGradient id="s" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="la" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d8a4c"/><stop offset="1" stop-color="#2f5a2e"/></linearGradient>
      <linearGradient id="lb" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#77a05a"/><stop offset="1" stop-color="#3e6b3a"/></linearGradient>
    </defs>
    <path d="M200 92c86 0 160 54 160 132 0 80-68 136-160 136S40 304 40 224c0-78 74-132 160-132Z" fill="url(#b)"/>
    <ellipse cx="128" cy="168" rx="58" ry="30" fill="url(#s)" transform="rotate(-30 128 168)"/>
    <path d="M200 112c-14-48-62-76-116-68 14 46 62 76 116 68Z" fill="url(#la)"/>
    <path d="M200 112c14-48 62-76 116-68-14 46-62 76-116 68Z" fill="url(#lb)"/>
    <path d="M200 114V46" stroke="#2f5a2e" stroke-width="14" stroke-linecap="round"/>
  </svg>
  <div class="wrap">
    <div class="logo">
      <svg viewBox="0 0 48 48" width="56" height="56"><defs><radialGradient id="m" cx="34%" cy="30%" r="80%"><stop offset="0" stop-color="#f7b267"/><stop offset=".55" stop-color="#ea7d3c"/><stop offset="1" stop-color="#c4541f"/></radialGradient></defs><path d="M24 14.5c10.2 0 18 6.6 18 15.6C42 39.4 34.4 45 24 45S6 39.4 6 30.1C6 21.1 13.8 14.5 24 14.5Z" fill="url(#m)"/><path d="M24 17.2c-1.6-5.9-7.2-9.2-13.3-8.2 1.5 5.6 6.9 9 13.3 8.2Z" fill="#3e6b3a"/><path d="M24 17.2c1.6-5.9 7.2-9.2 13.3-8.2-1.5 5.6-6.9 9-13.3 8.2Z" fill="#557f45"/><path d="M24 17.5V9.8" stroke="#3e6b3a" stroke-width="2.4" stroke-linecap="round"/></svg>
      <span>銀髮伴<small>SILVERCOMPANION</small></span>
    </div>
    <h1>你不在身邊的時候，<br />有人<em>陪著</em>他們。</h1>
    <p>實名審核的陪伴者・即時位置・數位聯絡簿・一鍵 SOS</p>
  </div>
  <div class="tag">柿柿如意，陪伴如常。</div>
</body></html>`

const fallback = '/opt/pw-browsers/chromium'
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (existsSync(fallback) ? fallback : undefined),
  args: proxy ? [`--proxy-server=${proxy}`] : [],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
const out = resolve(root, 'public/og-image.png')
await page.screenshot({ path: out, type: 'png' })
console.log(`wrote ${out}`)

// PNG app icons (iOS ignores SVG touch icons; Android installs prefer PNG).
const favicon = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8')
const maskable = readFileSync(resolve(root, 'public/icon-maskable.svg'), 'utf8')
for (const [name, size, svg, bg] of [
  ['apple-touch-icon.png', 180, maskable, '#fbf6ef'],
  ['icon-192.png', 192, favicon, 'transparent'],
  ['icon-512.png', 512, favicon, 'transparent'],
  ['icon-maskable-512.png', 512, maskable, '#fbf6ef'],
]) {
  const icon = await browser.newPage({ viewport: { width: size, height: size } })
  await icon.setContent(`<body style="margin:0;background:${bg}">${svg.replace('<svg', `<svg width="${size}" height="${size}"`)}</body>`)
  await icon.screenshot({ path: resolve(root, 'public', name), omitBackground: bg === 'transparent' })
  await icon.close()
  console.log(`wrote public/${name}`)
}
await browser.close()
