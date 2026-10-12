// Daily journal — a digital twin of the paper 生活日誌 page, autosaved to the database.
import { api } from '../api.js';
import { createAutosave } from '../autosave.js';
import { LABEL_COLORS, LABEL_BGS, NO_BG, DEFAULT_LABEL_COLOR, contrast, textFor, stampText, decodeImage, renderStamped, stampToBlob, saveFiles } from '../stamp.js';
import { $, $$, esc, toast, ring, revealOnScroll, wave } from '../ui.js';
import { icon, art, moon, glass, face } from '../icons.js';
import {
  TOTAL_DAYS, VEG_COLORS, PROTEINS, OILS, MEALS, SNACK, MOODS, MEAL_KCAL_LIMIT,
  normalizeEntry, derivedChecks, locate, addDays, formatLong, todayISO, checklistScore, checklistFor, waterGoalMl, parseISO,
  JOY_KINDS,
} from '../program.js';

// The autosave of the day currently on screen, and the last one per date (so
// re-opening a date waits for its pending save instead of loading stale data).
let current = null;
const byDate = new Map();
const anyUnsaved = () => [...byDate.values()].some((a) => a.hasUnsaved());
const flushPending = () => current?.flush();
window.addEventListener('hashchange', flushPending);
window.addEventListener('pagehide', flushPending);
// Only a warning: edits that are not yet stored cannot be recovered after the page closes.
window.addEventListener('beforeunload', (e) => {
  if (!anyUnsaved()) return;
  flushPending();
  e.preventDefault();
  e.returnValue = '';
});

const SAVE_TEXT = {
  pending: '儲存中…',
  saving: '儲存中…',
  saved: '已儲存。',
  error: '這次尚未儲存，內容已保留，可以再試一次。',
};

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
    <button type="button" class="photo-open" data-action="photo-open" data-id="${p.id}" data-src="${esc(p.url)}" aria-label="放大照片">
      <img src="${esc(p.url)}" alt="" loading="lazy" decoding="async" />
    </button>
    <button type="button" class="photo-dl" data-action="photo-dl" data-id="${p.id}" aria-label="下載照片">${icon.download(14)}</button>
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

// ---------- 每日三件事 ----------
const MORE_QUESTIONS = [
  { id: 'goal', label: '今天做了什麼靠近我的目標？' },
  { id: 'strengths', label: '今天做了什麼發揮我的天賦、才能與技能？' },
  { id: 'ease', label: '今天做了什麼，讓我更自在地發揮自己？' },
];
const filledCount = (r) => MORE_QUESTIONS.filter((q) => r[q.id].trim()).length;
const moreLabel = (n) => (n ? `想多寫一點（已寫 ${n} 題）` : '想多寫一點');

function reflectionMarkup(r) {
  return `
    <div class="sheet soft-card reflect" data-reveal>
      <header class="soft-head">
        <p class="eyebrow">Three things</p>
        <h2 class="h2">每日三件事</h2>
      </header>
      <label class="soft-field" for="rf-care">
        <span class="soft-q">今天，有什麼讓我感到舒服，或被自己好好照顧的時刻？</span>
      </label>
      <textarea id="rf-care" class="soft-text" rows="2" data-path="reflection.careMoment"
        placeholder="例如：好好吃一餐、休息一下、享受喜歡的音樂、留一點時間給自己。">${esc(r.careMoment)}</textarea>
      <button type="button" class="soft-more" data-action="reflect-more" aria-expanded="false" aria-controls="rf-more">
        <span>${moreLabel(filledCount(r))}</span>${icon.right(16)}
      </button>
      <div class="soft-more-body" id="rf-more" hidden>
        <p class="soft-note">小小的前進、發揮自己的長處，或讓生活更順心，都可以寫在這裡。</p>
        ${MORE_QUESTIONS.map((q, i) => `
          <label class="soft-field" for="rf-${q.id}"><span class="soft-q"><i>${i + 1}</i>${q.label}</span></label>
          <textarea id="rf-${q.id}" class="soft-text" rows="2" data-path="reflection.${q.id}">${esc(r[q.id])}</textarea>`).join('')}
      </div>
    </div>`;
}

// ---------- 四種快樂 ----------
function joyItemMarkup(kind, j) {
  const id = kind.id;
  return `
    <li class="joy ${j.felt ? 'is-felt' : ''}" data-joy="${id}">
      <button type="button" class="joy-mark" data-action="joy-mark" data-joy="${id}" aria-pressed="${j.felt}">
        <span class="joy-dot" aria-hidden="true">${icon.check(14)}</span>
        <span class="joy-name">${kind.label}</span>
        <span class="joy-state">${j.felt ? '今天有感受到' : '輕按記下'}</span>
      </button>
      <button type="button" class="joy-note-toggle" data-action="joy-note" data-joy="${id}"
        aria-expanded="${Boolean(j.note)}" aria-controls="joy-note-${id}">${j.note ? '備註' : '寫一句話'}</button>
      <div class="joy-note" id="joy-note-${id}" ${j.note ? '' : 'hidden'}>
        <label class="sr" for="joy-text-${id}">${kind.label}的備註</label>
        <textarea id="joy-text-${id}" class="soft-text" rows="2" data-path="joy.${id}.note" placeholder="例如：${kind.hint}">${esc(j.note)}</textarea>
      </div>
    </li>`;
}

function joyMarkup(joy) {
  return `
    <div class="sheet soft-card joys" data-reveal>
      <header class="soft-head soft-head-row">
        <div><p class="eyebrow">Four joys</p><h2 class="h2">四種快樂</h2></div>
        <button type="button" class="chip joy-fold" data-action="joy-fold" aria-expanded="true" aria-controls="joy-body">今天先到這裡</button>
      </header>
      <div id="joy-body">
        <p class="soft-note">今天有感受到哪一種，就輕按一下；想記下一句話也可以。</p>
        <ul class="joy-grid">${JOY_KINDS.map((k) => joyItemMarkup(k, joy[k.id])).join('')}</ul>
      </div>
      <p class="joy-folded" id="joy-folded" hidden></p>
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
  flushPending(); // the previous day's edits go to the previous day's row
  current = null;
  await byDate.get(date)?.idle(); // a save of this same date may still be in flight
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
          <button type="button" class="chip dl-all" id="dlAll" data-action="photo-dl-all" hidden>${icon.download(16)}<span></span></button>
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

      <section class="block soft-blocks">
        ${reflectionMarkup(entry.reflection)}
        ${joyMarkup(entry.joy)}
      </section>
    </div>

    <aside class="day-aside">${isSaturday ? weeklyMarkup(weekRows) : ''}${guideMarkup(loc, state.settings)}</aside>
  </div>

  <div class="save-pill" id="savePill" data-state="idle" role="status" aria-live="polite">
    <span class="save-dot"></span><span class="save-text">已儲存。</span>
    <button type="button" class="save-retry" data-action="save-retry" hidden>再試一次</button>
  </div>
  <dialog class="lightbox" id="lightbox"><img alt="餐點照片" />
    <button type="button" class="icon-btn" data-action="lightbox-close" aria-label="關閉">${icon.close(20)}</button>
    <button type="button" class="btn btn-primary lightbox-dl" data-action="photo-dl" data-id="">${icon.download(18)}<span>下載照片</span></button>
  </dialog>
  <dialog class="composer" id="composer" aria-labelledby="composerTitle">
    <div class="composer-card">
      <header class="composer-head">
        <div><p class="eyebrow">Photo label</p><h3 class="h3" id="composerTitle">照片標籤</h3></div>
        <button type="button" class="icon-btn subtle" data-composer="cancel" aria-label="取消">${icon.close(18)}</button>
      </header>
      <div class="composer-preview"><canvas id="composerCanvas"></canvas><span class="composer-count" id="composerCount"></span></div>
      <p class="composer-text muted small">左上角會寫上 <b id="composerLabel"></b>。文字和照片顏色太接近時，可以加一個背景：</p>
      <div class="swatch-row">
        <span class="swatch-title">文字</span>
        <div class="swatches" role="radiogroup" aria-label="文字顏色">
          ${LABEL_COLORS.map((c) => `<button type="button" class="swatch-btn" role="radio" data-color="${c.id}" style="--sw:${c.id}" aria-label="文字${c.label}" title="${c.label}"></button>`).join('')}
          <label class="swatch-btn swatch-custom" data-custom="color" title="自訂文字顏色"><input type="color" id="customColor" aria-label="自訂文字顏色" /></label>
        </div>
      </div>
      <div class="swatch-row">
        <span class="swatch-title">背景</span>
        <div class="swatches" role="radiogroup" aria-label="文字背景">
          <button type="button" class="swatch-btn swatch-none" role="radio" data-bg="${NO_BG}" aria-label="不加背景" title="不加背景"></button>
          ${LABEL_BGS.map((c) => `<button type="button" class="swatch-btn swatch-square" role="radio" data-bg="${c.id}" style="--sw:${c.id}" aria-label="背景${c.label}" title="${c.label}"></button>`).join('')}
          <label class="swatch-btn swatch-square swatch-custom" data-custom="bg" title="自訂背景顏色"><input type="color" id="customBg" aria-label="自訂背景顏色" /></label>
        </div>
      </div>
      <div class="composer-actions">
        <button type="button" class="btn btn-ghost" data-composer="cancel">取消</button>
        <button type="button" class="btn btn-primary" data-composer="ok" id="composerOk"></button>
      </div>
    </div>
  </dialog>`;

  // ---------- state sync ----------
  const pill = $('#savePill', main);
  const setSave = (s, text) => {
    pill.dataset.state = s;
    $('.save-text', pill).textContent = text;
  };

  const autosave = createAutosave({
    snapshot: () => JSON.parse(JSON.stringify(entry)),
    save: (data) => api.saveEntry(date, data, items), // `date` is fixed for this view
    onState: (st) => {
      if (current !== autosave) {
        // This day is no longer on screen; only speak up if its edits did not make it.
        if (st === 'error') toast(`${date} 的內容這次尚未儲存，回到那一天可以再試一次。`, 'error');
        return;
      }
      setSave(st, SAVE_TEXT[st]);
      $('.save-retry', pill).hidden = st !== 'error';
    },
  });
  current = autosave;
  byDate.set(date, autosave);

  // Small, targeted DOM updates for the 四種快樂 card (never re-render it while typing).
  function paintJoy(id) {
    const j = entry.joy[id];
    const li = $(`.joy[data-joy="${id}"]`, main);
    li.classList.toggle('is-felt', j.felt);
    const mark = $('.joy-mark', li);
    mark.setAttribute('aria-pressed', String(j.felt));
    $('.joy-state', mark).textContent = j.felt ? '今天有感受到' : '輕按記下';
  }
  function setJoyNote(id, open) {
    const li = $(`.joy[data-joy="${id}"]`, main);
    $(`#joy-note-${id}`, main).hidden = !open;
    const t = $('.joy-note-toggle', li);
    t.setAttribute('aria-expanded', String(open));
    t.textContent = open || entry.joy[id].note ? '備註' : '寫一句話';
  }

  const changed = () => {
    applyDerived();
    paint();
    autosave.touch();
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
    paintDownloadAll();
  }

  // ---------- events ----------
  main.onclick = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'save-retry') {
      autosave.retry();
      return;
    }
    if (action === 'reflect-more') {
      const body = $('#rf-more', main);
      const open = body.hidden;
      body.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.classList.toggle('is-open', open);
      return;
    }
    if (action === 'joy-mark') {
      const id = btn.dataset.joy;
      const j = entry.joy[id];
      if (j.felt || j.note) {
        if (!confirm('要移除這個時刻的紀錄嗎？')) return;
        j.felt = false;
        j.note = '';
        const ta = $(`#joy-text-${id}`, main);
        ta.value = '';
        setJoyNote(id, false);
      } else {
        j.felt = true;
      }
      paintJoy(id);
      return changed();
    }
    if (action === 'joy-note') {
      const id = btn.dataset.joy;
      const open = $(`#joy-note-${id}`, main).hidden;
      setJoyNote(id, open);
      if (open) $(`#joy-text-${id}`, main).focus();
      return;
    }
    if (action === 'joy-fold') {
      // Folding is only a view change; it never touches the stored journal.
      const body = $('#joy-body', main);
      const fold = !body.hidden;
      body.hidden = fold;
      const summary = $('#joy-folded', main);
      const felt = JOY_KINDS.filter((k) => entry.joy[k.id].felt).map((k) => k.label);
      summary.textContent = felt.length ? `今天記下了：${felt.join('、')}` : '想記的時候，再打開就好。';
      summary.hidden = !fold;
      btn.textContent = fold ? '打開' : '今天先到這裡';
      btn.setAttribute('aria-expanded', String(!fold));
      return;
    }

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
      $('.lightbox-dl', dlg).dataset.id = btn.dataset.id;
      dlg.showModal();
      return;
    }
    if (action === 'lightbox-close') $('#lightbox', main).close();
    if (action === 'photo-dl' || action === 'photo-dl-all') {
      const list = action === 'photo-dl' ? photos.filter((p) => String(p.id) === btn.dataset.id) : orderedPhotos();
      if (!list.length) return;
      btn.disabled = true;
      try {
        await saveFiles(await Promise.all(list.map(photoFile)));
      } catch (err) {
        toast(err.message || '下載失敗', 'error');
      } finally {
        btn.disabled = false;
      }
    }
  };

  // ---------- photo download ----------
  const MEAL_LABEL = Object.fromEntries([...MEALS, SNACK].map((m) => [m.id, m.label]));
  const orderedPhotos = () => [...MEALS, SNACK].flatMap((m) => photos.filter((p) => p.meal === m.id));
  async function photoFile(p) {
    const blob = await api.downloadPhoto(p);
    const same = photos.filter((q) => q.meal === p.meal);
    const n = same.length > 1 ? `-${same.indexOf(p) + 1}` : '';
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    // ASCII file names: some browsers replace non-ASCII download names with "download".
    return new File([blob], `${date}_${p.meal}${n}.${ext}`, { type: blob.type || 'image/jpeg' });
  }
  function paintDownloadAll() {
    const b = $('#dlAll', main);
    b.hidden = photos.length === 0;
    $('span', b).textContent = `下載今日照片（${photos.length}）`;
  }

  // ---------- upload composer: preview the stamped label, pick text colour and optional background ----------
  function compose(meal, files) {
    const dlg = $('#composer', main);
    const canvas = $('#composerCanvas', main);
    const text = stampText(date, MEAL_LABEL[meal]);
    const style = {
      color: state.settings.labelColor || DEFAULT_LABEL_COLOR,
      bg: state.settings.labelBg || NO_BG,
    };
    let bitmap = null;
    $('#composerLabel', main).textContent = text;
    $('#composerCount', main).textContent = files.length > 1 ? `共 ${files.length} 張，套用同一個樣式` : '';
    $('#composerOk', main).textContent = files.length > 1 ? `上傳 ${files.length} 張` : '上傳';
    const same = (a, b) => a.toLowerCase() === b.toLowerCase();
    const markGroup = (attr, presets, value, customKey) => {
      $$(`.swatch-btn[data-${attr}]`, dlg).forEach((b) => b.setAttribute('aria-checked', String(same(b.dataset[attr], value))));
      const custom = $(`[data-custom="${customKey}"]`, dlg);
      const isCustom = value !== NO_BG && !presets.some((c) => same(c.id, value));
      custom.classList.toggle('is-on', isCustom);
      if (isCustom) custom.style.setProperty('--sw', value);
      else custom.style.removeProperty('--sw');
    };
    const draw = () => {
      markGroup('color', LABEL_COLORS, style.color, 'color');
      markGroup('bg', LABEL_BGS, style.bg, 'bg');
      $('#customColor', main).value = style.color.length === 7 ? style.color : '#ffffff';
      $('#customBg', main).value = style.bg !== NO_BG && style.bg.length === 7 ? style.bg : '#1b2130';
      if (bitmap) renderStamped(bitmap, text, style, { maxSide: 1000, canvas });
    };
    // Keep the label readable: if text and box end up too similar, flip the text to ink or white.
    const ensureContrast = () => {
      if (style.bg !== NO_BG && contrast(style.color, style.bg) < 2.2) style.color = textFor(style.bg);
    };
    return new Promise((resolve) => {
      const done = (ok) => {
        dlg.onclick = null;
        $('#customColor', main).oninput = null;
        $('#customBg', main).oninput = null;
        dlg.oncancel = null;
        if (dlg.open) dlg.close();
        bitmap?.close?.();
        resolve(ok ? { ...style } : null);
      };
      dlg.onclick = (e) => {
        const c = e.target.closest('[data-color]');
        if (c) {
          style.color = c.dataset.color;
          draw();
        }
        const b = e.target.closest('[data-bg]');
        if (b) {
          style.bg = b.dataset.bg;
          ensureContrast();
          draw();
        }
        const act = e.target.closest('[data-composer]')?.dataset.composer;
        if (act) done(act === 'ok');
        if (e.target === dlg) done(false);
      };
      $('#customColor', main).oninput = (e) => {
        style.color = e.target.value;
        draw();
      };
      $('#customBg', main).oninput = (e) => {
        style.bg = e.target.value;
        ensureContrast();
        draw();
      };
      // Esc key. (Not "close": that event fires asynchronously and would hit the next composer.)
      dlg.oncancel = (e) => {
        e.preventDefault();
        done(false);
      };
      canvas.width = canvas.height = 0;
      draw();
      dlg.showModal();
      document.fonts?.load('700 40px "Noto Sans TC"', text).catch(() => {}).then(() => decodeImage(files[0])).then((b) => {
        bitmap = b;
        draw();
      }).catch((err) => {
        toast(err.message, 'error');
        done(false);
      });
    });
  }

  $('#lightbox', main).addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') e.target.close();
  });

  main.oninput = (e) => {
    const el = e.target;
    if (el.id === 'datePick') return;
    if (el.dataset.path) {
      setPath(entry, el.dataset.path, el.value);
      const [group, key] = el.dataset.path.split('.');
      if (group === 'joy' && el.value.trim() && !entry.joy[key].felt) {
        entry.joy[key].felt = true; // writing a note about it means it was felt
        paintJoy(key);
      }
      if (group === 'reflection') {
        $('[data-action="reflect-more"] span', main).textContent = moreLabel(filledCount(entry.reflection));
      }
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
      if (!files.length) return;
      const style = await compose(meal, files);
      if (!style) return;
      if (style.color !== state.settings.labelColor || style.bg !== (state.settings.labelBg || NO_BG)) {
        state.settings.labelColor = style.color;
        state.settings.labelBg = style.bg;
        api.saveSettings({ labelColor: style.color, labelBg: style.bg }).catch(() => {});
      }
      const box = $(`[data-photos="${meal}"]`, main);
      const add = $('.photo-add', box);
      const text = stampText(date, MEAL_LABEL[meal]);
      for (const file of files) {
        const ph = document.createElement('figure');
        ph.className = 'photo is-loading';
        box.insertBefore(ph, add);
        try {
          const bitmap = await decodeImage(file);
          const blob = await stampToBlob(bitmap, text, style);
          bitmap.close?.();
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
