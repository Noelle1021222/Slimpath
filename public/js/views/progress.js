// Progress: weight & body-fat trend, 84-day habit heatmap, averages.
import { api } from '../api.js';
import { $, $$, esc, toast, countUp, revealOnScroll } from '../ui.js';
import { icon, face } from '../icons.js';
import { PHASES, TOTAL_DAYS, CHECKLIST, MOODS, schedule, locate, addDays, diffDays, todayISO, formatShort } from '../program.js';

function trendChart(rows, start, settings) {
  const W = 960;
  const H = 340;
  const pad = { l: 48, r: 56, t: 28, b: 36 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (date) => pad.l + (diffDays(date, start) / (TOTAL_DAYS - 1)) * iw;

  const ws = rows.filter((r) => r.weight !== null);
  const fs = rows.filter((r) => r.body_fat !== null);
  const wVals = ws.map((r) => r.weight).concat(settings.goalWeight ?? [], settings.startWeight ?? []);
  if (!wVals.length) wVals.push(60);
  const wMin = Math.floor(Math.min(...wVals) - 1);
  const wMax = Math.ceil(Math.max(...wVals) + 1);
  const yW = (v) => pad.t + (1 - (v - wMin) / (wMax - wMin || 1)) * ih;
  const fVals = fs.map((r) => r.body_fat);
  const fMin = Math.floor(Math.min(...fVals, 100) - 1);
  const fMax = Math.ceil(Math.max(...fVals, 0) + 1);
  const yF = (v) => pad.t + (1 - (v - fMin) / (fMax - fMin || 1)) * ih;

  // Smooth path (Catmull-Rom → Bézier)
  const smooth = (pts) => {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const wPts = ws.map((r) => [x(r.date), yW(r.weight)]);
  const fPts = fs.map((r) => [x(r.date), yF(r.body_fat)]);
  const wPath = smooth(wPts);
  const area = wPts.length > 1 ? `${wPath} L${wPts.at(-1)[0]},${pad.t + ih} L${wPts[0][0]},${pad.t + ih} Z` : '';

  const bands = schedule(start)
    .map((p) => {
      const x0 = x(p.start);
      const x1 = p.end === addDays(start, TOTAL_DAYS - 1) ? pad.l + iw : x(addDays(p.end, 1));
      return `<rect x="${x0}" y="${pad.t}" width="${x1 - x0}" height="${ih}" fill="${p.color}" opacity=".07"/>
        <text x="${x0 + 10}" y="${pad.t + 18}" class="band-label" fill="${p.color}">${p.name}</text>
        <line x1="${x0}" x2="${x0}" y1="${pad.t}" y2="${pad.t + ih}" class="band-line"/>`;
    })
    .join('');

  const ticks = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = wMin + ((wMax - wMin) * i) / steps;
    ticks.push(`<g><line x1="${pad.l}" x2="${pad.l + iw}" y1="${yW(v)}" y2="${yW(v)}" class="grid"/><text x="${pad.l - 10}" y="${yW(v) + 4}" text-anchor="end" class="axis">${v.toFixed(0)}</text></g>`);
  }
  if (fs.length) {
    for (let i = 0; i <= steps; i++) {
      const v = fMin + ((fMax - fMin) * i) / steps;
      ticks.push(`<text x="${pad.l + iw + 10}" y="${yF(v) + 4}" class="axis fat">${v.toFixed(0)}%</text>`);
    }
  }
  const xTicks = [0, 14, 28, 42, 56, 70, 83]
    .map((d) => `<text x="${x(addDays(start, d))}" y="${H - 10}" text-anchor="middle" class="axis">${formatShort(addDays(start, d))}</text>`)
    .join('');

  const goal = settings.goalWeight
    ? `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${yW(settings.goalWeight)}" y2="${yW(settings.goalWeight)}" class="goal"/>
       <text x="${pad.l + iw - 6}" y="${yW(settings.goalWeight) - 8}" text-anchor="end" class="goal-label">目標 ${settings.goalWeight} kg</text>`
    : '';

  const dots = ws
    .map((r) => `<circle cx="${x(r.date)}" cy="${yW(r.weight)}" r="3.5" class="pt"><title>${r.date} · ${r.weight} kg</title></circle>`)
    .join('');
  const last = wPts.at(-1);

  return `
  <svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="體重與體脂趨勢圖">
    <defs><linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--ink)" stop-opacity=".16"/><stop offset="1" stop-color="var(--ink)" stop-opacity="0"/></linearGradient></defs>
    ${bands}${ticks.join('')}${xTicks}${goal}
    ${area ? `<path d="${area}" fill="url(#wfill)"/>` : ''}
    ${fPts.length > 1 ? `<path d="${smooth(fPts)}" class="line fat" pathLength="1"/>` : ''}
    ${wPath ? `<path d="${wPath}" class="line weight" pathLength="1"/>` : ''}
    ${dots}
    ${last ? `<circle cx="${last[0]}" cy="${last[1]}" r="7" class="pt-last"/>` : ''}
  </svg>`;
}

export async function renderProgress(main, state) {
  const s = state.settings;
  const start = s.startDate;
  const end = addDays(start, TOTAL_DAYS - 1);
  const today = todayISO();
  const rows = await api.entries(start, end);
  const byDate = new Map(rows.map((r) => [r.date, r]));

  const ws = rows.filter((r) => r.weight !== null);
  const fs = rows.filter((r) => r.body_fat !== null);
  const firstW = s.startWeight ?? ws[0]?.weight ?? null;
  const lastW = ws.at(-1)?.weight ?? null;
  const lost = firstW !== null && lastW !== null ? firstW - lastW : null;
  const fatDelta = fs.length > 1 ? fs.at(-1).body_fat - fs[0].body_fat : null;
  const toGoal = s.goalWeight && lastW !== null ? lastW - s.goalWeight : null;
  const elapsed = Math.max(0, Math.min(TOTAL_DAYS, diffDays(today, start) + 1));
  const avg = (k) => (rows.length ? rows.reduce((n, r) => n + (r[k] || 0), 0) / rows.length : null);
  const completion = rows.length ? rows.reduce((n, r) => n + r.checklist_done / CHECKLIST.length, 0) / Math.max(elapsed, 1) : 0;
  const moodCounts = Object.fromEntries(MOODS.map((m) => [m.id, rows.filter((r) => r.mood === m.id).length]));
  const moodMax = Math.max(1, ...Object.values(moodCounts));

  const heat = [];
  for (let w = 0; w < 12; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const loc = locate(start, date);
      const e = byDate.get(date);
      const score = e ? e.checklist_done / CHECKLIST.length : 0;
      col.push(`<a class="heat-cell ${e ? 'has' : ''} ${date > today ? 'future' : ''} ${date === today ? 'now' : ''}" href="#/day/${date}" style="--c:${loc.phase.color};--s:${score.toFixed(2)}" title="${date} · ${e ? `${e.checklist_done}/${CHECKLIST.length}` : '未紀錄'}"></a>`);
    }
    heat.push(`<div class="heat-col"><span class="heat-w">W${w + 1}</span>${col.join('')}</div>`);
  }

  main.innerHTML = `
  <section class="wrap prog-hero">
    <div data-reveal>
      <p class="eyebrow">Progress · Day ${Math.max(elapsed, 0)} / ${TOTAL_DAYS}</p>
      <h1 class="h0">你的進度</h1>
    </div>
    <div class="big-stats" data-reveal>
      <div class="big-stat">
        <span class="stat-label">已減去</span>
        <span class="big-num"><b data-count="${lost !== null ? Math.max(lost, 0) : ''}" data-dec="1">${lost === null ? '—' : Math.max(lost, 0).toFixed(1)}</b><small>kg</small></span>
        <span class="muted">${firstW !== null ? `從 ${firstW} kg 開始` : '輸入體重後開始計算'}</span>
      </div>
      <div class="big-stat">
        <span class="stat-label">體脂變化</span>
        <span class="big-num"><b>${fatDelta === null ? '—' : (fatDelta > 0 ? '+' : '') + fatDelta.toFixed(1)}</b><small>%</small></span>
        <span class="muted">${fs.length ? `最新 ${fs.at(-1).body_fat}%` : '尚無體脂紀錄'}</span>
      </div>
      <div class="big-stat">
        <span class="stat-label">距離目標</span>
        <span class="big-num"><b>${toGoal === null ? '—' : Math.max(toGoal, 0).toFixed(1)}</b><small>kg</small></span>
        <span class="muted">${s.goalWeight ? `目標 ${s.goalWeight} kg` : '<a href="#/settings">設定目標體重</a>'}</span>
      </div>
      <div class="big-stat">
        <span class="stat-label">檢核達成率</span>
        <span class="big-num"><b data-count="${Math.round(completion * 100)}">${Math.round(completion * 100)}</b><small>%</small></span>
        <span class="muted">團長說：做到 80% 就很棒</span>
      </div>
    </div>
  </section>

  <section class="wrap">
    <div class="sheet chart-sheet" data-reveal>
      <header class="block-head inline">
        <div><p class="eyebrow">Trend</p><h2 class="h2">體重與體脂</h2></div>
        <div class="chart-key"><span><i class="k weight"></i>體重 kg</span><span><i class="k fat"></i>體脂 %</span></div>
      </header>
      ${ws.length || fs.length ? trendChart(rows, start, s) : `<div class="chart-empty">${icon.chart(32)}<p>在日誌裡填入體重、體脂，趨勢就會出現在這裡。</p><a class="btn btn-primary" href="#/day/${today}"><span>去記錄</span>${icon.arrow(18)}</a></div>`}
    </div>
  </section>

  <section class="wrap prog-grid">
    <div class="sheet heat-sheet" data-reveal>
      <header class="block-head"><p class="eyebrow">84 Days</p><h2 class="h2">每日檢核熱度</h2></header>
      <div class="heat">${heat.join('')}</div>
      <div class="heat-legend">${PHASES.map((p) => `<span><i style="background:${p.color}"></i>${p.name}</span>`).join('')}<span class="muted">顏色越深＝完成越多</span></div>
    </div>
    <div class="side-stats">
      <div class="sheet mini" data-reveal>
        <p class="stat-label">平均睡眠</p>
        <p class="mini-num"><b>${avg('sleep_hours') === null ? '—' : avg('sleep_hours').toFixed(1)}</b><small>小時</small></p>
      </div>
      <div class="sheet mini" data-reveal>
        <p class="stat-label">平均飲水</p>
        <p class="mini-num"><b>${avg('water_glasses') === null ? '—' : Math.round(avg('water_glasses') * 250).toLocaleString()}</b><small>ml</small></p>
      </div>
      <div class="sheet mini" data-reveal>
        <p class="stat-label">運動消耗合計</p>
        <p class="mini-num"><b>${rows.reduce((n, r) => n + (r.exercise_kcal || 0), 0).toLocaleString()}</b><small>kcal</small></p>
      </div>
      <div class="sheet mini moods-mini" data-reveal>
        <p class="stat-label">心情分佈</p>
        <div class="mood-bars">
          ${MOODS.map((m) => `<div class="mood-bar" title="${m.zh} ${moodCounts[m.id]} 天"><span class="bar" style="--h:${moodCounts[m.id] / moodMax}"></span>${face(m.id)}<small>${moodCounts[m.id]}</small></div>`).join('')}
        </div>
      </div>
    </div>
  </section>

  <section class="wrap export-row" data-reveal>
    <button class="btn btn-ghost" type="button" id="exportBtn">${icon.download(18)}<span>匯出全部資料（JSON）</span></button>
  </section>`;

  $('#exportBtn', main).addEventListener('click', () => api.exportAll().catch((err) => toast(err.message, 'error')));
  $$('[data-count]', main).forEach((el) => {
    if (el.dataset.count !== '') countUp(el, Number(el.dataset.count), { decimals: Number(el.dataset.dec || 0) });
  });
  revealOnScroll(main);
}
