// Thin client for the Slimpath JSON API.

async function request(path, options = {}) {
  const res = await fetch(path, options);
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await res.json() : null;
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body;
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  settings: () => request('/api/settings'),
  saveSettings: (patch) => request('/api/settings', json('PUT', patch)),
  entries: (from, to) => request(`/api/entries?from=${from}&to=${to}`),
  entry: (date) => request(`/api/entries/${date}`),
  saveEntry: (date, data) => request(`/api/entries/${date}`, json('PUT', data)),
  uploadPhoto: (date, meal, blob) =>
    request(`/api/entries/${date}/photos?meal=${meal}`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type },
      body: blob,
    }),
  deletePhoto: (id) => request(`/api/photos/${id}`, { method: 'DELETE' }),
  exportUrl: '/api/export',
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
