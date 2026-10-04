# Slimpath · 醬汁計劃生活日誌

把紙本「生活日誌」搬到網頁上：選好開始日，三個階段自動排進行事曆，每天一頁日誌，所有紀錄存進 SQLite 資料庫。

## 功能

- **一鍵排程**：選開始日 → 自動排入 調適期（2 週）→ 戒斷期（6 週）→ 穩定期（4 週），共 84 天
- **行事曆**：月曆＋84 天進度軌道，每天顯示階段、第幾天、檢核完成度、體重／照片／喝水標記
- **每日生活日誌**（對照紙本格式）
  - 早餐／午餐／晚餐（＋可選副餐）：用餐時間、六色蔬菜份數、蛋白質種類、好油／堅果／酪梨，穩定期多一欄「優質澱粉」
  - 每餐上傳照片（瀏覽器端自動壓縮）
  - 今日自我檢核 9 項；喝水 8 杯、睡滿 7 小時、體重體脂、五色蔬菜、三餐照片、放鬆練習會**自動勾選**
  - 睡眠時數（月亮）、飲水量（杯子，每杯 250ml）、心情、放鬆靜默練習分鐘、運動消耗、體重、體脂
  - Things that make me better tomorrow
  - 側欄顯示當前階段的飲食重點提醒
  - 自動儲存
- **進度頁**：體重／體脂趨勢圖（含階段背景與目標線）、84 天檢核熱度圖、平均睡眠／飲水、心情分佈
- **資料匯出**：一鍵匯出全部資料為 JSON
- 支援手機版、深色模式、減少動態效果偏好

## 啟動

需要 **Node.js 22.5 以上**（使用內建的 `node:sqlite`，不需要安裝任何套件）。

```bash
npm start
# 開啟 http://127.0.0.1:5173
```

- 資料庫：`data/slimpath.db`（可用 `SLIMPATH_DATA=/path` 改位置）
- 照片：`data/uploads/`
- 埠號／對外開放：`PORT=8080 HOST=0.0.0.0 npm start`（手機在同一個 Wi-Fi 下就能連到電腦記錄）

> 備份只要複製整個 `data/` 資料夾。

## 測試

```bash
npm test
```

## 架構

```
server/
  index.js   HTTP 伺服器：靜態檔案 + JSON API + 照片上傳
  db.js      SQLite schema 與存取（settings / entries / photos）
public/
  index.html, css/app.css
  js/program.js     三階段、檢核項目、日期計算
  js/views/*.js     onboarding、行事曆、每日日誌、進度、設定
test/api.test.js    API 整合測試
```

### API

| Method | Path | 說明 |
| --- | --- | --- |
| GET/PUT | `/api/settings` | 開始日、性別、起始／目標體重 |
| GET | `/api/entries?from=&to=` | 區間內每日摘要（體重、體脂、喝水、睡眠、完成項數…） |
| GET/PUT | `/api/entries/:date` | 單日完整日誌（JSON） |
| POST | `/api/entries/:date/photos?meal=` | 上傳照片（body 為圖片原始資料） |
| DELETE | `/api/photos/:id` | 刪除照片 |
| GET | `/api/export` | 匯出全部資料 |
