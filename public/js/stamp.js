// Meal-photo stamping (date + meal in the top-left corner) and saving photos to the device.
import { parseISO } from './program.js';

export const LABEL_COLORS = [
  { id: '#FFFFFF', label: '白' },
  { id: '#1B2130', label: '墨黑' },
  { id: '#FFD54A', label: '檸檬黃' },
  { id: '#FF8FB1', label: '蜜桃粉' },
  { id: '#9BE28A', label: '嫩綠' },
  { id: '#8EC5FF', label: '天空藍' },
];
export const DEFAULT_LABEL_COLOR = '#FFFFFF';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** "2026.10.05（一）早餐" */
export function stampText(date, mealLabel) {
  const d = parseISO(date);
  const [y, m, day] = date.split('-');
  return `${y}.${m}.${day}（${WEEKDAYS[d.getDay()]}）${mealLabel}`;
}

/** Decode a picked file, honouring EXIF orientation. */
export async function decodeImage(file) {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) throw new Error('請選擇圖片檔');
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('這個圖片格式無法讀取，請改用 JPG 或 PNG（iPhone 可在「設定 › 相機 › 格式」選「最相容」）');
  }
}

const isLight = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
};

/** Draw the image scaled to `maxSide` with the label in the top-left corner. */
export function renderStamped(bitmap, text, color, { maxSide = 1600, canvas = document.createElement('canvas') } = {}) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);

  const size = Math.max(18, Math.round(Math.min(w, h) * 0.058));
  const pad = Math.round(size * 0.75);
  ctx.font = `700 ${size}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
  ctx.textBaseline = 'top';
  // A soft contrasting halo keeps the label readable on busy food photos.
  const light = isLight(color);
  ctx.shadowColor = light ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.7)';
  ctx.shadowBlur = Math.round(size * 0.35);
  ctx.shadowOffsetY = Math.round(size * 0.04);
  ctx.fillStyle = color;
  ctx.fillText(text, pad, pad);
  ctx.shadowColor = 'transparent';
  return canvas;
}

export async function stampToBlob(bitmap, text, color) {
  await document.fonts?.load(`700 40px "Noto Sans TC"`, text).catch(() => {});
  const canvas = renderStamped(bitmap, text, color);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('圖片處理失敗'))), 'image/jpeg', 0.88)
  );
}

/**
 * Save files to the device. On phones this opens the share sheet (so "儲存影像"
 * puts them straight into the photo album); elsewhere it downloads each file.
 */
export async function saveFiles(files) {
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // user closed the share sheet
    }
  }
  for (const file of files) {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: file.name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (files.length > 1) await new Promise((r) => setTimeout(r, 350)); // browsers drop rapid-fire downloads
  }
}
