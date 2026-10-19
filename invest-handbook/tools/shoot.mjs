// Screenshot pages at phone and desktop widths, light and dark, and report
// console errors, failed requests and horizontal overflow.
// Usage: node tools/shoot.mjs [outDir] [page ...]   (pages relative to the handbook root)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// playwright may be installed locally or globally (NODE_PATH)
let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || "shots");
const pages = process.argv.slice(3).length ? process.argv.slice(3) : ["index.html"];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png" };

const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = join(ROOT, p.endsWith("/") ? p + "index.html" : p);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(0);
const port = server.address().port;
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
const configs = [
  { name: "phone", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: "desk", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
];
const schemes = (process.env.SCHEMES || "light,dark").split(",");
const full = process.env.FULL !== "0";
let problems = 0;
for (const page of pages) {
  for (const cfg of configs) {
    for (const scheme of schemes) {
      const ctx = await browser.newContext({ ...cfg, colorScheme: scheme });
      const tab = await ctx.newPage();
      const errors = [];
      tab.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
      tab.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      tab.on("requestfailed", (r) => { if (!r.url().includes("fonts.g")) errors.push("requestfailed: " + r.url()); });
      tab.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(`http://localhost:${port}`)) errors.push(`http ${r.status()}: ${r.url()}`); });
      await tab.goto(`http://localhost:${port}/${page}`, { waitUntil: "networkidle" });
      await tab.evaluate(() => document.fonts && document.fonts.ready);
      await tab.waitForTimeout(1200);
      const overflow = await tab.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const bad = [];
        document.querySelectorAll("body *").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width && r.right > w + 1 && getComputedStyle(el).visibility !== "hidden") {
            // ignore content inside horizontal scrollers
            let p = el.parentElement, scroller = false;
            while (p) { const cs = getComputedStyle(p); if ((/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth) || /(hidden|clip)/.test(cs.overflowX)) { scroller = true; break; } p = p.parentElement; }
            if (!scroller) bad.push(el.tagName.toLowerCase() + "." + (el.className && el.className.baseVal === undefined ? String(el.className).split(" ")[0] : "") + " → " + Math.round(r.right));
          }
        });
        return { scrollW: document.documentElement.scrollWidth, w, bad: bad.slice(0, 8) };
      });
      const tag = page.replace(/[\/.]/g, "_") + `-${cfg.name}-${scheme}`;
      await tab.screenshot({ path: join(out, tag + ".png"), fullPage: full });
      const issues = [...errors];
      if (overflow.scrollW > overflow.w + 1 || overflow.bad.length) issues.push(`overflow: scrollWidth ${overflow.scrollW} > ${overflow.w} :: ${overflow.bad.join(" | ")}`);
      if (issues.length) problems += issues.length;
      console.log(`${tag}: ${issues.length ? "\n  - " + issues.join("\n  - ") : "ok"}`);
      await ctx.close();
    }
  }
}
await browser.close();
server.close();
process.exitCode = problems ? 1 : 0;
