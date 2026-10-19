/* 讀通投資 — chapter registry. Single source of truth for navigation, the
   index page, progress tracking and the "document decoder" on the cover. */
window.HB = window.HB || {};

HB.parts = [
  { n: 1, name: "地基", title: "錢、風險與市場", en: "Foundations" },
  { n: 2, name: "公司", title: "財報與估值", en: "Companies" },
  { n: 3, name: "總經", title: "利率、匯率與跨資產", en: "Macro" },
  { n: 4, name: "衍生品", title: "期貨、選擇權與波動率", en: "Derivatives" },
  { n: 5, name: "籌碼", title: "台股法人、台指期與融資", en: "Positioning" },
  { n: 6, name: "產業", title: "AI 供應鏈與景氣循環", en: "Industry" },
  { n: 7, name: "實戰", title: "配置、紀律與心理", en: "Practice" },
  { n: 8, name: "畢業", title: "讀懂你的兩份文件", en: "Capstone" },
];

HB.chapters = [
  { n: 1, part: 1, slug: "01-first-principles", title: "投資的第一原理：報酬、風險與時間", short: "報酬、風險與時間", level: 1, min: 25 },
  { n: 2, part: 1, slug: "02-what-is-a-stock", title: "股票是什麼：從一張股票到一個股價", short: "股票是什麼", level: 1, min: 25 },
  { n: 3, part: 1, slug: "03-tw-trading", title: "台股交易實務：時間、單位、成本與規則", short: "台股交易實務", level: 1, min: 30 },
  { n: 4, part: 1, slug: "04-us-global-markets", title: "美股與全球市場：時差、ADR 與夜盤", short: "美股與全球市場", level: 2, min: 25 },
  { n: 5, part: 1, slug: "05-indices-breadth", title: "指數與市場廣度：市場的溫度計", short: "指數與市場廣度", level: 2, min: 30 },
  { n: 6, part: 1, slug: "06-candles-trends", title: "K 線、均線與趨勢：讀懂價格的語言", short: "K 線、均線與趨勢", level: 2, min: 35 },

  { n: 7, part: 2, slug: "07-three-statements", title: "三大財報地圖：一家公司的錢怎麼流", short: "三大財報地圖", level: 2, min: 30 },
  { n: 8, part: 2, slug: "08-income-metrics", title: "損益表與獲利指標：從營收到 EPS", short: "損益表與 EPS", level: 2, min: 35 },
  { n: 9, part: 2, slug: "09-balance-cashflow", title: "資產負債表與現金流：體質、資本支出與自由現金流", short: "資產負債與現金流", level: 3, min: 35 },
  { n: 10, part: 2, slug: "10-valuation", title: "估值：本益比、目標價與本益比壓縮", short: "估值與本益比", level: 3, min: 35 },
  { n: 11, part: 2, slug: "11-earnings-expectations", title: "法說會、財測與「利多出盡」", short: "財測與利多出盡", level: 3, min: 30 },

  { n: 12, part: 3, slug: "12-rates-fed", title: "利率、通膨與聯準會", short: "利率與聯準會", level: 2, min: 35 },
  { n: 13, part: 3, slug: "13-bonds-yields", title: "債券與殖利率：為什麼長端利率會壓估值", short: "債券與殖利率", level: 3, min: 40 },
  { n: 14, part: 3, slug: "14-fx-dollar-yen", title: "匯率：美元、日圓與外資的錢", short: "美元、日圓與匯率", level: 3, min: 30 },
  { n: 15, part: 3, slug: "15-commodities", title: "原物料：油價、黃金與通膨連鎖", short: "油價與黃金", level: 2, min: 25 },
  { n: 16, part: 3, slug: "16-risk-on-off", title: "Risk-on／Risk-off 與資金輪動", short: "Risk-on／off 與輪動", level: 3, min: 35 },

  { n: 17, part: 4, slug: "17-futures", title: "期貨入門：保證金、槓桿與未平倉", short: "期貨入門", level: 3, min: 40 },
  { n: 18, part: 4, slug: "18-options", title: "選擇權入門：買權、賣權與損益圖", short: "選擇權入門", level: 3, min: 45 },
  { n: 19, part: 4, slug: "19-sentiment", title: "Put/Call、SKEW 與 0DTE：情緒的溫度計", short: "情緒指標", level: 4, min: 30 },
  { n: 20, part: 4, slug: "20-volatility-vix", title: "波動率與 VIX：市場願意付多少錢買保險", short: "波動率與 VIX", level: 4, min: 40 },
  { n: 21, part: 4, slug: "21-cftc-positioning", title: "誰在做多、誰在做空：CFTC 部位報告", short: "CFTC 部位報告", level: 4, min: 40 },
  { n: 22, part: 4, slug: "22-short-covering", title: "空單回補與軋空三階段", short: "軋空三階段", level: 4, min: 35 },

  { n: 23, part: 5, slug: "23-tw-institutions", title: "三大法人：外資、投信與自營商", short: "三大法人", level: 2, min: 30 },
  { n: 24, part: 5, slug: "24-taifex-quadrant", title: "台指期籌碼與期現四象限", short: "期現四象限", level: 4, min: 35 },
  { n: 25, part: 5, slug: "25-margin-leverage", title: "融資融券與槓桿數學", short: "融資與槓桿", level: 3, min: 35 },

  { n: 26, part: 6, slug: "26-ai-chain-map", title: "AI 供應鏈全景：錢從哪裡來、流到哪裡去", short: "AI 供應鏈全景", level: 3, min: 35 },
  { n: 27, part: 6, slug: "27-chips-packaging-memory", title: "晶片、先進封裝與記憶體", short: "晶片、封裝與記憶體", level: 4, min: 40 },
  { n: 28, part: 6, slug: "28-boards-to-racks", title: "從載板到機櫃：PCB、CCL、散熱、電源與光通訊", short: "從載板到機櫃", level: 4, min: 40 },
  { n: 29, part: 6, slug: "29-cycles-bottlenecks", title: "景氣循環、瓶頸與定價權", short: "瓶頸與定價權", level: 4, min: 35 },
  { n: 30, part: 6, slug: "30-ai-rally-history", title: "歷史的韻腳：2023–2026 AI 行情與急跌", short: "AI 行情史", level: 3, min: 30 },

  { n: 31, part: 7, slug: "31-allocation", title: "資產配置與部位管理", short: "資產配置", level: 3, min: 35 },
  { n: 32, part: 7, slug: "32-entry-exit", title: "進出場紀律：分批、停損與停利", short: "分批、停損與停利", level: 3, min: 40 },
  { n: 33, part: 7, slug: "33-scenarios-ev", title: "情境分析、機率與期望值", short: "情境與期望值", level: 3, min: 30 },
  { n: 34, part: 7, slug: "34-psychology", title: "投資心理與紀律", short: "投資心理", level: 2, min: 25 },

  { n: 35, part: 8, slug: "35-gcfie-structure", title: "拆解 GCFIE（上）：方法論、資料時間軸與 14 章", short: "拆解 GCFIE（上）", level: 5, min: 45 },
  { n: 36, part: 8, slug: "36-gcfie-signals", title: "拆解 GCFIE（下）：風險分數、末端結構與驗證循環", short: "拆解 GCFIE（下）", level: 5, min: 45 },
  { n: 37, part: 8, slug: "37-plan-decoded", title: "逐節拆解你的 20 檔操作計畫", short: "拆解 20 檔計畫", level: 5, min: 45 },
  { n: 38, part: 8, slug: "38-premarket-sop", title: "每日盤前 SOP：自己做一份報告", short: "每日盤前 SOP", level: 5, min: 35 },
];

/* The two documents this handbook teaches you to read. Each section lists
   the chapters you need before it reads clearly. */
HB.docs = [
  {
    id: "gcfie",
    name: "GCFIE v3.3-GOLD",
    sub: "全球資金流 × 台股結構盤前報告",
    sections: [
      { t: "核心目的：Risk-on、Risk-off 還是高檔脆弱", needs: [1, 16] },
      { t: "方法論：DATA → EVIDENCE → … → PRICE CONFIRMATION", needs: [35] },
      { t: "資料時間軸：收盤、電子盤、CFTC 發布延遲", needs: [4, 17, 21] },
      { t: "第1章　30 秒結論與今日定調燈號", needs: [35, 36] },
      { t: "第2章　全球市場 DATA：道瓊、S&P、SOX、VIX、10Y、DXY", needs: [5, 13, 14, 15, 20] },
      { t: "第3章　全球資金流與輪動", needs: [16] },
      { t: "第4章　ES／NQ 部位：Asset Manager、Leveraged Funds", needs: [17, 21] },
      { t: "Short Covering 黃金判讀三階段", needs: [22] },
      { t: "VIX 與期限結構：Contango、Backwardation", needs: [20] },
      { t: "Put／Call、SKEW、0DTE 情緒", needs: [18, 19] },
      { t: "末端結構模型與風險分數", needs: [22, 36] },
      { t: "第5章　跨資產：期限溢酬、AI 融資與長端利率", needs: [9, 13, 14] },
      { t: "第7章　AI 半導體：Beat-and-Raise But Stock Falls", needs: [11, 26] },
      { t: "第8章　台股法人與台指期", needs: [23, 24] },
      { t: "台股期現四象限與「價格優先於籌碼」", needs: [24] },
      { t: "前一日預警 → 當日價格驗證", needs: [36] },
      { t: "第9–10章　產業輪動與台股供應鏈映射", needs: [27, 28] },
      { t: "第11–12章　條件式交易策略與風險矩陣", needs: [32, 36] },
      { t: "第13–14章　非顯而易見觀察與「今天只看一個指標」", needs: [36, 38] },
      { t: "禁止事項與 GOLD 核心哲學", needs: [34, 35] },
    ],
  },
  {
    id: "plan",
    name: "台股 5 個月操作計畫",
    sub: "20 檔分散組合（2026/10/16）",
    sections: [
      { t: "一、先校準期望：翻倍與分散為何難以兩全", needs: [1, 25, 31] },
      { t: "二、盤勢摘要：CPI、外資賣超、升息一碼、本益比 26 倍", needs: [5, 10, 12, 23] },
      { t: "三、20 檔配置表：權重、買進區、停損、目標價", needs: [3, 31, 32] },
      { t: "四、選股理由：EPS、本益比、月營收、ABF、ASIC", needs: [8, 10, 27, 28] },
      { t: "五、進出場時間軸：聯準會、選舉、財報、封關", needs: [11, 12, 33] },
      { t: "六、操作紀律：停損、移動停利、零股與交易成本", needs: [3, 6, 32] },
      { t: "七、每週追蹤清單：外資、融資、殖利率、CoreWeave", needs: [9, 13, 23, 25] },
      { t: "八、AI 瘋潮回顧：每年一次兩成急跌", needs: [30] },
      { t: "九、需求端：CSP 資本支出與舉債", needs: [9, 26] },
      { t: "十、供給端：CoWoS、HBM、T-glass、EML、變壓器", needs: [27, 28, 29] },
      { t: "十一、情境機率、期望報酬與配置調整", needs: [33, 37] },
    ],
  },
];

HB.chapterBySlug = function (slug) {
  return HB.chapters.find(function (c) { return c.slug === slug; });
};
HB.chapterByNum = function (n) {
  return HB.chapters.find(function (c) { return c.n === n; });
};
