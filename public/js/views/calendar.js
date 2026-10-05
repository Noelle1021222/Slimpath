// Calendar: program rail + month grid with per-day completion.
import { api } from '../api.js';
import { $, $$, esc, ring, countUp, revealOnScroll } from '../ui.js';
import { icon } from '../icons.js';
import {
  PHASES, TOTAL_DAYS, CHECKLIST, schedule, locate, todayISO, addDays, diffDays, iso, parseISO, formatLong,
} from '../program.js';

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function heroMarkup(start, today) {
  const loc = locate(start, today);
  const daysUntil = diffDays(start, today);
  if (loc) {
    const p = loc.phase;
    return `
      <p class="eyebrow">Today · ${esc(formatLong(today))}</p>
      <h1 class="cal-title"><span class="phase-word" style="--c:${p.color}">${p.name}</span>
        <span class="cal-sub">第 ${loc.week} 週 · 第 ${loc.dayOfWeek} 天</span></h1>
      <p class="cal-motto">${p.motto}</p>
      <a class="btn btn-primary" href="#/day/${today}"><span>寫今天的日誌</span>${icon.arrow(20)}</a>`;
  }
  if (daysUntil > 0) {
    return `
      <p class="eyebrow">Countdown · 開始日 ${esc(formatLong(start))}</p>
      <h1 class="cal-title"><span class="phase-word" style="--c:var(--adapt)">還有 ${daysUntil} 天</span>
        <span class="cal-sub">調適期即將開始</span></h1>
      <p class="cal-motto">先準備好檸檬、體脂機，清空心裡的空間。</p>
      <a class="btn btn-primary" href="#/day/${start}"><span>預覽第一天</span>${icon.arrow(20)}</a>`;
  }
  return `
    <p class="eyebrow">Completed · ${TOTAL_DAYS} days</p>
    <h1 class="cal-title"><span class="phase-word" style="--c:var(--stable)">恭喜完成</span>
      <span class="cal-sub">十二週的旅程</span></h1>
    <p class="cal-motto">結束不是結束，而是更懂自己的開始。</p>
    <a class="btn btn-primary" href="#/progress"><span>看看你的進度</span>${icon.arrow(20)}</a>`;
}

function railMarkup(start, today, byDate) {
  const phases = schedule(start);
  const todayIdx = diffDays(today, start);
  const ticks = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const date = addDays(start, i);
    const loc = locate(start, date);
    const e = byDate.get(date);
    const score = e && e.checklist_total ? e.checklist_done / CHECKLIST.length : 0;
    const cls = ['tick', i < todayIdx ? 'past' : '', i === todayIdx ? 'now' : '', e ? 'logged' : ''].join(' ');
    ticks.push(`<a class="${cls}" href="#/day/${date}" style="--c:${loc.phase.color};--s:${score.toFixed(2)}" title="${date} · ${loc.phase.name} 第 ${loc.day} 天"></a>`);
  }
  const pct = Math.max(0, Math.min(1, (todayIdx + 0.5) / TOTAL_DAYS));
  return `
    <div class="rail" style="--pct:${pct}">
      <div class="rail-ticks">${ticks.join('')}</div>
      ${todayIdx >= 0 && todayIdx < TOTAL_DAYS ? `<span class="rail-pin" aria-hidden="true"><span>Day ${todayIdx + 1}</span></span>` : ''}
      <div class="rail-labels">
        ${phases.map((p) => `<span style="flex:${p.days};--c:${p.color}"><b>${p.name}</b><em>${p.start.slice(5).replace('-', '/')} – ${p.end.slice(5).replace('-', '/')}</em></span>`).join('')}
      </div>
    </div>`;
}

function monthGrid(year, month, start, today, byDate) {
  const first = new Date(year, month, 1);
  const gridStart = iso(new Date(year, month, 1 - first.getDay()));
  const phaseStarts = new Map(schedule(start).map((p) => [p.start, p]));
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    const d = parseISO(date);
    const inMonth = d.getMonth() === month;
    if (!inMonth && i >= 35) break;
    const loc = locate(start, date);
    const e = byDate.get(date);
    const score = e ? e.checklist_done / CHECKLIST.length : 0;
    const startsPhase = phaseStarts.get(date);
    const classes = ['day', inMonth ? '' : 'out', loc ? 'in-program' : '', date === today ? 'is-today' : '', date < today ? 'is-past' : '', date > today ? 'is-future' : '', e ? 'has-entry' : ''].join(' ');
    const label = `${d.getMonth() + 1}月${d.getDate()}日${loc ? `，${loc.phase.name}第${loc.day}天` : ''}${e ? `，完成 ${e.checklist_done} 項` : ''}`;
    cells.push(`
      <a class="${classes}" href="#/day/${date}" style="${loc ? `--c:${loc.phase.color}` : ''}" aria-label="${label}">
        <span class="day-num">${d.getDate()}</span>
        ${loc ? `<span class="day-meta">D${loc.day}</span>` : ''}
        ${startsPhase ? `<span class="day-flag">${startsPhase.name}</span>` : ''}
        ${loc && (date <= today || e) ? `<span class="day-ring">${ring(score, { size: 30, stroke: 2.5 })}${e && score === 1 ? `<i>${icon.check(14)}</i>` : ''}</span>` : ''}
        ${e ? `<span class="day-dots">${e.weight ? '<i class="dot w" title="體重"></i>' : ''}${e.photo_count ? '<i class="dot p" title="照片"></i>' : ''}${e.water_glasses >= 8 ? '<i class="dot h" title="喝水達標"></i>' : ''}</span>` : ''}
      </a>`);
  }
  return cells.join('');
}

function streak(byDate, start, today) {
  let n = 0;
  let d = byDate.has(today) ? today : addDays(today, -1);
  while (byDate.has(d) && d >= start) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export async function renderCalendar(main, state, monthArg) {
  const start = state.settings.startDate;
  const today = todayISO();
  const end = addDays(start, TOTAL_DAYS - 1);

  let ym = /^\d{4}-\d{2}$/.test(monthArg || '') ? monthArg : null;
  if (!ym) ym = (today < start ? start : today > end ? end : today).slice(0, 7);
  const [year, month] = ym.split('-').map(Number);

  // Fetch the whole program plus the visible month (which may sit outside it).
  const from = [start, `${ym}-01`, addDays(`${ym}-01`, -7)].sort()[0];
  const to = [end, `${ym}-31`, today].sort().at(-1);
  const rows = await api.entries(from, addDays(to, 7));
  const byDate = new Map(rows.map((r) => [r.date, r]));

  const weights = rows.filter((r) => r.weight).sort((a, b) => a.date.localeCompare(b.date));
  const latest = weights.at(-1)?.weight ?? null;
  const base = state.settings.startWeight ?? weights[0]?.weight ?? null;
  const delta = latest !== null && base !== null ? latest - base : null;
  const logged = rows.filter((r) => r.date >= start && r.date <= end);
  const avgWater = logged.length ? logged.reduce((n, r) => n + (r.water_glasses || 0), 0) / logged.length : null;

  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const nextYm = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;

  main.innerHTML = `
  <section class="wrap cal-hero">
    <div class="cal-hero-copy" data-reveal>${heroMarkup(start, today)}</div>
    <div class="stat-grid" data-reveal>
      <div class="stat">
        <span class="stat-label">${icon.scale(16)} 目前體重</span>
        <span class="stat-value"><b data-count="${latest ?? ''}" data-dec="1">${latest ?? '—'}</b><small>kg</small></span>
      </div>
      <div class="stat">
        <span class="stat-label">${icon.chart(16)} 累計變化</span>
        <span class="stat-value ${delta !== null && delta < 0 ? 'good' : ''}"><b>${delta === null ? '—' : (delta > 0 ? '+' : '') + delta.toFixed(1)}</b><small>kg</small></span>
      </div>
      <div class="stat">
        <span class="stat-label">${icon.flame(16)} 連續紀錄</span>
        <span class="stat-value"><b data-count="${streak(byDate, start, today)}">${streak(byDate, start, today)}</b><small>天</small></span>
      </div>
      <div class="stat">
        <span class="stat-label">${icon.leaf(16)} 平均飲水</span>
        <span class="stat-value"><b>${avgWater === null ? '—' : Math.round(avgWater * 250).toLocaleString()}</b><small>ml</small></span>
      </div>
    </div>
  </section>

  <section class="wrap" data-reveal>
    ${railMarkup(start, today, byDate)}
  </section>

  <section class="wrap cal-section">
    <div class="sheet cal-sheet" data-reveal>
      <header class="cal-head">
        <div>
          <p class="eyebrow">${EN_MONTHS[month - 1]} ${year}</p>
          <h2 class="h1 month-title">${year} <span>${MONTHS[month - 1]}</span></h2>
        </div>
        <div class="cal-nav">
          <a class="icon-btn" href="#/calendar/${prevYm}" aria-label="上個月">${icon.left(20)}</a>
          <a class="chip" href="#/calendar/${today.slice(0, 7)}">本月</a>
          <a class="icon-btn" href="#/calendar/${nextYm}" aria-label="下個月">${icon.right(20)}</a>
        </div>
      </header>
      <div class="weekdays" aria-hidden="true">${['日', '一', '二', '三', '四', '五', '六'].map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="month" id="month">${monthGrid(year, month - 1, start, today, byDate)}</div>
      <footer class="legend">
        ${PHASES.map((p) => `<span class="legend-item"><i style="background:${p.color}"></i>${p.name} ${p.weeks} 週</span>`).join('')}
        <span class="legend-item"><i class="dot w"></i>體重</span>
        <span class="legend-item"><i class="dot p"></i>照片</span>
        <span class="legend-item"><i class="dot h"></i>喝水達標</span>
      </footer>
    </div>
  </section>`;

  $$('[data-count]', main).forEach((el) => {
    const v = el.dataset.count;
    if (v !== '') countUp(el, Number(v), { decimals: Number(el.dataset.dec || 0) });
  });
  revealOnScroll(main);
}
