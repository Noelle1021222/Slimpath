// Sign in / sign up / password reset, plus the "not configured yet" screen.
import { auth } from '../api.js';
import { $, $$, esc, toast, wave } from '../ui.js';
import { icon } from '../icons.js';

const COPY = {
  signin: { eyebrow: 'Welcome back', title: '登入', cta: '登入', alt: ['還沒有帳號？', 'signup', '建立帳號'] },
  signup: { eyebrow: 'Create account', title: '建立帳號', cta: '註冊', alt: ['已經有帳號？', 'signin', '登入'] },
  reset: { eyebrow: 'Forgot password', title: '重設密碼', cta: '寄送重設信', alt: ['想起來了？', 'signin', '回到登入'] },
  recover: { eyebrow: 'New password', title: '設定新密碼', cta: '更新密碼', alt: null },
};

const ERRORS = [
  [/invalid login credentials/i, '帳號或密碼不正確'],
  [/email not confirmed/i, '這個信箱還沒確認，請先到信箱點確認連結'],
  [/user already registered/i, '這個信箱已經註冊過了，請直接登入'],
  [/password should be at least/i, '密碼至少需要 6 個字元'],
  [/rate limit/i, '操作太頻繁，請稍後再試'],
  [/failed to fetch|network/i, '連不上伺服器，請檢查網路'],
];
const friendly = (msg) => ERRORS.find(([re]) => re.test(msg))?.[1] || msg;

function shell(inner) {
  return `
  <section class="hero auth-hero">
    <div class="hero-bg" aria-hidden="true">
      <span class="orb orb-a"></span><span class="orb orb-b"></span><span class="orb orb-c"></span>
    </div>
    <div class="wrap auth-grid">
      <div class="hero-copy">
        <p class="eyebrow">Sauce Plan · 12 Weeks · 84 Days</p>
        <h1 class="hero-title auth-title">
          <span class="line"><span>每一天，</span></span>
          <span class="line"><span>都算數。</span></span>
        </h1>
        ${wave('hero-wave')}
        <p class="hero-lede">登入後，你的行事曆、每日日誌和餐點照片會安全地存在雲端，手機和電腦看到的是同一份紀錄。</p>
      </div>
      ${inner}
    </div>
  </section>`;
}

export function renderSetup(main) {
  main.innerHTML = shell(`
    <div class="start-card sheet auth-card">
      <p class="eyebrow">Setup</p>
      <h2 class="h2">尚未連接資料庫</h2>
      <p class="muted">請在 <code>public/js/config.js</code> 填入 Supabase 的 Project URL 與 anon key，或在 GitHub 的 repository variables 設定 <code>SUPABASE_URL</code>、<code>SUPABASE_ANON_KEY</code> 後重新部署。詳細步驟請看 README。</p>
    </div>`);
}

export function renderAuth(main, mode = 'signin') {
  const c = COPY[mode];
  const needsEmail = mode !== 'recover';
  const needsPassword = mode !== 'reset';

  main.innerHTML = shell(`
    <form class="start-card sheet auth-card" id="authForm" novalidate>
      <div class="start-head">
        <p class="eyebrow">${c.eyebrow}</p>
        <h2 class="h2">${c.title}</h2>
      </div>
      ${needsEmail ? `
      <label class="field">
        <span class="field-label">Email</span>
        <input class="input" type="email" name="email" autocomplete="email" inputmode="email" required placeholder="you@example.com" />
      </label>` : ''}
      ${needsPassword ? `
      <label class="field field-gap">
        <span class="field-label">${mode === 'recover' ? '新密碼' : '密碼'} <small>至少 6 個字元</small></span>
        <span class="pw-wrap">
          <input class="input" type="password" name="password" minlength="6" required
            autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}" />
          <button type="button" class="pw-toggle" data-action="pw" aria-label="顯示密碼">顯示</button>
        </span>
      </label>` : ''}
      ${mode === 'signin' ? '<button type="button" class="link-btn" data-mode="reset">忘記密碼？</button>' : ''}
      <p class="auth-msg" id="authMsg" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit"><span>${c.cta}</span>${icon.arrow(20)}</button>
      ${c.alt ? `<p class="auth-alt">${c.alt[0]} <button type="button" class="link-btn" data-mode="${c.alt[1]}">${c.alt[2]}</button></p>` : ''}
    </form>`);

  const form = $('#authForm', main);
  const msg = $('#authMsg', main);
  const say = (text, tone = 'error') => {
    msg.textContent = text;
    msg.dataset.tone = tone;
  };

  $$('[data-mode]', main).forEach((b) => b.addEventListener('click', () => renderAuth(main, b.dataset.mode)));
  $('[data-action=pw]', main)?.addEventListener('click', (e) => {
    const input = form.password;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    e.currentTarget.textContent = show ? '隱藏' : '顯示';
  });
  (form.email || form.password)?.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email?.value.trim();
    const password = form.password?.value;
    if (needsEmail && !/^\S+@\S+\.\S+$/.test(email || '')) return say('請輸入正確的 Email');
    if (needsPassword && (password || '').length < 6) return say('密碼至少需要 6 個字元');
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    say('');
    try {
      if (mode === 'signin') {
        await auth.signIn(email, password); // the auth listener in app.js re-routes
      } else if (mode === 'signup') {
        const res = await auth.signUp(email, password);
        if (!res.session) {
          say(`確認信已寄到 ${esc(email)}，點信中的連結完成註冊後即可登入。`, 'info');
          btn.disabled = false;
        }
      } else if (mode === 'reset') {
        await auth.sendReset(email);
        say('重設密碼的連結已寄出，請查看信箱。', 'info');
        btn.disabled = false;
      } else if (mode === 'recover') {
        await auth.updatePassword(password);
        toast('密碼已更新', 'success');
        location.hash = '#/';
      }
    } catch (err) {
      say(friendly(err.message));
      btn.disabled = false;
    }
  });
}
