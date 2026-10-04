// Program model: the three phases, date math and the daily-log schema.

export const PHASES = [
  {
    id: 'adapt',
    name: '調適期',
    en: 'Adaptation',
    weeks: 2,
    color: 'var(--adapt)',
    motto: '碳水減半，食量不減半',
    summary: '在挑戰開始前，先和身體好好對話。調整作息、建立記錄習慣，把信心存進戶頭。',
    guide: [
      '碳水化合物（糖與醣）減半，用青菜或肉類補回份量，不節食',
      '只吃正餐，三餐時間盡量固定',
      '挑選原型食物，每餐女生約 500 大卡、男生約 600 大卡以內',
      '不碰油炸物與加工食品',
      '不使用減重藥物或減脂產品',
      '吃不到一日五蔬果時，可補充綜合維他命、B 群',
    ],
  },
  {
    id: 'detox',
    name: '戒斷期',
    en: 'Detox',
    weeks: 6,
    color: 'var(--detox)',
    motto: '建立身體與健康食物的認知',
    summary: '斷開對糖的依賴，穩定血糖、恢復胰島素敏感度，讓身體以自然的機制燃脂。',
    guide: [
      '每日 3–5 餐；第 3 週起穩定為三餐，正餐間隔至少 4 小時',
      '蛋白質：一個手掌大小，以雞胸、魚肉等白肉為主',
      '蔬菜：雙手大小，顏色越豐富越好',
      '好的油脂：橄欖油、酪梨油、苦茶油、奇亞籽油',
      '副餐：高纖無糖豆漿、低糖水果、毛豆',
      '烹調只用生食、水煮、蒸、低溫烤；凡是「醬」一律不用',
    ],
  },
  {
    id: 'stable',
    name: '穩定期',
    en: 'Stabilize',
    weeks: 4,
    color: 'var(--stable)',
    motto: '掌握原則，游刃有餘',
    summary: '味蕾不再依戀糖，飲食逐步放寬，與日常的台灣飲食文化和平共存。',
    guide: [
      '恢復每日三餐，早餐一定要吃',
      '正餐加入優質澱粉約半碗：糙米、五穀米、地瓜、馬鈴薯',
      '水果一天至多一個湯碗大小',
      '可加入煎、炒；油炸與加工食品仍然避免',
      '一週可安排 1–2 餐「開心時刻」，其他時間守住原則',
      '若還常想吃副餐，回頭檢視正餐的份量',
    ],
  },
];

export const TOTAL_DAYS = PHASES.reduce((n, p) => n + p.weeks * 7, 0); // 84

export const CHECKLIST = [
  { id: 'lemon', label: '起床一杯檸檬汁' },
  { id: 'weigh', label: '體重 / 體脂紀錄' },
  { id: 'water', label: '喝水 2,000 ML' },
  { id: 'order', label: '按食物比例及順序進食' },
  { id: 'veg5', label: '五蔬營養均衡' },
  { id: 'bed23', label: '23:00 前就寢' },
  { id: 'sleep7', label: '睡眠滿 7 個小時' },
  { id: 'photos', label: '三餐上傳照片' },
  { id: 'relax', label: '放鬆與排解壓力' },
];

export const VEG_COLORS = [
  { id: 'green', label: '綠色', hex: '#5D9B4A' },
  { id: 'red', label: '紅色', hex: '#D04A3C' },
  { id: 'yellow', label: '黃色', hex: '#E7B53A' },
  { id: 'purple', label: '紫色', hex: '#7A4F9D' },
  { id: 'white', label: '白色', hex: '#EEE9DC' },
  { id: 'black', label: '黑色', hex: '#2A2826' },
];

export const PROTEINS = ['雞肉', '牛肉', '豬肉', '羊肉', '魚肉', '鴨肉', '海鮮', '雞蛋', '豆類', '牛奶'];

export const OILS = [
  { id: 'oil', label: '好油', unit: '茶匙' },
  { id: 'nuts', label: '堅果', unit: '顆' },
  { id: 'avocado', label: '酪梨', unit: '顆' },
];

export const MEALS = [
  { id: 'breakfast', label: '早餐', en: 'Breakfast', defaultTime: '07:30' },
  { id: 'lunch', label: '午餐', en: 'Lunch', defaultTime: '12:00' },
  { id: 'dinner', label: '晚餐', en: 'Dinner', defaultTime: '18:30' },
];
export const SNACK = { id: 'snack', label: '副餐', en: 'Snack' };

export const MOODS = [
  { id: 'angry', label: 'ANGRY', zh: '生氣' },
  { id: 'tired', label: 'TIRED', zh: '疲憊' },
  { id: 'sad', label: 'SAD', zh: '低落' },
  { id: 'great', label: 'GREAT', zh: '很好' },
  { id: 'fun', label: 'FUN', zh: '開心' },
];

export function emptyMeal(defaultTime = '') {
  return {
    time: defaultTime,
    veg: Object.fromEntries(VEG_COLORS.map((c) => [c.id, 0])),
    protein: [],
    oils: Object.fromEntries(OILS.map((o) => [o.id, 0])),
    starch: false,
    note: '',
  };
}

export function emptyEntry() {
  return {
    meals: {
      breakfast: emptyMeal(''),
      lunch: emptyMeal(''),
      dinner: emptyMeal(''),
      snack: { ...emptyMeal(''), enabled: false },
    },
    checklist: Object.fromEntries(CHECKLIST.map((c) => [c.id, false])),
    sleep: 0,
    water: 0,
    mood: null,
    relaxMins: '',
    exerciseKcal: '',
    weight: '',
    bodyFat: '',
    tomorrow: '',
  };
}

/** Deep-merge a stored entry onto a fresh template so new fields always exist. */
export function normalizeEntry(data) {
  const base = emptyEntry();
  if (!data) return base;
  const out = { ...base, ...data, checklist: { ...base.checklist, ...(data.checklist || {}) } };
  out.meals = {};
  for (const key of Object.keys(base.meals)) {
    const m = data.meals?.[key] || {};
    out.meals[key] = {
      ...base.meals[key],
      ...m,
      veg: { ...base.meals[key].veg, ...(m.veg || {}) },
      oils: { ...base.meals[key].oils, ...(m.oils || {}) },
      protein: Array.isArray(m.protein) ? m.protein : [],
    };
  }
  return out;
}

// ---------- dates (always local calendar days, ISO YYYY-MM-DD) ----------

export function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function diffDays(a, b) {
  return Math.round((parseISO(a) - parseISO(b)) / 86400000);
}
export function todayISO() {
  return iso(new Date());
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
export function formatLong(s) {
  const d = parseISO(s);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${WEEKDAYS[d.getDay()]}`;
}
export function formatShort(s) {
  const d = parseISO(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
export function weekdayLabel(s) {
  return WEEKDAYS[parseISO(s).getDay()];
}

/** Phase ranges for a given start date. */
export function schedule(startDate) {
  let cursor = startDate;
  return PHASES.map((p) => {
    const days = p.weeks * 7;
    const range = { ...p, start: cursor, end: addDays(cursor, days - 1), days };
    cursor = addDays(cursor, days);
    return range;
  });
}

/** Where a date sits in the program, or null when outside it. */
export function locate(startDate, date) {
  if (!startDate) return null;
  const idx = diffDays(date, startDate);
  if (idx < 0 || idx >= TOTAL_DAYS) return null;
  let offset = idx;
  for (const p of PHASES) {
    const len = p.weeks * 7;
    if (offset < len) {
      return {
        phase: p,
        dayIndex: idx, // 0-based day in program
        day: idx + 1, // 1..84
        week: Math.floor(idx / 7) + 1, // 1..12
        dayOfWeek: (idx % 7) + 1, // 1..7
        phaseDay: offset + 1,
        phaseWeek: Math.floor(offset / 7) + 1,
      };
    }
    offset -= len;
  }
  return null;
}

export function checklistScore(entry) {
  const vals = Object.values(entry?.checklist || {});
  if (!vals.length) return 0;
  return vals.filter(Boolean).length / CHECKLIST.length;
}

/** Facts that can tick checklist items automatically. */
export function derivedChecks(entry, photos) {
  const meals = ['breakfast', 'lunch', 'dinner'];
  const colors = new Set();
  for (const k of [...meals, 'snack']) {
    const veg = entry.meals[k]?.veg || {};
    for (const [c, n] of Object.entries(veg)) if (n > 0) colors.add(c);
  }
  return {
    weigh: entry.weight !== '' && entry.weight !== null && entry.bodyFat !== '' && entry.bodyFat !== null,
    water: entry.water >= 8,
    sleep7: entry.sleep >= 7,
    veg5: colors.size >= 5,
    photos: meals.every((m) => photos.some((p) => p.meal === m)),
    relax: Number(entry.relaxMins) > 0,
  };
}
