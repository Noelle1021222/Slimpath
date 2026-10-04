// Slimpath — app shell & hash router.
import { api } from './api.js';
import { $, toast } from './ui.js';
import { icon } from './icons.js';
import { todayISO } from './program.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderCalendar } from './views/calendar.js';
import { renderDay } from './views/day.js';
import { renderProgress } from './views/progress.js';
import { renderSettings } from './views/settings.js';

export const state = { settings: {} };

const NAV = [
  { href: '#/', label: '行事曆', icon: 'calendar', match: (r) => r === '' || r === 'calendar' },
  { href: () => `#/day/${todayISO()}`, label: '今日日誌', icon: 'today', match: (r) => r === 'day' },
  { href: '#/progress', label: '進度', icon: 'chart', match: (r) => r === 'progress' },
  { href: '#/settings', label: '設定', icon: 'settings', match: (r) => r === 'settings' },
];

function renderNav(route) {
  const links = (cls) =>
    NAV.map((n) => {
      const href = typeof n.href === 'function' ? n.href() : n.href;
      const active = n.match(route);
      return `<a class="${cls}${active ? ' is-active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${icon[n.icon](20)}<span>${n.label}</span></a>`;
    }).join('');
  const hidden = !state.settings.startDate;
  $('#nav').innerHTML = hidden ? '' : links('nav-link');
  $('#tabbar').innerHTML = hidden ? '' : links('tab-link');
  document.body.classList.toggle('no-program', hidden);
}

export function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

let renderToken = 0;
async function route() {
  const token = ++renderToken;
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  const main = $('#main');
  const hasProgram = Boolean(state.settings.startDate);

  let view;
  if (!hasProgram || name === 'start') view = () => renderOnboarding(main, state);
  else if (name === 'day') view = () => renderDay(main, state, /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : todayISO());
  else if (name === 'progress') view = () => renderProgress(main, state);
  else if (name === 'settings') view = () => renderSettings(main, state);
  else view = () => renderCalendar(main, state, arg);

  renderNav(hasProgram ? name : '');
  const swap = async () => {
    if (token !== renderToken) return;
    main.onclick = main.oninput = main.onchange = null;
    await view();
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  try {
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await document.startViewTransition(swap).updateCallbackDone;
    } else {
      await swap();
    }
    main.focus({ preventScroll: true });
  } catch (err) {
    console.error(err);
    main.innerHTML = `<section class="wrap empty-state"><h1 class="display">連線不到資料庫</h1><p>${err.message}</p><p>請確認伺服器已用 <code>npm start</code> 啟動。</p></section>`;
  }
}

export async function refreshSettings() {
  state.settings = await api.settings();
  return state.settings;
}

async function boot() {
  try {
    await refreshSettings();
  } catch (err) {
    toast('無法連線到伺服器', 'error');
  }
  window.addEventListener('hashchange', route);
  route();
}

boot();
