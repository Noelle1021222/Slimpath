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
      '一日三餐（或 168 指定兩餐），20:00 後禁食，不吃宵夜與下午茶',
      '精緻澱粉與糖減半：白飯麵食量減半，不足的份量用肉類、蔬菜補足',
      '每餐 ≤ 600 kcal（一日 1000–1800 kcal），用 FatSecret 等 APP 記錄',
      '一日五蔬果：水果限 1 碗、16:00 前吃完，其餘吃彩虹蔬菜',
      '喝足 2000cc 純白開水；體重 > 70kg 以「體重 × 30cc」計算，不以咖啡或茶替代',
      '每口細嚼 20 下；嚴禁油炸、加工食品及減脂藥品',
      '23:00 前就寢、睡滿 7 小時（23:00–03:00 是生長激素分泌的黃金代謝期）',
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

// Daily self-check items. 調適期 follows the class handout (12 items);
// the other phases follow the paper journal (9 items).
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

export const ADAPT_CHECKLIST = [
  { id: 'weigh', label: '空腹量體重 / 體脂', hint: '起床上完廁所、喝水前量' },
  { id: 'lemon', label: '晨起飲用溫檸檬水', hint: '檸檬汁 : 水 ≥ 1 : 20' },
  { id: 'meals3', label: '一日三餐・澱粉減半・無宵夜下午茶' },
  { id: 'water', label: '喝足純白開水', hint: '不以咖啡、茶替代' },
  { id: 'fruit', label: '一日五蔬果', hint: '水果 ≤ 1 碗且 16:00 前吃完' },
  { id: 'chew', label: '每口食物細嚼慢嚥 20 下' },
  { id: 'fast20', label: '晚上 20:00 後停止進食', hint: '喝水除外' },
  { id: 'kcal', label: '用 APP 紀錄三餐熱量', hint: '單餐 ≤ 600 kcal' },
  { id: 'photos', label: '三餐食物照片上傳群組相簿' },
  { id: 'podcast', label: '收聽 Spotify「內在微氣候」15 分鐘' },
  { id: 'sleep', label: '23:00 前就寢，睡滿 7 小時' },
  { id: 'positive', label: '保持正向心態，鼓勵與支持隊友' },
];

export const checklistFor = (phaseId) => (phaseId === 'adapt' ? ADAPT_CHECKLIST : CHECKLIST);
const ALL_CHECK_IDS = [...new Set([...CHECKLIST, ...ADAPT_CHECKLIST].map((c) => c.id))];

export const MEAL_KCAL_LIMIT = 600;

/** Daily water goal: 2000cc, or body weight × 30cc above 70kg. */
export function waterGoalMl(weight) {
  const w = Number(weight);
  return w > 70 ? Math.ceil((w * 30) / 50) * 50 : 2000;
}

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
    kcal: '',
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
    checklist: Object.fromEntries(ALL_CHECK_IDS.map((id) => [id, false])),
    sleep: 0,
    bedtime: '',
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

export function checklistScore(entry, items = CHECKLIST) {
  if (!items.length) return 0;
  return items.filter((c) => entry?.checklist?.[c.id]).length / items.length;
}

/** True when a bedtime like "22:40" falls before 23:00 (after-midnight times count as late). */
export function inBedBy23(bedtime) {
  if (!/^\d{2}:\d{2}$/.test(bedtime || '')) return false;
  const [h] = bedtime.split(':').map(Number);
  return h < 23 && h >= 12;
}

/** Facts that can tick checklist items automatically. */
export function derivedChecks(entry, photos, { weight } = {}) {
  const meals = ['breakfast', 'lunch', 'dinner'];
  const colors = new Set();
  for (const k of [...meals, 'snack']) {
    const veg = entry.meals[k]?.veg || {};
    for (const [c, n] of Object.entries(veg)) if (n > 0) colors.add(c);
  }
  const filled = (v) => v !== '' && v !== null && v !== undefined;
  const goal = waterGoalMl(filled(entry.weight) ? entry.weight : weight);
  const kcals = meals.map((m) => entry.meals[m]?.kcal);
  const bed = inBedBy23(entry.bedtime);
  return {
    weigh: filled(entry.weight) && filled(entry.bodyFat),
    water: entry.water * 250 >= goal,
    sleep7: entry.sleep >= 7,
    bed23: bed,
    sleep: bed && entry.sleep >= 7,
    veg5: colors.size >= 5,
    photos: meals.every((m) => photos.some((p) => p.meal === m)),
    relax: Number(entry.relaxMins) > 0,
    kcal: kcals.every((k) => filled(k) && Number(k) <= MEAL_KCAL_LIMIT),
  };
}
