// Lint chapters against the handbook's authoring rules (see AUTHORING.md).
// Usage: node tools/check.mjs [chapters/NN-slug.html ...]   (default: every chapter)
// Exit code 1 when any ERROR is found. WARN lines are advice.
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
ctx.HB = ctx.window.HB = {};
vm.createContext(ctx);
for (const f of ["assets/js/curriculum.js", "assets/js/glossary-data.js"]) {
  vm.runInContext((await readFile(join(ROOT, f), "utf8")).replace(/window\.HB = window\.HB \|\| \{\};/, ""), ctx);
}
const HB = ctx.HB;
const glossary = HB.glossary || {};
const alias = HB.glossaryAlias || {};
const WIDGETS = new Set([
  "margin", "quadrant", "ladder", "allocation", "sizing",
  "compound", "recovery", "tradecost", "pointpct", "candle", "ma", "pe", "bond", "yieldcurve", "discount", "fxreturn",
  "futures", "payoff", "vixcurve", "positioning", "squeeze", "scenario", "riskscore", "terminal", "validation", "timeline",
]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const SVG_SELF = /\/>\s*$/;

const args = process.argv.slice(2);
const files = args.length ? args.map((a) => resolve(a)) : (await readdir(join(ROOT, "chapters"))).filter((f) => f.endsWith(".html")).sort().map((f) => join(ROOT, "chapters", f));

const idsByFile = new Map();
async function idsOf(file) {
  if (!idsByFile.has(file)) {
    const html = existsSync(file) ? await readFile(file, "utf8") : "";
    idsByFile.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsByFile.get(file);
}

let errors = 0;
const unknownTerms = new Map();
for (const file of files) {
  const html = await readFile(file, "utf8");
  const out = [];
  const err = (m) => { out.push("  ERROR " + m); errors++; };
  const warn = (m) => out.push("  warn  " + m);
  const name = basename(file);

  // identity
  const slug = (html.match(/<body[^>]*data-chapter="([^"]+)"/) || [])[1];
  const ch = HB.chapters.find((c) => c.slug === slug);
  if (!slug || !ch) err(`body data-chapter "${slug}" is not in curriculum.js`);
  else if (name !== slug + ".html") err(`file name should be ${slug}.html`);

  // head
  for (const need of ["assets/css/handbook.css", "assets/js/curriculum.js", "assets/js/handbook.js", "assets/js/widgets.js", "assets/js/widgets-plan.js", "assets/js/widgets-basics.js", "assets/js/widgets-markets.js", "assets/js/glossary-data.js", "assets/js/data-plan.js", "assets/favicon.svg"]) {
    if (!html.includes("../" + need)) err(`<head> is missing ../${need}`);
  }
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  scripts.filter((s) => /^https?:/.test(s)).forEach((s) => err(`external script not allowed: ${s}`));

  // structure
  if (!/<header class="opener">/.test(html)) err("missing <header class=\"opener\">");
  if (!/<h1>[^<]+<\/h1>/.test(html)) err("missing <h1>");
  const objectives = (html.match(/<section class="objectives"[\s\S]*?<\/section>/) || [""])[0];
  const objCount = (objectives.match(/<li>/g) || []).length;
  if (objCount < 4) err(`objectives: ${objCount} items (need 4–6)`);
  const prose = (html.match(/<article class="prose">([\s\S]*?)<\/article>/) || [, ""])[1];
  const sections = [...prose.matchAll(/<section id="([^"]+)">\s*<h2><span class="sec-num">([^<]+)<\/span>([^<]+)<\/h2>/g)];
  const rawSections = (prose.match(/<section\b/g) || []).length;
  if (sections.length < 5) err(`prose: ${sections.length} well-formed sections (need ≥5; each <section id> + <h2><span class="sec-num">N.k</span>…)`);
  if (rawSections !== sections.length) warn(`${rawSections - sections.length} <section> without the standard id/h2/sec-num pattern`);
  if (ch) sections.forEach((m, i) => { if (m[2].trim() !== `${ch.n}.${i + 1}`) err(`section ${i + 1} number "${m[2]}" should be ${ch.n}.${i + 1}`); });
  const recap = (html.match(/<section class="recap"[\s\S]*?<\/section>/) || [""])[0];
  if ((recap.match(/<li>/g) || []).length < 4) err("recap: need ≥4 <li>");
  const quizzes = [...html.matchAll(/<div class="quiz" data-answer="([a-f])">([\s\S]*?)<\/div>\s*(?=<div class="quiz"|<\/section>)/g)];
  if (quizzes.length < 4) err(`quiz: ${quizzes.length} questions (need 4–6)`);
  quizzes.forEach((q, i) => {
    const opts = (q[2].match(/<ol class="opts">([\s\S]*?)<\/ol>/) || [, ""])[1];
    const n = (opts.match(/<li>/g) || []).length;
    const idx = "abcdef".indexOf(q[1]);
    if (n < 3) err(`quiz ${i + 1}: ${n} options`);
    if (idx >= n) err(`quiz ${i + 1}: answer ${q[1]} but only ${n} options`);
    if (!/class="explain"/.test(q[2])) err(`quiz ${i + 1}: missing .explain`);
  });
  const answers = quizzes.map((q) => q[1]);
  if (answers.length >= 4 && new Set(answers).size === 1) warn(`every quiz answer is "${answers[0]}" — vary the position`);

  // prose length (CJK characters inside the article)
  const text = prose.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "");
  const cjk = (text.match(/[㐀-鿿]/g) || []).length;
  if (cjk < 3500) warn(`prose has ${cjk} CJK characters (target 4,000–8,000)`);

  // figures
  const figs = [...html.matchAll(/<figure class="fig([^"]*)">([\s\S]*?)<\/figure>/g)];
  if (figs.length < 3) warn(`${figs.length} figures (target 3–6)`);
  const markerIds = new Set();
  figs.forEach((f, i) => {
    const wide = /\bwide\b/.test(f[1]);
    const body = f[2];
    const svg = (body.match(/<svg[\s\S]*?<\/svg>/) || [""])[0];
    const tag = `figure ${i + 1}`;
    if (!svg) { err(`${tag}: no <svg>`); return; }
    const vb = (svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) || []);
    if (!vb.length) err(`${tag}: svg needs viewBox="0 0 W H"`);
    const w = parseFloat(vb[1]);
    if (!wide && w > 420) err(`${tag}: viewBox width ${w} > 420 (use ≤420, or class="fig wide" + .fig-scroll with --fig-min)`);
    if (wide && w > 420 && !/class="fig-scroll"/.test(body)) err(`${tag}: wide figure must wrap the svg in <div class="fig-scroll" style="--fig-min:…px">`);
    if (!/role="img"/.test(svg) || !/aria-label="[^"]{6,}"/.test(svg)) err(`${tag}: svg needs role="img" and a descriptive aria-label`);
    if (!/<figcaption><span class="fig-n"><\/span>/.test(body)) err(`${tag}: figcaption must start with <span class="fig-n"></span>`);
    if (/(fill|stroke|stop-color|color)="#[0-9a-fA-F]{3,8}"/.test(svg) || /style="[^"]*#[0-9a-fA-F]{3,6}/.test(svg)) err(`${tag}: literal colour in svg — use the drawing classes (f-*, s-*, t-*)`);
    if (/(fill|stroke)="(white|black|red|green|blue|gray|grey)"/i.test(svg)) err(`${tag}: named colour in svg — use the drawing classes`);
    if (/<(script|style|foreignObject)\b/.test(svg)) err(`${tag}: no <script>/<style>/<foreignObject> inside svg`);
    for (const m of svg.matchAll(/<marker[^>]*id="([^"]+)"/g)) { if (markerIds.has(m[1])) err(`${tag}: duplicate marker id ${m[1]}`); markerIds.add(m[1]); }
    const small = [...svg.matchAll(/font-size="([\d.]+)"/g)].filter((m) => parseFloat(m[1]) < 11);
    if (small.length) err(`${tag}: font-size below 11 in svg`);
    const texts = (svg.match(/<text\b/g) || []).length;
    if (texts < 2) warn(`${tag}: only ${texts} text labels — label the mechanism`);
  });

  // ids
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dup.length) err(`duplicate ids: ${[...new Set(dup)].join(", ")}`);

  // links
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|data:)/.test(href)) continue;
    const [path, frag] = href.split("#");
    let target = path ? resolve(dirname(file), path) : file;
    if (path && !existsSync(target)) { err(`broken link: ${href}`); continue; }
    if (frag && target.endsWith(".html")) {
      const tids = await idsOf(target);
      if (target === file) { if (!ids.includes(frag)) err(`broken anchor: ${href}`); }
      else if (!tids.has(frag) && !target.endsWith("glossary.html") && !target.endsWith("index.html")) err(`broken anchor: ${href}`);
    }
  }

  // widgets
  for (const m of html.matchAll(/data-widget="([^"]+)"/g)) if (!WIDGETS.has(m[1])) err(`unknown widget "${m[1]}"`);

  // glossary terms
  for (const m of html.matchAll(/<span class="term"(?: data-term="([^"]+)")?>([^<]+)<\/span>/g)) {
    const key = m[1] || m[2];
    if (!glossary[key] && !(alias[key] && glossary[alias[key]])) {
      unknownTerms.set(key, (unknownTerms.get(key) || new Set()).add(name));
    }
  }

  // tag balance (outside svg/script)
  const stripped = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const stack = [];
  for (const m of stripped.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?>/g)) {
    const tagName = m[1].toLowerCase();
    const isClose = m[0][1] === "/";
    if (VOID.has(tagName) || (!isClose && SVG_SELF.test(m[0])) || tagName === "!doctype") continue;
    if (!isClose) stack.push(tagName);
    else {
      const top = stack.pop();
      if (top !== tagName) { err(`tag mismatch: </${tagName}> closes <${top}> near “${stripped.slice(Math.max(0, m.index - 60), m.index).replace(/\s+/g, " ")}”`); break; }
    }
  }
  if (stack.length && !(stack.length === 0)) {
    const left = stack.filter((t) => !["html", "body", "head"].includes(t));
    if (left.length) err(`unclosed tags: ${left.join(", ")}`);
  }

  // emoji as decoration
  if (/[\u{1F300}-\u{1FAFF}]/u.test(prose)) warn("emoji in prose — use <span class=\"sig g\">綠燈</span> etc. for GCFIE lights");

  console.log(`${name}  ·  ${sections.length} sections · ${figs.length} figs · ${quizzes.length} quiz · ${cjk} 字${out.length ? "\n" + out.join("\n") : ""}`);
}
if (unknownTerms.size) {
  console.log(`\nterms not in glossary yet (${unknownTerms.size}):`);
  for (const [k, v] of unknownTerms) console.log(`  ${k}  ← ${[...v].join(", ")}`);
}
process.exitCode = errors ? 1 : 0;
