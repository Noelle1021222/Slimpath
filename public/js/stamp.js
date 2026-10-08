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

// Optional rounded box behind the label, for photos whose colours clash with the text.
export const LABEL_BGS = [
  { id: '#1B2130', label: '墨黑' },
  { id: '#FFFFFF', label: '白' },
  { id: '#EADCC6', label: '奶茶' },
  { id: '#FFD54A', label: '檸檬黃' },
  { id: '#FF8FB1', label: '蜜桃粉' },
  { id: '#9BE28A', label: '嫩綠' },
  { id: '#8EC5FF', label: '天空藍' },
];
export const NO_BG = 'none';

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

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
const isLight = (hex) => luminance(hex) > 0.3;

/** WCAG contrast ratio between two #RRGGBB colours (1 – 21). */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Readable text colour for a background: ink on light boxes, white on dark ones. */
export const textFor = (bg) => (isLight(bg) ? '#1B2130' : '#FFFFFF');

const normStyle = (style) => (typeof style === 'string' ? { color: style, bg: NO_BG } : { bg: NO_BG, ...style });

function roundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draw the image scaled to `maxSide` with the label in the top-left corner.
 * `style` is { color, bg } — bg is a colour for a rounded box behind the text, or 'none'.
 */
export function renderStamped(bitmap, text, style, { maxSide = 1600, canvas = document.createElement('canvas') } = {}) {
  const { color, bg } = normStyle(style);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);

  const size = Math.max(18, Math.round(Math.min(w, h) * 0.058));
  const margin = Math.round(size * 0.75);
  ctx.font = `700 ${size}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;

  if (bg && bg !== NO_BG) {
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(text);
    const ascent = m.actualBoundingBoxAscent || size * 0.88;
    const descent = m.actualBoundingBoxDescent || size * 0.14;
    const padX = Math.round(size * 0.55);
    const padY = Math.round(size * 0.4);
    const boxW = Math.ceil(m.width + padX * 2);
    const boxH = Math.ceil(ascent + descent + padY * 2);
    // box with a soft drop shadow, then crisp text on top
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = Math.round(size * 0.4);
    ctx.shadowOffsetY = Math.round(size * 0.08);
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = bg;
    roundedRect(ctx, margin, margin, boxW, boxH, Math.round(size * 0.38));
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = color;
    ctx.fillText(text, margin + padX, margin + padY + ascent);
    return canvas;
  }

  ctx.textBaseline = 'top';
  // A soft contrasting halo keeps the label readable on busy food photos.
  const light = isLight(color);
  ctx.shadowColor = light ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.7)';
  ctx.shadowBlur = Math.round(size * 0.35);
  ctx.shadowOffsetY = Math.round(size * 0.04);
  ctx.fillStyle = color;
  ctx.fillText(text, margin, margin);
  ctx.shadowColor = 'transparent';
  return canvas;
}

export async function stampToBlob(bitmap, text, style) {
  await document.fonts?.load(`700 40px "Noto Sans TC"`, text).catch(() => {});
  const canvas = renderStamped(bitmap, text, style);
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
