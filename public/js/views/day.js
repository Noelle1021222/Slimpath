// Daily journal — a digital twin of the paper 生活日誌 page, autosaved to the database.
import { api, compressImage } from '../api.js';
import { $, $$, esc, toast, ring, debounce, revealOnScroll, wave } from '../ui.js';
import { icon, art, moon, glass, face } from '../icons.js';
import {
  TOTAL_DAYS, VEG_COLORS, PROTEINS, OILS, MEALS, SNACK, MOODS, MEAL_KCAL_LIMIT,
  normalizeEntry, derivedChecks, locate, addDays, formatLong, todayISO, checklistScore, checklistFor, waterGoalMl, parseISO,
} from '../program.js';

let pendingFlush = null;
const flushPending = () => pendingFlush?.();
window.addEventListener('hashchange', flushPending);
window.addEventListener('pagehide', flushPending);

// ---------- path helpers ----------
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// ---------- markup ----------
function stepper(path, value, { label, swatch, unit, step = 1, max = 20 }) {
  return `
    <div class="stepper ${value > 0 ? 'has-value' : ''}" data-stepper="${path}">
      <span class="stepper-label">${swatch ? `<i class="swatch" style="--sw:${swatch}"></i>` : ''}${label}</span>
      <span class="stepper-ctrl">
        <button type="button" class="step-btn" data-action="step" data-path="${path}" data-delta="${-step}" data-max="${max}" aria-label="${label} 減少">${icon.minus(14)}</button>
        <output class="step-val" aria-live="polite">${fmt(value)}</output>
        <button type="button" class="step-btn" data-action="step" data-path="${path}" data-delta="${step}" data-max="${max}" aria-label="${label} 增加">${icon.plus(14)}</button>
      </span>
      ${unit ? `<span class="stepper-unit">${unit}</span>` : ''}
    </div>`;
}

function mealMarkup(meal, data, photos, { showStarch, isSnack }) {
  const vegTotal = Object.values(data.veg).reduce((a, b) => a + b, 0);
  const mealPhotos = photos.filter((p) => p.meal === meal.id);
  return `
  <article class="meal" data-meal="${meal.id}" data-reveal>
    <header class="meal-head">
      <h3 class="meal-title">${meal.label}<em>${meal.en}</em></h3>
      <label class="meal-time">
        ${icon.clock(16)}<span class="sr">用餐時間</span>
        <input type="time" value="${esc(data.time)}" data-path="meals.${meal.id}.time" aria-label="${meal.label}用餐時間" />
      </label>
      <label class="meal-kcal" data-kcal="${meal.id}">
        <input type="number" inputmode="numeric" min="0" step="10" value="${esc(data.kcal)}" data-path="meals.${meal.id}.kcal" placeholder="—" aria-label="${meal.label}熱量" />
        <span>kcal</span>
      </label>
      ${isSnack ? `<button type="button" class="icon-btn subtle" data-action="snack-off" aria-label="移除副餐">${icon.close(18)}</button>` : ''}
    </header>

    <div class="group">
      <div class="group-head">${art.broccoli}<span>蔬菜類</span><span class="group-total" data-veg-total="${meal.id}">${vegTotal ? `共 ${fmt(vegTotal)} 份` : ''}</span></div>
      <div class="veg-grid">
        ${VEG_COLORS.map((c) => stepper(`meals.${meal.id}.veg.${c.id}`, data.veg[c.id], { label: c.label, swatch: c.hex, step: 0.5 })).join('')}
      </div>
    </div>

    <div class="group">
      <div class="group-head">${art.steak}<span>蛋白質類</span></div>
      <div class="chips" role="group" aria-label="${meal.label}蛋白質">
        ${PROTEINS.map((p) => `<button type="button" class="chip pick ${data.protein.includes(p) ? 'is-on' : ''}" data-action="protein" data-meal="${meal.id}" data-value="${p}" aria-pressed="${data.protein.includes(p)}">${p}</button>`).join('')}
      </div>
    </div>

    <div class="group">
      <div class="group-head">${art.oil}<span>油脂類</span></div>
      <div class="oil-grid">
        ${OILS.map((o) => stepper(`meals.${meal.id}.oils.${o.id}`, data.oils[o.id], { label: o.label, unit: o.unit, step: o.id === 'oil' ? 0.5 : 1, max: 40 })).join('')}
      </div>
    </div>

    ${showStarch ? `
    <div class="group">
      <div class="group-head">${art.starch}<span>優質澱粉</span><small class="hint">約半碗：糙米、五穀米、地瓜…</small></div>
      <button type="button" class="toggle ${data.starch ? 'is-on' : ''}" data-action="toggle" data-path="meals.${meal.id}.starch" aria-pressed="${data.starch}">
        <span class="toggle-knob"></span><span>${data.starch ? '已吃半碗' : '未吃'}</span>
      </button>
    </div>` : ''}

    <div class="group">
      <div class="group-head">${icon.camera(20)}<span>餐點照片</span></div>
      <div class="photos" data-photos="${meal.id}">
        ${mealPhotos.map(photoThumb).join('')}
        <label class="photo-add">
          <input type="file" accept="image/*" multiple data-upload="${meal.id}" />
          ${icon.plus(22)}<span>上傳照片</span>
        </label>
      </div>
    </div>
  </article>`;
}

const photoThumb = (p) => `
  <figure class="photo" data-photo="${p.id}">
    <button type="button" class="photo-open" data-action="photo-open" data-src="${esc(p.url)}" aria-label="放大照片">
      <img src="${esc(p.url)}" alt="" loading="lazy" decoding="async" />
    </button>
    <button type="button" class="photo-del" data-action="photo-del" data-id="${p.id}" aria-label="刪除照片">${icon.close(14)}</button>
  </figure>`;

function guideMarkup(loc, settings) {
  if (!loc) {
    return `<div class="guide sheet" data-reveal>
      <p class="eyebrow">Off program</p>
      <h3 class="h3">這天不在計畫期間</h3>
      <p class="muted">一樣可以記錄，資料會存進資料庫，只是不會計入三階段的進度。</p>
    </div>`;
  }
  const p = loc.phase;
  return `
    <div class="guide sheet" style="--c:${p.color}" data-reveal>
      <div class="guide-top">
        <span class="guide-badge">${p.name}</span>
        <span class="guide-week">第 ${loc.phaseWeek} / ${p.weeks} 週</span>
      </div>
      <h3 class="guide-motto">${p.motto}</h3>
      <ul class="guide-list">${p.guide.map((g) => `<li>${g}</li>`).join('')}</ul>
      ${p.id === 'adapt' ? `<p class="guide-note">${icon.flame(16)} 每餐 ≤ ${MEAL_KCAL_LIMIT} kcal；20:00 後只喝水</p>` : ''}
      ${p.id === 'detox' && loc.phaseWeek >= 3 ? `<p class="guide-note">${icon.clock(16)} 第 3 週起：穩定三餐，正餐間隔 4 小時以上</p>` : ''}
    </div>
    <div class="lemon sheet" data-reveal>
      <div class="lemon-icon">${icon.lemon(26)}</div>
      <div>
        <p class="eyebrow">Morning ritual</p>
        <h3 class="h3">檸檬水配方</h3>
        <p class="muted">20–25cc 無糖現榨連皮檸檬原汁 ＋ 300cc 冷水 ＋ 100cc 熱水，比例不低於 1:20，切勿純喝。起床上完廁所、量完體重後喝。喝完記得漱口；胃食道逆流者請於早餐後飲用。</p>
      </div>
    </div>`;
}

/** Saturday card: lowest weight / body fat of the past 7 days (reported to the group). */
function weeklyMarkup(rows) {
  const min = (k) => {
    const vals = rows.map((r) => r[k]).filter((v) => v !== null && v !== undefined);
    return vals.length ? Math.min(...vals) : null;
  };
  const w = min('weight');
  const f = min('body_fat');
  return `
    <div class="weekly sheet" data-reveal>
      <p class="eyebrow">Saturday report</p>
      <h3 class="h3">週六回報：本週最低數據</h3>
      <div class="weekly-nums">
        <div><span class="stat-label">最低體重</span><b>${w ?? '—'}</b><small>kg</small></div>
        <div><span class="stat-label">最低體脂</span><b>${f ?? '—'}</b><small>%</small></div>
      </div>
      <p class="muted small">取本週日到週六的紀錄。記得回報到群組 ✦</p>
    </div>`;
}

// ---------- view ----------
export async function renderDay(main, state, date) {
  flushPending();
  const start = state.settings.startDate;
  const loc = locate(start, date);
  const res = await api.entry(date);
  const entry = normalizeEntry(res.data);
  entry.checklistManual ??= {};
  let photos = res.photos || [];
  const isStable = loc?.phase.id === 'stable';
  const isAdapt = loc?.phase.id === 'adapt';
  const items = checklistFor(loc?.phase.id);
  const today = todayISO();
  const isSaturday = parseISO(date).getDay() === 6;
  const weekRows = isSaturday ? await api.entries(addDays(date, -6), date) : [];
  const baseWeight = state.settings.startWeight;
  const waterGoal = () => waterGoalMl(entry.weight !== '' && entry.weight !== null ? entry.weight : baseWeight);
  const glassCount = () => Math.max(8, Math.ceil(waterGoal() / 250));
  const glassesMarkup = () => Array.from({ length: glassCount() }, (_, i) => `<button type="button" class="unit" role="radio" data-action="unit" data-field="water" data-value="${i + 1}" aria-label="${i + 1} 杯">${glass(i + 1, 'w')}</button>`).join('');

  const metaLine = loc
    ? `<span class="phase-pill" style="--c:${loc.phase.color}">${loc.phase.name}</span>
       <span>第 <b>${loc.week}</b> 週</span><span>第 <b>${loc.dayOfWeek}</b> 天</span><span class="muted">Day ${loc.day} / ${TOTAL_DAYS}</span>`
    : `<span class="phase-pill off">計畫外</span>`;

  main.innerHTML = `
  <section class="wrap day-head">
    <nav class="day-pager" aria-label="切換日期">
      <a class="icon-btn" href="#/day/${addDays(date, -1)}" aria-label="前一天">${icon.left(20)}</a>
      <label class="day-picker">
        <input type="date" value="${date}" id="datePick" aria-label="選擇日期" />
        <span>${esc(formatLong(date))}</span>
      </label>
      <a class="icon-btn" href="#/day/${addDays(date, 1)}" aria-label="後一天">${icon.right(20)}</a>
      ${date !== today ? `<a class="chip" href="#/day/${today}">回到今天</a>` : ''}
    </nav>
    <div class="day-title-row">
      <div>
        <p class="eyebrow">醬汁計劃${loc ? ` — ${loc.phase.name}` : ''} · Daily Journal</p>
        <h1 class="day-title">生活日誌</h1>
        ${wave('day-wave')}
        <p class="day-meta-line">${metaLine}</p>
      </div>
      <div class="day-score" id="dayScore"></div>
    </div>
  </section>

  <div class="wrap day-layout">
    <div class="day-main">
      <section class="block" aria-labelledby="mealsTitle">
        <header class="block-head" data-reveal>
          <p class="eyebrow">Meals</p>
          <h2 class="h2" id="mealsTitle">三餐紀錄</h2>
          <p class="kcal-total" id="kcalTotal"></p>
        </header>
        <div class="meals" id="meals">
          ${MEALS.map((m) => mealMarkup(m, entry.meals[m.id], photos, { showStarch: isStable })).join('')}
          <div id="snackSlot">${entry.meals.snack.enabled ? mealMarkup(SNACK, entry.meals.snack, photos, { showStarch: false, isSnack: true }) : ''}</div>
          <button type="button" class="add-snack ${entry.meals.snack.enabled ? 'is-hidden' : ''}" data-action="snack-on">
            ${icon.plus(18)}<span>加一份副餐</span><small>${isStable ? '穩定期若常需要副餐，記得檢視正餐份量' : '高纖無糖豆漿、低糖水果、毛豆'}</small>
          </button>
        </div>
      </section>

      <section class="block" aria-labelledby="checkTitle">
        <div class="sheet check-sheet" data-reveal>
          <header class="block-head inline">
            <div><p class="eyebrow">Self check</p><h2 class="h2" id="checkTitle">今日自我檢核</h2></div>
            <span class="check-count" id="checkCount"></span>
          </header>
          <ul class="checklist" id="checklist">
            ${items.map((c) => `
              <li><button type="button" class="check" role="checkbox" data-action="check" data-id="${c.id}" aria-checked="${entry.checklist[c.id]}">
                <span class="check-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg></span>
                <span class="check-label">${c.label}${c.hint ? `<small>${c.hint}</small>` : ''}</span>
                <span class="check-auto" data-auto="${c.id}" title="依今日紀錄自動勾選">auto</span>
              </button></li>`).join('')}
          </ul>
        </div>
      </section>

      <section class="block trio">
        <div class="sheet meter" data-reveal>
          <header class="meter-head"><h2 class="h3">睡眠時數</h2><span class="meter-unit">( Hours )</span></header>
          <label class="bedtime">${icon.clock(16)}<span>就寢時間</span>
            <input type="time" value="${esc(entry.bedtime)}" data-field="bedtime" aria-label="就寢時間" />
          </label>
          <div class="units moons" role="radiogroup" aria-label="睡眠時數">
            ${Array.from({ length: 8 }, (_, i) => `<button type="button" class="unit" role="radio" data-action="unit" data-field="sleep" data-value="${i + 1}" aria-label="${i + 1} 小時">${moon(i + 1)}</button>`).join('')}
          </div>
          <p class="meter-read"><b id="sleepRead"></b></p>
        </div>
        <div class="sheet meter" data-reveal>
          <header class="meter-head"><h2 class="h3">今日飲水量</h2><span class="meter-unit">250ml / Glass</span></header>
          <p class="water-goal" id="waterGoal"></p>
          <div class="units glasses" id="glasses" role="radiogroup" aria-label="飲水杯數" style="--n:${glassCount()}">${glassesMarkup()}</div>
          <p class="meter-read"><b id="waterRead"></b></p>
        </div>
        <div class="sheet meter mood-meter" data-reveal>
          <header class="meter-head"><h2 class="h3">今日整體心情</h2></header>
          <div class="moods" role="radiogroup" aria-label="今日心情">
            ${MOODS.map((m) => `<button type="button" class="mood" role="radio" data-action="mood" data-value="${m.id}" aria-checked="${entry.mood === m.id}" aria-label="${m.zh}">${face(m.id)}<span>${m.label}</span></button>`).join('')}
          </div>
        </div>
      </section>

      <section class="block">
        <div class="numbers" data-reveal>
          ${[
            ['relaxMins', '放鬆靜默練習', 'MINS', '1', '0'],
            ['exerciseKcal', '運動熱量消耗', 'KCAL', '1', '0'],
            ['weight', '體重', 'KG', '0.1', '20'],
            ['bodyFat', '體脂', '%', '0.1', '1'],
          ].map(([f, label, unit, step, min]) => `
            <label class="num-card sheet">
              <span class="num-label">${label}</span>
              <span class="num-row">
                <input class="num-input" type="number" inputmode="decimal" step="${step}" min="${min}" data-field="${f}" value="${esc(entry[f])}" placeholder="—" />
                <span class="num-unit">${unit}</span>
              </span>
            </label>`).join('')}
        </div>
      </section>

      <section class="block">
        <label class="sheet tomorrow" data-reveal>
          <span class="tomorrow-label">Things that<br/>make me<br/>better tomorrow</span>
          <textarea data-field="tomorrow" rows="4" placeholder="今天的小觀察、明天想調整的一件事……">${esc(entry.tomorrow)}</textarea>
        </label>
      </section>
    </div>

    <aside class="day-aside">${isSaturday ? weeklyMarkup(weekRows) : ''}${guideMarkup(loc, state.settings)}</aside>
  </div>

  <div class="save-pill" id="savePill" data-state="idle"><span class="save-dot"></span><span class="save-text">已同步</span></div>
  <dialog class="lightbox" id="lightbox"><img alt="餐點照片" /><button type="button" class="icon-btn" data-action="lightbox-close" aria-label="關閉">${icon.close(20)}</button></dialog>`;

  // ---------- state sync ----------
  const pill = $('#savePill', main);
  const setSave = (s, text) => {
    pill.dataset.state = s;
    $('.save-text', pill).textContent = text;
  };

  let dirty = false;
  const persist = async () => {
    if (!dirty) return;
    dirty = false;
    setSave('saving', '儲存中…');
    try {
      await api.saveEntry(date, entry, items);
      const t = new Date();
      setSave('saved', `已儲存 ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`);
    } catch (err) {
      dirty = true;
      setSave('error', '儲存失敗，稍後重試');
      toast(err.message, 'error');
    }
  };
  const save = debounce(persist, 650);
  pendingFlush = () => save.flush();

  const changed = () => {
    dirty = true;
    setSave('dirty', '編輯中…');
    applyDerived();
    paint();
    save();
  };

  function applyDerived() {
    const derived = derivedChecks(entry, photos, { weight: baseWeight });
    for (const [id, ok] of Object.entries(derived)) {
      if (ok && !entry.checklistManual[id]) entry.checklist[id] = true;
    }
    $$('[data-auto]', main).forEach((el) => el.classList.toggle('is-on', Boolean(derived[el.dataset.auto]) && !entry.checklistManual[el.dataset.auto]));
  }

  function paint() {
    const score = checklistScore(entry, items);
    const done = items.filter((c) => entry.checklist[c.id]).length;
    $('#dayScore', main).innerHTML = `${ring(score, { size: 96, stroke: 5, cls: 'big' })}<span class="day-score-num"><b>${done}</b><small>/ ${items.length}</small></span><span class="day-score-label">今日完成度</span>`;
    $('#checkCount', main).textContent = `${done} / ${items.length}`;
    // per-meal and daily calories
    let kcalSum = 0;
    let kcalCount = 0;
    for (const m of [...MEALS, SNACK]) {
      const v = entry.meals[m.id]?.kcal;
      const el = $(`[data-kcal="${m.id}"]`, main);
      const has = v !== '' && v !== null && v !== undefined;
      if (has && (m.id !== 'snack' || entry.meals.snack.enabled)) {
        kcalSum += Number(v);
        kcalCount++;
      }
      el?.classList.toggle('over', isAdapt && m.id !== 'snack' && has && Number(v) > MEAL_KCAL_LIMIT);
    }
    $('#kcalTotal', main).innerHTML = kcalCount
      ? `今日熱量 <b>${kcalSum.toLocaleString()}</b> kcal${isAdapt ? `<span class="${kcalSum > 1800 ? 'warn' : ''}"> · 建議 1,000–1,800 · 單餐 ≤ ${MEAL_KCAL_LIMIT}</span>` : ''}`
      : `在每餐右上角填入熱量，會自動加總${isAdapt ? `（單餐 ≤ ${MEAL_KCAL_LIMIT} kcal）` : ''}`;
    // water: the number of glasses follows the weight-based goal
    if ($$('#glasses .unit', main).length !== glassCount()) {
      $('#glasses', main).innerHTML = glassesMarkup();
      $('#glasses', main).style.setProperty('--n', glassCount());
    }
    const goal = waterGoal();
    $('#waterGoal', main).textContent = `今日目標 ${goal.toLocaleString()} ml${goal > 2000 ? '（體重 × 30cc）' : ''}`;
    $$('#checklist .check', main).forEach((b) => b.setAttribute('aria-checked', String(Boolean(entry.checklist[b.dataset.id]))));
    $$('.moons .unit', main).forEach((b) => {
      const on = Number(b.dataset.value) <= entry.sleep;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(Number(b.dataset.value) === entry.sleep));
    });
    $$('.glasses .unit', main).forEach((b) => {
      const on = Number(b.dataset.value) <= entry.water;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(Number(b.dataset.value) === entry.water));
    });
    $('#sleepRead', main).innerHTML = entry.sleep ? `${entry.sleep} 小時${entry.sleep >= 7 ? ' · 睡飽了 ✦' : ''}` : '點月亮記錄睡眠';
    const ml = entry.water * 250;
    $('#waterRead', main).innerHTML = entry.water ? `${ml.toLocaleString()} ml${ml >= goal ? ' · 達標 ✦' : ` · 還差 ${(goal - ml).toLocaleString()} ml`}` : '點杯子記錄飲水';
    $$('.mood', main).forEach((b) => b.setAttribute('aria-checked', String(entry.mood === b.dataset.value)));
  }

  // ---------- events ----------
  main.onclick = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'step') {
      const path = btn.dataset.path;
      const max = Number(btn.dataset.max);
      const next = Math.max(0, Math.min(max, (getPath(entry, path) || 0) + Number(btn.dataset.delta)));
      setPath(entry, path, Math.round(next * 2) / 2);
      const wrap = btn.closest('[data-stepper]');
      $('.step-val', wrap).textContent = fmt(getPath(entry, path));
      wrap.classList.toggle('has-value', getPath(entry, path) > 0);
      wrap.classList.remove('bump');
      void wrap.offsetWidth;
      wrap.classList.add('bump');
      const meal = path.split('.')[1];
      const total = Object.values(entry.meals[meal].veg).reduce((a, b) => a + b, 0);
      const t = $(`[data-veg-total="${meal}"]`, main);
      if (t) t.textContent = total ? `共 ${fmt(total)} 份` : '';
      return changed();
    }
    if (action === 'protein') {
      const list = entry.meals[btn.dataset.meal].protein;
      const v = btn.dataset.value;
      const i = list.indexOf(v);
      if (i >= 0) list.splice(i, 1);
      else list.push(v);
      btn.classList.toggle('is-on', i < 0);
      btn.setAttribute('aria-pressed', String(i < 0));
      return changed();
    }
    if (action === 'toggle') {
      const v = !getPath(entry, btn.dataset.path);
      setPath(entry, btn.dataset.path, v);
      btn.classList.toggle('is-on', v);
      btn.setAttribute('aria-pressed', String(v));
      btn.lastElementChild.textContent = v ? '已吃半碗' : '未吃';
      return changed();
    }
    if (action === 'check') {
      const id = btn.dataset.id;
      entry.checklist[id] = !entry.checklist[id];
      entry.checklistManual[id] = true;
      return changed();
    }
    if (action === 'unit') {
      const f = btn.dataset.field;
      const v = Number(btn.dataset.value);
      entry[f] = entry[f] === v ? v - 1 : v;
      return changed();
    }
    if (action === 'mood') {
      entry.mood = entry.mood === btn.dataset.value ? null : btn.dataset.value;
      return changed();
    }
    if (action === 'snack-on' || action === 'snack-off') {
      const on = action === 'snack-on';
      entry.meals.snack.enabled = on;
      $('#snackSlot', main).innerHTML = on ? mealMarkup(SNACK, entry.meals.snack, photos, { showStarch: false, isSnack: true }) : '';
      $('#snackSlot [data-reveal]', main)?.classList.add('is-in');
      $('.add-snack', main).classList.toggle('is-hidden', on);
      return changed();
    }
    if (action === 'photo-del') {
      if (!confirm('刪除這張照片？')) return;
      try {
        await api.deletePhoto(photos.find((p) => String(p.id) === btn.dataset.id));
        photos = photos.filter((p) => String(p.id) !== btn.dataset.id);
        btn.closest('.photo').remove();
        changed();
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }
    if (action === 'photo-open') {
      const dlg = $('#lightbox', main);
      $('img', dlg).src = btn.dataset.src;
      dlg.showModal();
      return;
    }
    if (action === 'lightbox-close') $('#lightbox', main).close();
  };

  $('#lightbox', main).addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') e.target.close();
  });

  main.oninput = (e) => {
    const el = e.target;
    if (el.id === 'datePick') return;
    if (el.dataset.path) {
      setPath(entry, el.dataset.path, el.value);
      return changed();
    }
    if (el.dataset.field) {
      entry[el.dataset.field] = el.value;
      return changed();
    }
  };

  main.onchange = async (e) => {
    const el = e.target;
    if (el.id === 'datePick' && el.value) {
      location.hash = `#/day/${el.value}`;
      return;
    }
    if (el.dataset.upload) {
      const meal = el.dataset.upload;
      const files = [...el.files];
      el.value = '';
      const box = $(`[data-photos="${meal}"]`, main);
      const add = $('.photo-add', box);
      for (const file of files) {
        const ph = document.createElement('figure');
        ph.className = 'photo is-loading';
        box.insertBefore(ph, add);
        try {
          const blob = await compressImage(file);
          const saved = await api.uploadPhoto(date, meal, blob);
          photos.push(saved);
          ph.outerHTML = photoThumb(saved);
        } catch (err) {
          ph.remove();
          toast(err.message, 'error');
        }
      }
      changed();
    }
  };

  applyDerived();
  paint();
  revealOnScroll(main);
}
