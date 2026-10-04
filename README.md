# Slimpath · 醬汁計劃生活日誌

把紙本「生活日誌」搬到網頁上：選好開始日，三個階段自動排進行事曆，每天一頁日誌。
網站是純靜態（可放 GitHub Pages），資料、帳號、照片都存在 **Supabase**，手機和電腦同步。

## 功能

- **登入 / 註冊 / 忘記密碼**（Email + 密碼），每個人只看得到自己的資料
- **一鍵排程**：選開始日 → 調適期（2 週）→ 戒斷期（6 週）→ 穩定期（4 週），共 84 天
- **行事曆**：月曆＋84 天進度軌道，顯示階段、第幾天、檢核完成度、體重／照片／喝水標記
- **每日生活日誌**（對照紙本格式）：三餐（＋副餐）的時間、六色蔬菜、蛋白質、油脂、穩定期優質澱粉、餐點照片；今日自我檢核 9 項（部分自動勾選）；睡眠、飲水、心情、放鬆、運動、體重、體脂；明天想更好的事；自動儲存
- **進度頁**：體重／體脂趨勢、84 天檢核熱度、平均睡眠／飲水、心情分佈
- **匯出 JSON**、手機版、深色模式

---

## 部署步驟（第一次，約 10 分鐘）

### 1. 建立 Supabase 專案
1. 到 <https://supabase.com> 註冊並 **New project**（免費方案即可，區域可選 Tokyo / Singapore）。
2. 左側 **SQL Editor → New query**，貼上 [`supabase/schema.sql`](supabase/schema.sql) 全部內容 → **Run**。
   這會建立資料表、照片儲存空間 `meal-photos`，以及「只能讀寫自己資料」的安全規則（RLS）。
3. **Authentication → URL Configuration**
   - **Site URL**：`https://noelle1021222.github.io/Slimpath/`
   - **Redirect URLs** 加入：`https://noelle1021222.github.io/Slimpath/`（本機測試再加 `http://127.0.0.1:5173/`）
4. （可選）**Authentication → Sign In / Providers → Email**：若不想收確認信，可關閉 *Confirm email*。

### 2. 把 Supabase 金鑰交給 GitHub
**Project Settings → API**（或 *Data API / API Keys*）複製：
- **Project URL**（例如 `https://abcd1234.supabase.co`）
- **anon public key**（`eyJ...` 或 `sb_publishable_...`）

到 GitHub repo **Settings → Secrets and variables → Actions → Variables** 分頁，新增：

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public key |

> anon key 本來就是設計給前端公開使用的；真正保護資料的是 RLS 規則。**千萬不要**放 `service_role` key。
> 也可以直接把這兩個值寫進 `public/js/config.js`。

### 3. 開啟 GitHub Pages
1. repo **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
2. 把程式合併到 `master`，`.github/workflows/pages.yml` 會自動測試並部署。之後也可以在 **Actions** 分頁手動 *Run workflow*。
3. 網址：`https://noelle1021222.github.io/Slimpath/`

> ⚠️ **私有 repo** 需要 GitHub Pro 才能使用 Pages。免費帳號可以把 repo 改成 Public——程式碼會公開，但你的紀錄與照片在 Supabase，不在 repo 裡，不會外流。

---

## 本機開發

```bash
npm start      # http://127.0.0.1:5173 （需先在 public/js/config.js 填入 Supabase 設定）
npm test       # 行事曆／階段計算等單元測試
```

## 架構

```
public/                 ← 整個網站（GitHub Pages 發佈這個資料夾）
  index.html, css/app.css
  vendor/supabase.js    supabase-js v2（MIT），內附以免依賴 CDN
  js/config.js          Supabase URL / anon key
  js/api.js             資料存取（Postgres、Storage、Auth）
  js/program.js         三階段、檢核項目、日期計算
  js/views/*.js         登入、開始頁、行事曆、每日日誌、進度、設定
supabase/schema.sql     資料表、RLS、照片 bucket
scripts/serve.js        本機靜態伺服器
.github/workflows/pages.yml  自動部署
```

### 資料表

| 表 | 內容 |
| --- | --- |
| `profiles` | 每位使用者的設定（開始日、性別、起始／目標體重） |
| `entries` | 每人每天一筆：完整日誌 JSON ＋ 體重、體脂、喝水、睡眠、心情、完成項數等欄位 |
| `photos` | 餐點照片紀錄；檔案存在私有 bucket `meal-photos/<user_id>/<date>/…`，以短效簽名網址顯示 |

> 備註：Supabase 免費專案若連續 7 天沒有任何使用會被暫停，回到後台按 *Restore* 即可，資料不會遺失。
