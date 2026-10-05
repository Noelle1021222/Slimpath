// Onboarding: choose a start date and lay the three phases onto the calendar.
import { api } from '../api.js';
import { $, $$, esc, toast, revealOnScroll, wave } from '../ui.js';
import { icon } from '../icons.js';
import { PHASES, TOTAL_DAYS, CHECKLIST, schedule, todayISO, addDays, formatShort, parseISO, weekdayLabel } from '../program.js';
import { navigate, refreshSettings } from '../app.js';

function nextMonday(from) {
  const d = parseISO(from);
  const add = (8 - d.getDay()) % 7 || 7;
  return addDays(from, add);
}

function timelineMarkup(start) {
  const phases = schedule(start);
  return `
    <div class="tl-bar" role="img" aria-label="三階段時間軸">
      ${phases.map((p) => `<span class="tl-seg" style="--c:${p.color};flex:${p.days}"><i></i></span>`).join('')}
    </div>
    <ol class="tl-list">
      ${phases
        .map(
          (p, i) => `
        <li style="--c:${p.color}">
          <span class="tl-dot"></span>
          <span class="tl-name">${p.name}<em>${p.weeks} 週</em></span>
          <span class="tl-range">${formatShort(p.start)}（${weekdayLabel(p.start)}）→ ${formatShort(p.end)}（${weekdayLabel(p.end)}）</span>
          <span class="tl-idx">0${i + 1}</span>
        </li>`
        )
        .join('')}
    </ol>
    <p class="tl-foot">完成日 <strong>${formatShort(addDays(start, TOTAL_DAYS - 1))}</strong> · 共 ${TOTAL_DAYS} 天</p>`;
}

export async function renderOnboarding(main, state) {
  const s = state.settings;
  const today = todayISO();
  const initial = s.startDate || nextMonday(today);
  const isEdit = Boolean(s.startDate);

  main.innerHTML = `
  <section class="hero">
    <div class="hero-bg" aria-hidden="true">
      <span class="orb orb-a"></span><span class="orb orb-b"></span><span class="orb orb-c"></span>
    </div>
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow" data-reveal>Sauce Plan · 12 Weeks · ${TOTAL_DAYS} Days</p>
        <h1 class="hero-title" data-reveal>
          <span class="line"><span>十二週，</span></span>
          <span class="line"><span>重新認識</span></span>
          <span class="line"><span>你的身體。</span></span>
        </h1>
        ${wave('hero-wave')}
        <p class="hero-lede" data-reveal>減重不是和數字的戰鬥，而是一段與自己和好的旅程。選一個開始的日子，Slimpath 會把三個階段排進你的行事曆，每天陪你完成一頁生活日誌。</p>
        <dl class="hero-facts" data-reveal>
          <div><dt>天</dt><dd>${TOTAL_DAYS}</dd></div>
          <div><dt>階段</dt><dd>3</dd></div>
          <div><dt>每日檢核</dt><dd>${CHECKLIST.length}</dd></div>
          <div><dt>杯水 / 天</dt><dd>8</dd></div>
        </dl>
      </div>

      <form class="start-card sheet" id="startForm" data-reveal novalidate>
        <div class="start-head">
          <p class="eyebrow">${isEdit ? 'Reschedule' : 'Begin'}</p>
          <h2 class="h2">${isEdit ? '調整開始日' : '選擇開始日'}</h2>
        </div>
        <label class="field">
          <span class="field-label">開始日期</span>
          <input class="input input-date" type="date" name="startDate" value="${esc(initial)}" required />
        </label>
        <div class="quick-dates" role="group" aria-label="快速選擇">
          <button type="button" class="chip" data-date="${today}">今天</button>
          <button type="button" class="chip" data-date="${addDays(today, 1)}">明天${addDays(today, 1) === nextMonday(today) ? '（週一）' : ''}</button>
          ${addDays(today, 1) === nextMonday(today) ? '' : `<button type="button" class="chip" data-date="${nextMonday(today)}">下週一</button>`}
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">性別 <small>（決定每餐熱量提示）</small></span>
            <span class="seg" role="radiogroup">
              <label><input type="radio" name="sex" value="female" ${s.sex !== 'male' ? 'checked' : ''}/><span>女生</span></label>
              <label><input type="radio" name="sex" value="male" ${s.sex === 'male' ? 'checked' : ''}/><span>男生</span></label>
            </span>
          </label>
        </div>
        <div class="field-row two">
          <label class="field">
            <span class="field-label">起始體重 <small>kg</small></span>
            <input class="input" type="number" inputmode="decimal" step="0.1" min="20" max="300" name="startWeight" value="${esc(s.startWeight ?? '')}" placeholder="—" />
          </label>
          <label class="field">
            <span class="field-label">目標體重 <small>kg</small></span>
            <input class="input" type="number" inputmode="decimal" step="0.1" min="20" max="300" name="goalWeight" value="${esc(s.goalWeight ?? '')}" placeholder="—" />
          </label>
        </div>
        <div class="timeline" id="timeline">${timelineMarkup(initial)}</div>
        <button class="btn btn-primary btn-block" type="submit">
          <span>${isEdit ? '更新行事曆' : '排入行事曆'}</span>${icon.arrow(20)}
        </button>
        ${isEdit ? '<a class="btn btn-ghost btn-block" href="#/">取消</a>' : ''}
      </form>
    </div>
  </section>

  <section class="wrap phases-intro">
    <header class="section-head" data-reveal>
      <p class="eyebrow">Three Phases</p>
      <h2 class="h1">三個階段，循序漸進</h2>
    </header>
    <div class="phase-cards">
      ${PHASES.map(
        (p, i) => `
        <article class="phase-card" style="--c:${p.color}" data-reveal>
          <div class="phase-card-top">
            <span class="phase-num">0${i + 1}</span>
            <span class="phase-weeks"><b>${p.weeks}</b> weeks</span>
          </div>
          <div class="week-blocks" aria-hidden="true">${Array.from({ length: p.weeks }, (_, w) => `<i style="--i:${w}"><span>W${PHASES.slice(0, i).reduce((n, q) => n + q.weeks, 0) + w + 1}</span></i>`).join('')}</div>
          <h3 class="phase-name">${p.name}<em>${p.en}</em></h3>
          <p class="phase-motto">${p.motto}</p>
          <p class="phase-summary">${p.summary}</p>
        </article>`
      ).join('')}
    </div>
  </section>`;

  const form = $('#startForm', main);
  const dateInput = form.startDate;
  const update = () => {
    if (dateInput.value) $('#timeline', main).innerHTML = timelineMarkup(dateInput.value);
    $$('.quick-dates .chip', form).forEach((c) => c.classList.toggle('is-on', c.dataset.date === dateInput.value));
  };
  dateInput.addEventListener('input', update);
  $$('.quick-dates .chip', form).forEach((chip) =>
    chip.addEventListener('click', () => {
      dateInput.value = chip.dataset.date;
      update();
    })
  );
  update();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!dateInput.value) return toast('請選擇開始日期', 'error');
    const n = (v) => (v === '' ? null : Number(v));
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api.saveSettings({
        startDate: dateInput.value,
        sex: form.sex.value,
        startWeight: n(form.startWeight.value),
        goalWeight: n(form.goalWeight.value),
      });
      await refreshSettings();
      toast(isEdit ? '行事曆已更新' : '三個階段已排入行事曆 ✦', 'success');
      navigate(`#/calendar/${dateInput.value.slice(0, 7)}`);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
    }
  });

  revealOnScroll(main);
}
