// Data layer backed by Supabase (Postgres + Auth + Storage).
// The vendored UMD bundle (vendor/supabase.js) exposes `window.supabase`.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { CHECKLIST } from './program.js';

const BUCKET = 'meal-photos';
const SIGNED_URL_TTL = 60 * 60 * 6; // 6 hours

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const sb = isConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** Turn a Supabase `{ data, error }` result into a value or a thrown Error. */
function unwrap({ data, error }) {
  if (error) throw new Error(error.message || '資料庫錯誤');
  return data;
}

async function uid() {
  const { data } = await sb.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('請先登入');
  return id;
}

const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

/** Mirror the headline metrics of a journal into queryable columns. */
function summarise(data, items) {
  const checklist = data.checklist || {};
  return {
    weight: num(data.weight),
    body_fat: num(data.bodyFat),
    water_glasses: num(data.water),
    sleep_hours: num(data.sleep),
    mood: data.mood || null,
    exercise_kcal: num(data.exerciseKcal),
    relax_mins: num(data.relaxMins),
    checklist_done: items.filter((c) => checklist[c.id]).length,
    checklist_total: items.length,
  };
}

async function withSignedUrls(photos) {
  if (!photos.length) return photos;
  const signed = unwrap(await sb.storage.from(BUCKET).createSignedUrls(photos.map((p) => p.path), SIGNED_URL_TTL));
  const byPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return photos.map((p) => ({ ...p, url: byPath.get(p.path) || '' }));
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const api = {
  async settings() {
    const id = await uid();
    const row = unwrap(await sb.from('profiles').select('settings').eq('user_id', id).maybeSingle());
    return row?.settings || {};
  },

  /** Merge a patch into the settings; a `null` value removes that key. */
  async saveSettings(patch) {
    const id = await uid();
    const current = await api.settings();
    const next = { ...current };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete next[k];
      else next[k] = v;
    }
    unwrap(await sb.from('profiles').upsert({ user_id: id, settings: next, updated_at: new Date().toISOString() }));
    return next;
  },

  /** Daily summaries in a date range, with a photo count per day. */
  async entries(from, to) {
    const id = await uid();
    const [rows, photos] = await Promise.all([
      sb.from('entries')
        .select('date, weight, body_fat, water_glasses, sleep_hours, mood, exercise_kcal, relax_mins, checklist_done, checklist_total, updated_at')
        .eq('user_id', id).gte('date', from).lte('date', to).order('date'),
      sb.from('photos').select('date').eq('user_id', id).gte('date', from).lte('date', to),
    ]).then((rs) => rs.map(unwrap));
    const counts = new Map();
    for (const p of photos) counts.set(p.date, (counts.get(p.date) || 0) + 1);
    return rows.map((r) => ({ ...r, photo_count: counts.get(r.date) || 0 }));
  },

  async entry(date) {
    const id = await uid();
    const [row, photos] = await Promise.all([
      sb.from('entries').select('data, updated_at').eq('user_id', id).eq('date', date).maybeSingle(),
      sb.from('photos').select('id, date, meal, path, created_at').eq('user_id', id).eq('date', date).order('id'),
    ]).then((rs) => rs.map(unwrap));
    return { date, data: row?.data ?? null, updatedAt: row?.updated_at ?? null, photos: await withSignedUrls(photos) };
  },

  /** `items` is the checklist that applies to this day (it differs per phase). */
  async saveEntry(date, data, items = CHECKLIST) {
    const id = await uid();
    unwrap(await sb.from('entries').upsert({ user_id: id, date, data, ...summarise(data, items), updated_at: new Date().toISOString() }));
  },

  async uploadPhoto(date, meal, blob) {
    const id = await uid();
    const path = `${id}/${date}/${meal}-${crypto.randomUUID()}.${EXT[blob.type] || 'jpg'}`;
    unwrap(await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false }));
    try {
      const row = unwrap(await sb.from('photos').insert({ user_id: id, date, meal, path }).select('id, date, meal, path, created_at').single());
      return (await withSignedUrls([row]))[0];
    } catch (err) {
      await sb.storage.from(BUCKET).remove([path]);
      throw err;
    }
  },

  async deletePhoto(photo) {
    unwrap(await sb.from('photos').delete().eq('id', photo.id));
    await sb.storage.from(BUCKET).remove([photo.path]);
  },

  /** Download every record (photos as signed links) as a JSON file. */
  async exportAll() {
    const id = await uid();
    const [settings, entries, photos] = await Promise.all([
      api.settings(),
      sb.from('entries').select('date, data, updated_at').eq('user_id', id).order('date').then(unwrap),
      sb.from('photos').select('id, date, meal, path, created_at').eq('user_id', id).order('id').then(unwrap),
    ]);
    const payload = { exportedAt: new Date().toISOString(), settings, entries, photos: await withSignedUrls(photos) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `slimpath-${new Date().toISOString().slice(0, 10)}.json`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
};

// ---------- auth ----------
const redirectTo = () => `${location.origin}${location.pathname}`;

export const auth = {
  async session() {
    const { data } = await sb.auth.getSession();
    return data.session;
  },
  onChange(cb) {
    return sb.auth.onAuthStateChange((event, session) => cb(event, session));
  },
  async signIn(email, password) {
    return unwrap(await sb.auth.signInWithPassword({ email, password }));
  },
  async signUp(email, password) {
    return unwrap(await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }));
  },
  async sendReset(email) {
    return unwrap(await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }));
  },
  async updatePassword(password) {
    return unwrap(await sb.auth.updateUser({ password }));
  },
  async signOut() {
    await sb.auth.signOut();
  },
};

/** Downscale a picked image to a sensible size before upload. */
export async function compressImage(file, maxSide = 1600, quality = 0.86) {
  if (!file.type.startsWith('image/')) throw new Error('請選擇圖片檔');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Formats the browser cannot decode (e.g. HEIC on some browsers) go up as-is if allowed.
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;
    throw new Error('這個圖片格式無法讀取，請改用 JPG 或 PNG');
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('圖片處理失敗'))), 'image/jpeg', quality)
  );
}
