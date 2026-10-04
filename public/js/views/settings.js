// Settings: profile, reschedule, export, reset.
import { api } from '../api.js';
import { $, esc, toast, revealOnScroll } from '../ui.js';
import { icon } from '../icons.js';
import { schedule, formatLong } from '../program.js';
import { navigate, refreshSettings } from '../app.js';

export async function renderSettings(main, state) {
  const s = state.settings;
  const phases = schedule(s.startDate);

  main.innerHTML = `
  <section class="wrap settings">
    <header data-reveal>
      <p class="eyebrow">Settings</p>
      <h1 class="h0">設定</h1>
    </header>

    <div class="settings-grid">
      <div class="sheet" data-reveal>
        <header class="block-head"><p class="eyebrow">Schedule</p><h2 class="h2">目前的計畫</h2></header>
        <ul class="sched">
          ${phases.map((p) => `<li style="--c:${p.color}"><span class="sched-name">${p.name}</span><span class="muted">${formatLong(p.start)}<br/>→ ${formatLong(p.end)}</span></li>`).join('')}
        </ul>
        <a class="btn btn-ghost" href="#/start">${icon.calendar(18)}<span>更改開始日</span></a>
      </div>

      <form class="sheet" id="profile" data-reveal>
        <header class="block-head"><p class="eyebrow">Profile</p><h2 class="h2">個人資料</h2></header>
        <label class="field">
          <span class="field-label">性別</span>
          <span class="seg">
            <label><input type="radio" name="sex" value="female" ${s.sex !== 'male' ? 'checked' : ''}/><span>女生</span></label>
            <label><input type="radio" name="sex" value="male" ${s.sex === 'male' ? 'checked' : ''}/><span>男生</span></label>
          </span>
        </label>
        <div class="field-row two">
          <label class="field"><span class="field-label">起始體重 <small>kg</small></span>
            <input class="input" type="number" step="0.1" name="startWeight" value="${esc(s.startWeight ?? '')}" placeholder="—" /></label>
          <label class="field"><span class="field-label">目標體重 <small>kg</small></span>
            <input class="input" type="number" step="0.1" name="goalWeight" value="${esc(s.goalWeight ?? '')}" placeholder="—" /></label>
        </div>
        <button class="btn btn-primary" type="submit"><span>儲存</span>${icon.check(18)}</button>
      </form>

      <div class="sheet" data-reveal>
        <header class="block-head"><p class="eyebrow">Database</p><h2 class="h2">資料</h2></header>
        <p class="muted">所有紀錄都存在伺服器的 SQLite 資料庫（<code>data/slimpath.db</code>），照片存在 <code>data/uploads/</code>。</p>
        <div class="btn-row">
          <a class="btn btn-ghost" href="/api/export" download>${icon.download(18)}<span>匯出 JSON</span></a>
          <button class="btn btn-danger" type="button" id="resetBtn">重設計畫</button>
        </div>
        <p class="muted small">重設只會清除開始日，已記錄的每日資料仍保留在資料庫中。</p>
      </div>
    </div>
  </section>`;

  $('#profile', main).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const n = (v) => (v === '' ? null : Number(v));
    try {
      await api.saveSettings({ sex: f.sex.value, startWeight: n(f.startWeight.value), goalWeight: n(f.goalWeight.value) });
      await refreshSettings();
      toast('已儲存', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  $('#resetBtn', main).addEventListener('click', async () => {
    if (!confirm('確定要重設計畫嗎？每日紀錄不會被刪除。')) return;
    await api.saveSettings({ startDate: null });
    await refreshSettings();
    navigate('#/');
  });

  revealOnScroll(main);
}
