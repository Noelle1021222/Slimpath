/* The 20-stock plan (台股5個月操作計畫，2026/10/16 版本), transcribed for the
   teaching widgets. Prices are the plan's reference prices, not live quotes. */
window.HB = window.HB || {};

HB.plan = {
  asOf: "2026/10/16",
  capital: 1000000,
  groups: [
    { id: "core", name: "核心權值", weight: 32, rule: { buy: -7, stop: -14 }, note: "壓艙石：大型、獲利能見度高" },
    { id: "growth", name: "AI成長", weight: 30, rule: { buy: -10, stop: -18 }, note: "AI 供應鏈瓶頸環節" },
    { id: "beta", name: "高彈性", weight: 7, rule: { buy: null, stop: -22 }, note: "波動最大，只放小部位、等拉回" },
    { id: "hedge", name: "分散／避險", weight: 19, rule: { buy: -5, stop: -12 }, note: "與 AI 連動較低的對沖" },
    { id: "cash", name: "現金", weight: 12, rule: null, note: "加碼與應急預備金" },
  ],
  stocks: [
    { code: "2330", name: "台積電", group: "core", w: 12, ref: 2420, buy: [2250, 2420], stop: 2080, t1: 2800, t2: 3300, note: "法人估2027年EPS約150元，約16倍本益比" },
    { code: "2454", name: "聯發科", group: "core", w: 5, ref: 4250, buy: [3950, 4250], stop: 3650, t1: 4900, t2: 5450, note: "傳出字節跳動AI ASIC訂單" },
    { code: "2308", name: "台達電", group: "core", w: 5, ref: 1635, buy: [1520, 1635], stop: 1405, t1: 1880, t2: 2100, note: "伺服器電源＋液冷" },
    { code: "2317", name: "鴻海", group: "core", w: 4, ref: 244, buy: [227, 244], stop: 210, t1: 280, t2: 312, note: "AI伺服器組裝大廠" },
    { code: "2382", name: "廣達", group: "core", w: 2, w0: 3, ref: 320, approx: true, buy: [298, 320], stop: 275, t1: 368, t2: 410, note: "參考價為10/16盤中；Q3營收單季破兆" },
    { code: "3711", name: "日月光投控", group: "core", w: 4, ref: 671, buy: [624, 671], stop: 577, t1: 772, t2: 860, note: "承接CoWoS後段外包" },
    { code: "2383", name: "台光電", group: "growth", w: 6, w0: 5, ref: 5165, buy: [4650, 5165], stop: 4240, t1: 6000, t2: 7000, note: "高階CCL龍頭，9月營收年增約169%" },
    { code: "3017", name: "奇鋐", group: "growth", w: 4, ref: 3315, buy: [2980, 3315], stop: 2720, t1: 3800, t2: 4145, note: "目標2＝法人目標價" },
    { code: "8046", name: "南電", group: "growth", w: 5, w0: 4, ref: 1355, buy: [1220, 1355], stop: 1110, t1: 1630, t2: 1870, note: "ABF缺貨、長約價每季調漲" },
    { code: "3037", name: "欣興", group: "growth", w: 3, ref: 1090, buy: [980, 1090], stop: 895, t1: 1310, t2: 1500, note: "ABF載板產能最大" },
    { code: "6669", name: "緯穎", group: "growth", w: 3, w0: 4, ref: 1845, buy: [1660, 1845], stop: 1515, t1: 2210, t2: 2550, note: "9月營收創新高、年增近一倍" },
    { code: "3661", name: "世芯-KY", group: "growth", w: 4, ref: 3685, buy: [3320, 3685], stop: 3020, t1: 4420, t2: 5100, note: "2027年預估本益比約22倍" },
    { code: "2345", name: "智邦", group: "growth", w: 5, ref: 1980, buy: [1780, 1980], stop: 1625, t1: 2380, t2: 2730, note: "9月營收年增約66%" },
    { code: "4979", name: "華星光", group: "beta", w: 3.5, ref: 520, buy: [460, 505], stop: 405, t1: 650, t2: 755, note: "本益比近89倍，不追價" },
    { code: "2408", name: "南亞科", group: "beta", w: 3.5, ref: 480, approx: true, buy: [420, 465], stop: 375, t1: 600, t2: 690, note: "參考價為10/16盤中；記憶體景氣後段風險" },
    { code: "2891", name: "中信金", group: "hedge", w: 5, ref: 73.6, buy: [70, 73.6], stop: 64.8, t1: 81, t2: 87, note: "升息循環利差受惠" },
    { code: "2886", name: "兆豐金", group: "hedge", w: 3, ref: 53.7, buy: [51, 53.7], stop: 47.3, t1: 59, t2: 63.5, note: "美元放款利差受惠" },
    { code: "6505", name: "台塑化", group: "hedge", w: 4, ref: 120, approx: true, buy: [114, 120], stop: 105.5, t1: 125, t2: 135, note: "油價上漲避險；參考價為10/16盤中；法人目標125" },
    { code: "1519", name: "華城", group: "hedge", w: 4, ref: 663, approx: true, buy: [630, 663], stop: 583, t1: 790, t2: 950, note: "參考價為10/13收盤；法人目標980" },
    { code: "1513", name: "中興電", group: "hedge", w: 3, ref: 165, approx: true, buy: [157, 165], stop: 145, t1: 181, t2: 195, note: "參考價為10/13收盤；目標1＝法人目標價" },
  ],
  scenarios: [
    { name: "樂觀", p: 30, lo: 20, hi: 30, idx: "51,000–55,000", trigger: "CSP 上修 2027 資本支出；聯準會只再升一次或暫停；信用利差收斂" },
    { name: "基準", p: 50, lo: 5, hi: 15, idx: "44,000–51,000", trigger: "基本面續強，但利率與信用消息造成來回震盪" },
    { name: "悲觀", p: 20, lo: -15, hi: -12, idx: "38,000–43,000", trigger: "再一次信用事件或 AI 營收不如預期，引發融資斷頭潮" },
  ],
  phases: [
    { id: 1, name: "建倉", from: "2026-10-19", to: "2026-11-04", hold: "40–50%" },
    { id: 2, name: "加碼", from: "2026-11-05", to: "2026-12-10", hold: "80–85%" },
    { id: 3, name: "抱住停利", from: "2026-12-10", to: "2027-01-31", hold: "約 88%" },
    { id: 4, name: "節前降碼", from: "2027-02-01", to: "2027-02-05", hold: "約 60%" },
    { id: 5, name: "出場", from: "2027-02-11", to: "2027-03-10", hold: "逐步降至 0%" },
  ],
};

HB.planGroup = function (id) {
  return HB.plan.groups.find(function (g) { return g.id === id; });
};
