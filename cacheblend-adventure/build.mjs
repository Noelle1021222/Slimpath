// Bundles src/ into a single self-contained page.
//   node build.mjs                      -> index.html (standalone document)
//   node build.mjs --artifact out.html  -> also writes the body-only variant used for publishing
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const css = readFileSync(join(src, 'style.css'), 'utf8');
const js = readdirSync(join(src, 'js')).filter((f) => f.endsWith('.js')).sort()
  .map((f) => `// ---- ${f} ----\n` + readFileSync(join(src, 'js', f), 'utf8')).join('\n');
const page = readFileSync(join(src, 'page.html'), 'utf8')
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => js);

const reset = ':root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';
const standalone = '<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>' + reset + '</style>\n</head>\n<body>\n' + page + '</body>\n</html>\n';
writeFileSync(join(root, 'index.html'), standalone);
const i = process.argv.indexOf('--artifact');
if (i > 0 && process.argv[i + 1]) writeFileSync(process.argv[i + 1], page);
console.log('built', (standalone.length / 1024).toFixed(0) + ' KB', js.split('\n').length + ' lines of JS');
