# 讀通投資 · 寫作與排版規範

這份文件給撰寫或修改章節的人（包括 AI 代理）。範本章節是
[`chapters/25-margin-leverage.html`](chapters/25-margin-leverage.html)：結構、元件、圖的寫法都照它做。

---

## 1. 讀者與語氣

- 讀者：台灣的投資新手，想從零讀到能完全看懂兩份文件：
  **GCFIE v3.3-GOLD 盤前報告規格書**，以及 **台股 5 個月操作計畫（20 檔，2026/10/16）**。
- 繁體中文、台灣用語（「券商」「張」「漲停」「營收」「法說會」「資料」不是「數據」以外的大陸用語）。
- 像一位耐心、準確的老師：短句、具體、先講直覺再講公式、每個新名詞第一次出現就解釋。
- GCFIE 大量使用英文術語（Short Covering、Contango、Leveraged Funds…），第一次出現時寫成「中文（English）」。
- 不寫空話與套話：不用「值得注意的是」「總而言之」「讓我們一起」。不用破折號夾帶的旁白，不用「不是 X，而是 Y」的句型堆疊。
- 這是教材，不是投資建議。不寫「建議買進／賣出」，用條件式：「如果……代表……」。

## 2. 正確性（最重要）

1. **兩份文件的內容**：引用要逐字、標出處（`.box.doc` 與 `doc-src`），數字以原文為準。
   原文在 `/tmp/claude-0/-home-user-Slimpath/89d47a7c-4c10-5783-a568-ae16f711fe55/scratchpad/src/`：
   `gcfie.md`（規格書全文）、`plan.txt`（計畫 PDF 轉文字，含表格）、`plan.pdf`。
2. **一般知識與制度**（交易時間、手續費、稅率、契約乘數、融資規定、報告發布時間）：必須正確。
   不確定就用 WebSearch 查證；會變動的規則加「以證交所／期交所／券商公告為準」。
3. **不得虛構市場數據**。示範用的數字要寫「假設」或在圖說標「示意」。
   歷史數字只能來自兩份文件，或你查證過的來源。
4. 書中的「今天」是 2026/10/19；文件資料日是 2026/10/16。不要聲稱知道之後發生的事。
5. 計算題自己算兩次。百分比、倍數、正負號都要對。

## 3. 頁面骨架

複製範本章節的 `<head>`（字型、favicon、CSS、早期主題腳本、八個 JS 檔，順序不變），只改 `<title>`、`description`、`data-chapter`。

```html
<body data-chapter="NN-slug">
<div class="page"><div class="chapter-grid"><main class="chapter" id="main">
  <header class="opener">
    <p class="eyebrow"></p>                       <!-- 自動填入部名 -->
    <div class="opener-num" aria-hidden="true"></div>  <!-- 自動填入章號 -->
    <h1>章名（與 curriculum.js 一致）</h1>
    <p class="lede">一段 60–110 字的導言：這章解決什麼困惑、和兩份文件的關係。</p>
    <dl class="opener-meta"></dl>                  <!-- 自動：難度、時間、解鎖 -->
  </header>
  <section class="objectives" aria-labelledby="obj-h"><h2 id="obj-h">學完這章，你能夠</h2><ol><li>…</li></ol></section>
  <article class="prose">
    <section id="英文短id"><h2><span class="sec-num">NN.1</span>小節標題</h2> … </section>
    …（5–8 個小節，編號連續）
  </article>
  <section class="recap" id="recap"><h2>本章重點</h2><ul><li>…</li></ul></section>
  <section class="quiz-set" id="quiz"><h2>自我檢測</h2><p>每題選一個答案，選完會顯示解析。</p> …quiz… </section>
</main></div></div>
</body>
```

上一章／下一章、側邊段落目錄、頂列、頁尾、「標記為已讀完」都由 `handbook.js` 自動產生，不要手寫。

## 4. 份量

- 每章正文 **4,000–8,000 個中文字**（`tools/check.mjs` 會數），寧可多舉一個例子，不要跳步驟。
- 學習目標 4–6 條；小節 5–8 個；圖 3–6 張；例題至少 1 個（有計算就要有）；常見誤解至少 1 個；
  本章與文件有關的地方用 `.box.doc` 引用原文並解讀；重點回顧 5–7 條；自我檢測 5–6 題（答案位置要分散）。
- 每一個「你的文件裡出現、但讀者看不懂」的詞，都要在某一章被教到。

## 5. 元件

| 用途 | 標記 |
| --- | --- |
| 名詞（點擊出現解釋） | `<span class="term" data-term="本益比">本益比</span>`（文字與 key 相同可省略 `data-term`） |
| 定義框（本章負責的名詞） | `<div class="box define" id="def-xxx"><div class="box-label"><span class="zh"></span><span class="lat">DEFINITION</span></div><p class="term-name"><dfn>名詞</dfn><span class="en">English</span></p><p>解釋…</p></div>` |
| 例題（有步驟的計算） | `.box.example` ＋ `<h4>` 題目 ＋ `<ol class="calc"><li>說明<span class="eq">算式</span></li></ol>` ＋ `<p class="answer">` |
| 常見誤解 | `.box.myth` ＞ `.myth-wrong`（錯的想法）＋ `.myth-right`（正確理解） |
| 文件引用 | `.box.doc`，label 內加 `<span class="doc-src">GCFIE 第十七節</span>` 或 `20 檔計畫 §三`；原文放 `<p class="quote">`，下面寫解讀 |
| 公式 | `.box.formula` ＞ `.formula-line`（可用 `<span class="frac"><span>分子</span><span>分母</span></span>`）＋ `.where` |
| 一句話重點 | `.box.key` |
| 風險提醒 | `.box.warn` |
| 老師的旁註 | `<aside class="note">…</aside>`（放在相關段落後面；寬螢幕會浮到右側欄） |
| 延伸閱讀（可收合） | `<details class="deep"><summary>標題</summary><div>…</div></details>` |
| GCFIE 燈號 | `<span class="sig g">綠燈</span>`、`sig y` 黃、`sig o` 橙、`sig r` 紅、`sig w` 白（未確認）。**不要用 emoji**。 |
| 表格 | `<div class="table-wrap"><table class="data"><caption>…</caption><thead>…</thead><tbody>…</tbody></table></div>`；數字欄加 `class="r"` |
| 可勾選清單（會記住） | `<ul class="checklist" data-key="唯一key"><li>…</li></ul>` |
| 漲跌色字 | `<span class="up">+3.2%</span>`、`<span class="down">−1.4%</span>`（台灣預設紅漲綠跌，讀者可切換） |

`.box-label` 的中文字（定義、例題、公式…）由 CSS 自動產生，`<span class="zh"></span>` 保持空白。
負號用「−」（U+2212），數字千分位用逗號。

## 6. 圖（SVG）規則

圖是這本手冊最重要的教學工具。每張圖畫的是**機制**（錢怎麼流、什麼變了、哪一條線被跨過），不是裝飾。

```html
<figure class="fig">
  <div class="fig-plate">
    <svg viewBox="0 0 400 300" role="img" aria-label="一句話說出這張圖的結論">
      …
    </svg>
  </div>
  <figcaption><span class="fig-n"></span><span>圖說：這張圖要讀者看到什麼。</span></figcaption>
</figure>
```

- **寬度**：一般圖 `viewBox` 寬 **360–420**（手機上幾乎 1:1 顯示，文字才看得清楚）；高度依內容。
  真的需要寬的流程圖、時間軸：`<figure class="fig wide">`，把 svg 包在
  `<div class="fig-scroll" style="--fig-min:600px">` 裡，寬度可到 760，手機會左右滑動。
- **文字**：預設 14px；`t-sm`（12.5px）是最小的正文；`t-xs`（11px）只用在座標刻度。標籤寫短（2–8 字），長解釋放圖說。
- **顏色只用 class**，不寫色碼（深色模式才會正確）：
  - 文字：`t-2` 次要、`t-3` 淡、`t-accent` 雕版藍、`t-up` 漲、`t-down` 跌、`t-paper`（深色塊上的反白字）、`t-red`
  - 字體：`t-b` 粗、`t-serif` 標題宋體、`t-mono` 數字、`t-num` 斜體數字、`t-hand` 手寫；`ta-m` 置中、`ta-e` 靠右
  - 線：`s-ink` `s-2` `s-3` `s-rule` `s-accent` `s-up` `s-down` `s-g` `s-y` `s-o` `s-r`；粗細 `s-1` `s-15` `s-2w` `s-3w`；`s-dash` `s-dot` `s-round`
  - 填色：`f-plate`（圖底色）`f-soft` `f-ink` `f-2` `f-3` `f-rule` `f-accent` `f-accent-soft` `f-wash` `f-foil` `f-foil-soft` `f-up` `f-up-soft` `f-down` `f-down-soft` `f-g` `f-y` `f-o` `f-r` `f-w` `f-none`；類別色 `f-c1`–`f-c4`／`s-c1`–`s-c4`（同一張圖最多 4 類，並加文字標籤）
  - 不透明度 `o-50` `o-25`
- 每個形狀都要有填色 class（線條用 `f-none`）。箭頭用 `<marker>`，**id 在整頁唯一**（例如 `ar17a`），marker 內的 path 也用 class 上色。
- 想要捲動進畫面時「畫出來」的線，加 class `draw`（只用在 path/line/polyline）。
- 不准在 svg 裡放 `<script>`、`<style>`、`<foreignObject>`、外部圖片。
- 漲跌顏色有意義：`up` 是上漲（台灣慣例紅色）、`down` 是下跌。風險燈號用 `f-g/f-y/f-o/f-r`。
- 示意數字在圖說註明「示意」。座標軸刻度要和資料一致。
- 畫完務必用 `tools/shoot.mjs` 截圖，看手機版：文字不能重疊、不能超出框、不能小到看不見。

## 7. 互動工具

在正文中放 `<div class="widget" data-widget="名稱" data-…></div>`，`data-note` 會顯示在工具下方。
可用的工具與參數：

| 名稱 | 用途 | 參數（預設） |
| --- | --- | --- |
| `compound` | 複利成長 | `data-principal`(100000) `data-monthly`(0) `data-rate`(年%,7) `data-years`(20) |
| `recovery` | 虧損後回本需要的漲幅 | `data-loss`(%,30) |
| `tradecost` | 台股買賣成本與損益兩平 | `data-price`(1000) `data-shares`(1000) `data-discount`(折,6) `data-kind`(stock/etf/daytrade) |
| `pointpct` | 指數點數與百分比 | `data-level`(前一日收盤,47111) `data-points`(-1656) |
| `candle` | K 棒解剖 | `data-open`(100) `data-high`(108) `data-low`(96) `data-close`(105) |
| `ma` | 均線與支撐壓力（示意走勢） | `data-days`(120) `data-show`("10,20,60") |
| `pe` | 本益比、EPS 成長與本益比壓縮 | `data-eps`(150) `data-pe`(16) `data-growth`(%,30) `data-pe2`(20) `data-pe1`(26) |
| `bond` | 債券價格與殖利率蹺蹺板 | `data-coupon`(%,4) `data-years`(10) `data-yield`(%,4) |
| `yieldcurve` | 殖利率曲線形狀 | `data-shape`(normal/flat/inverted/bear-steepen/bull-steepen) |
| `discount` | 利率上升對「近現金」與「遠現金」資產的折現衝擊 | `data-rate`(%,4) `data-shock`(%,1) |
| `fxreturn` | 匯率對外資報酬的影響 | `data-stock`(%,10) `data-fx`(台幣升值%,-3) |
| `futures` | 期貨損益、保證金與槓桿 | `data-contract`(TX/MTX/TMF/ES/NQ/MES/MNQ) `data-side`(long/short) `data-entry` `data-move` |
| `payoff` | 選擇權到期損益圖 | `data-type`(call/put) `data-side`(buy/sell) `data-strike`(100) `data-premium`(5) |
| `vixcurve` | VIX 期限結構與 GCFIE 判讀 | `data-state`(contango/flat/backwardation) `data-trend`(up/flat/down) |
| `positioning` | 部位週變化分類（加多、減空…） | `data-dlong`(20000) `data-dshort`(-50000) `data-who`("Leveraged Funds") |
| `squeeze` | 軋空三階段 | `data-stage`(1) |
| `scenario` | 情境機率與期望報酬 | `data-preset`("plan") |
| `riskscore` | GCFIE 風險分數組成（教學版） | — |
| `terminal` | GCFIE 末端結構五條件 | — |
| `validation` | 前一日預警 → 當日價格驗證 | — |
| `timeline` | 計畫的進出場時間軸與事件 | — |
| `margin` | 融資維持率 | `data-own`(1000000) `data-ratio`(60/50) `data-move`(0) |
| `quadrant` | 外資期現四象限＋價格優先 | `data-spot`(buy/sell) `data-fut`(long/short) `data-price`(up/down) |
| `ladder` | 計畫個股的買進區、停損、目標價 | `data-code`("2330") |
| `allocation` | 20 檔分組權重 | — |
| `sizing` | 權重換算股數、零股、分批 | `data-capital`(1000000) `data-code`("8046") |

工具旁邊一定要有文字說明「試著做什麼、會看到什麼」。

## 8. 名詞表

- 本章**負責定義**的名詞（見各章簡報的「負責名詞」）：在正文用 `.box.define`（重要的）或在段落中清楚解釋，並在 `tools/glossary/NN.json` 寫入：
  ```json
  { "chapter": 17, "terms": [ { "term": "未平倉量", "en": "Open interest (OI)", "def": "≤80 字的定義", "anchor": "本章中可跳轉的 id", "aliases": ["OI"] } ] }
  ```
- 其他章負責的名詞，在本章只要用 `<span class="term" data-term="…">` 標起來，讀者點了就看得到解釋。
  key 必須和負責章節的名詞完全一致（清單在簡報最上方）。
- 跑 `node tools/build-glossary.mjs` 合併，`node tools/check.mjs chapters/NN-*.html` 會列出還找不到的名詞。

## 9. 連結

- 章與章：`<a href="17-futures.html#oi">第 17 章</a>`（同一個資料夾）。只連到存在的 id。
- 名詞表：`../glossary.html`；公式卡：`../formulas.html`；封面：`../index.html`。
- 外部資料來源可以連（官方網站優先），用完整 https 網址。

## 10. 完成前的檢查

```bash
node tools/build-glossary.mjs
node tools/check.mjs chapters/NN-slug.html        # 不能有 ERROR
NODE_PATH=/opt/node22/lib/node_modules node tools/shoot.mjs /tmp/…/shots chapters/NN-slug.html
```

截圖後用 Read 看手機版（phone-light）與桌面版：文字重疊、圖超出框、互動工具載入失敗、深色模式看不清楚，都要修。
