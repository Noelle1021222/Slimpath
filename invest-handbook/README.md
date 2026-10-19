# 讀通投資 · Market Fluency Handbook

從零開始的投資學習手冊。38 章、8 個部，一路讀到能完全看懂兩份文件：

- **GCFIE v3.3-GOLD**：全球資金流 × 台股結構盤前報告規格書
- **台股 5 個月操作計畫**：20 檔分散組合（2026/10/16）

每章有學習目標、圖解（手繪 SVG）、例題、常見誤解、「在你的文件裡」原文解讀、互動工具、重點回顧與自我檢測。
封面的「文件解碼器」會依你讀完的章節，逐段解鎖兩份文件。

> 這是學習教材，不是投資建議。

## 怎麼打開

這是純靜態網站，沒有建置步驟、不需要伺服器端程式：

- **直接開檔**：雙擊 `index.html`（所有腳本都是一般 `<script>`，可在 `file://` 下運作）。
- **本機伺服器**：`npx http-server invest-handbook` 或 `python3 -m http.server`，再開 `http://localhost:8080/`。
- **部署**：把整個資料夾放到任何靜態主機（GitHub Pages、Netlify、Cloudflare Pages）。
  搬到別的專案時，整個 `invest-handbook/` 資料夾複製過去即可，裡面沒有對外部專案的相依。

閱讀進度、深淺色、漲跌顏色（紅漲綠跌／綠漲紅跌）與字級，存在瀏覽器的 localStorage，只在你自己的裝置上。

## 資料夾結構

```
index.html              封面：證券憑證、文件解碼器、K 棒學習地圖、三條路線
glossary.html           附錄 A：名詞總表（可搜尋）
formulas.html           附錄 B：公式卡
chapters/NN-slug.html   38 章
assets/
  css/handbook.css      設計系統：色彩與字體 token、版面、所有元件、SVG 繪圖 class
  css/cover.css         封面
  css/reference.css     名詞表與公式卡
  js/curriculum.js      章節與兩份文件的段落清單（導覽、進度、解碼器的唯一來源）
  js/handbook.js        每頁共用：頂列、目錄抽屜、側欄段落、上下章、名詞彈窗、測驗、進度
  js/glossary-data.js   名詞資料（由 tools/build-glossary.mjs 產生）
  js/data-plan.js       20 檔計畫的數字（互動工具使用）
  js/widgets.js         互動工具框架與共用元件
  js/widgets-*.js       各互動工具
  js/cover.js           封面互動
  js/reference.js       名詞表搜尋
tools/
  check.mjs             章節檢查（結構、圖、連結、名詞、標籤配對）
  shoot.mjs             用 Playwright 截圖手機／桌面、深／淺色，並回報錯誤與溢出
  build-glossary.mjs    合併 tools/glossary/*.json → assets/js/glossary-data.js
  glossary/NN.json      每章負責的名詞
AUTHORING.md            寫作與排版規範（新增或修改章節前先讀）
```

## 維護

```bash
node tools/build-glossary.mjs                 # 更新名詞表
node tools/check.mjs                          # 檢查全部章節
NODE_PATH=$(npm root -g) node tools/shoot.mjs shots index.html chapters/01-first-principles.html
```
