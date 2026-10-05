// Slimpath — app shell, auth gate & hash router.
import { api, auth, isConfigured } from './api.js';
import { $, toast } from './ui.js';
import { icon } from './icons.js';
import { todayISO } from './program.js';
import { renderAuth, renderSetup } from './views/auth.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderCalendar } from './views/calendar.js';
import { renderDay } from './views/day.js';
import { renderProgress } from './views/progress.js';
import { renderSettings } from './views/settings.js';

export const state = { settings: {}, session: null, recovering: false, ready: false, authNotice: null };

// Email links that fail (expired, already used, wrong redirect) come back as
// ?error=…&error_code=… and/or #error=…. Capture that once, then tidy the URL.
function takeAuthError() {
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
  const code = params.get('error_code') || hash.get('error_code');
  const desc = params.get('error_description') || hash.get('error_description');
  if (!code && !desc) return null;
  history.replaceState(null, '', location.pathname);
  if (code === 'otp_expired') {
    return '這個信件連結已經失效或已使用過。請先直接登入試試；若顯示「信箱還沒確認」，請重新註冊以取得新的確認信，並用同一個瀏覽器開啟信中的連結。';
  }
  return `信件連結無法使用：${desc || code}`;
}

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
  const hidden = !state.session || !state.settings.startDate;
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
  if (!state.ready) return;
  const token = ++renderToken;
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  const main = $('#main');
  const hasProgram = Boolean(state.settings.startDate);

  let view;
  let navRoute = '';
  if (!isConfigured) view = () => renderSetup(main);
  else if (state.recovering) view = () => renderAuth(main, 'recover');
  else if (!state.session) {
    const notice = state.authNotice;
    state.authNotice = null;
    view = () => renderAuth(main, 'signin', notice);
  }
  else if (!hasProgram || name === 'start') view = () => renderOnboarding(main, state);
  else {
    navRoute = name;
    if (name === 'day') view = () => renderDay(main, state, /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : todayISO());
    else if (name === 'progress') view = () => renderProgress(main, state);
    else if (name === 'settings') view = () => renderSettings(main, state);
    else view = () => renderCalendar(main, state, arg);
  }

  renderNav(navRoute);
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
    main.innerHTML = `<section class="wrap empty-state"><p class="eyebrow">Error</p><h1 class="h1">讀取資料時發生問題</h1><p class="muted">${err.message}</p><button class="btn btn-ghost" onclick="location.reload()">重新整理</button></section>`;
  }
}

export async function refreshSettings() {
  state.settings = state.session ? await api.settings() : {};
  return state.settings;
}

async function applySession(session) {
  const changedUser = state.session?.user?.id !== session?.user?.id;
  state.session = session;
  if (changedUser) {
    try {
      await refreshSettings();
    } catch (err) {
      state.settings = {};
      toast(err.message, 'error');
    }
  }
  state.ready = true;
  if (changedUser || !session) route();
}

function boot() {
  state.authNotice = takeAuthError();
  window.addEventListener('hashchange', route);
  if (!isConfigured) {
    state.ready = true;
    route();
    return;
  }
  // INITIAL_SESSION fires once on load, then SIGNED_IN / SIGNED_OUT / PASSWORD_RECOVERY.
  // Supabase calls are deferred out of the callback to avoid re-entrancy deadlocks.
  auth.onChange((event, session) => {
    setTimeout(() => {
      if (event === 'PASSWORD_RECOVERY') {
        state.recovering = true;
        state.session = session;
        state.ready = true;
        route();
        return;
      }
      if (event === 'USER_UPDATED' && state.recovering) {
        state.recovering = false;
        state.session = null; // force settings reload for this user
      }
      if (event === 'SIGNED_OUT') state.recovering = false;
      applySession(session);
    }, 0);
  });
}

boot();
