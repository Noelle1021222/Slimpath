#!/usr/bin/env node
/**
 * GitHub Pages has no rewrite rules: a deep link such as /seeker/search would
 * 404. Pages serves 404.html for unknown paths, so we ship the SPA shell under
 * that name too and let the client-side router take over.
 */
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const index = resolve(dist, 'index.html')
if (!existsSync(index)) {
  console.error('dist/index.html not found — run the Vite build first.')
  process.exit(1)
}
copyFileSync(index, resolve(dist, '404.html'))
// Serve files that start with an underscore as-is (Jekyll would hide them).
writeFileSync(resolve(dist, '.nojekyll'), '')
console.log('SPA fallback: dist/404.html, dist/.nojekyll')
