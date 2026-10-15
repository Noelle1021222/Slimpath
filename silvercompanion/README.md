<p align="center"><img src="public/og-image.png" alt="銀髮伴：你不在身邊的時候，有人陪著他們。" width="720" /></p>

# 銀髮伴 SilverCompanion

**你不在身邊的時候，有人陪著他們。**

銀髮伴是長輩／家屬與專業陪伴者的雙邊媒合平台：家屬為爸媽預約經過實名與良民證審核的陪伴者（聊天、陪診、散步、手機教學…），陪伴者出發後家屬即時看到位置，服務結束收到一本「數位聯絡簿」。陪伴者則有自己的工作台：上線接案、接案大廳、行程時間軸、收入與每月提領。

- **前端**：Vite 7 · React 19 · TypeScript · Tailwind CSS 4 · Radix UI · Motion · Zustand · TanStack Query
- **後端**：Supabase（PostgreSQL + RLS、Auth、Realtime、Storage、Edge Functions／Deno）
- **金流**：LINE Pay Online API v3（Request / Confirm / Refund 全在 Edge Functions，**Channel Secret 永不進前端**）
- **地圖**：MapLibre + OpenFreeMap + OSRM（預設，免金鑰）或 Google Maps + Directions（設定金鑰時）

---

## 立即試玩（不需要任何帳號或後端）

```bash
cd silvercompanion
npm install
npm run dev          # http://127.0.0.1:5174
```

沒有設定 Supabase 時會自動進入**示範模式**：資料存在瀏覽器（localStorage），以 BroadcastChannel 模擬 Realtime，LINE Pay 以模擬付款頁取代。首頁或登入頁的「家屬版／陪伴者版」可直接進入示範帳號：

| 身分   | 示範帳號                              | 說明                               |
| ------ | ------------------------------------- | ---------------------------------- |
| 家屬   | 陳怡君 `yijun@silvercompanion.test`   | 照顧陳媽媽、陳爸爸，有進行中的陪診 |
| 陪伴者 | 林小君 `xiaojun@silvercompanion.test` | 已審核、上線中，有待接請求與行程   |

> 開**兩個分頁**，一個用家屬版、一個用陪伴者版：在陪伴者分頁接單、開始導航、送出聯絡簿，家屬分頁會即時收到通知、看到地圖上的移動與聯絡簿。Supabase 版的種子資料（`supabase/seed.sql`）也有同樣的帳號，密碼 `SilverDemo#2026`。

---

## 功能

### 家屬（暖陽版）

- **首頁**：今日健康卡（血壓、血糖、心率、步數，支援藍牙血壓計 Web Bluetooth）、進行中行程橫幅、最新聯絡簿、服務捷徑
- **找陪伴**：服務、縣市／行政區、線上服務、日期與時段、時薪上限篩選；陪伴者卡片顯示評分、標籤、最近可約時段
- **陪伴者介紹**：自我介紹影片（YouTube）、關於我、提供的服務、家屬評價、7 天 × 24 小時空檔月曆
- **預約**：自動帶入長輩檔案的地址與注意事項；LINE Pay 或現金；伺服器端計價（時薪 × 時數、15% 平台服務費）與防重複預約（exclusion constraint）
- **即時追蹤**：陪伴者出發後每 6 秒廣播位置，地圖顯示路線、已走路段與預估抵達時間；抵達自動通知
- **數位聯絡簿**：心情、文字紀錄、最多 9 張照片，可評分與回饋
- **家庭照顧中心**：多位長輩的照顧檔案（行動能力、慢性病、注意事項、地址自動定位）
- **訊息**：與陪伴者即時聊天（快速回覆、已讀）
- **SOS**：一鍵撥打 119、寫入 `sos_alerts`、簡訊通知緊急聯絡人並附上 GPS 位置

### 陪伴者（靜海版）

- **工作台**：上線接案／休息模式開關、本月時數／完成數／評分、可提領餘額（每月提領一次）、下一個行程、新請求
- **接案大廳**：指定給我／公開媒合分頁，依時間、距離、收入排序；接單、婉拒（附原因；LINE Pay 自動退款）或略過
- **我的行程**：未來兩週行程條、依日期分組的時間軸；開始導航（分享位置、螢幕常亮）、我已抵達、填寫聯絡簿完成服務、歷史紀錄
- **個人檔案**：服務項目、服務區域、線上服務、特色標籤、自我介紹、時薪、空檔、影片、收款帳戶、實名與文件審核、「家屬看到的您」即時預覽

### 共同

- Email／手機 OTP／Google／LINE Login，首次登入引導（身分、基本資料、陪伴者時薪與服務）
- 同一帳號可切換家屬／陪伴者身分
- 通知中心（Realtime）、三段字級（整個 App 以 rem 等比放大）
- 一律以 toast 與自訂對話框回饋，不使用 `alert` / `confirm`

---

## 設計

- **兩種身分、一套系統**：家屬端「暖陽」——米色紙感、柿子橘、襯線標題；陪伴者端「靜海」——霧藍、深青、俐落無襯線。以 CSS 變數切換 `data-theme`，所有文字／背景組合 ≥ 4.5:1。
- **品牌**：柿子＝「柿柿如意」；蒂頭的兩片葉子靠在一起，是兩個人並肩。首頁以「描紅」筆順逐筆寫出「伴」（亻＋半），講「小時候他們握著我們的手教我們寫字，現在換我們陪他們」。
- **為長輩設計**：按鈕至少 44 px、三段字級、滑桿數值顯示在拇指上方（不被手指遮住）並標出上下限、手機版底部導覽與 safe-area、`min-h-[100dvh]`、桌機側邊欄獨立捲動、Modal 在手機是 bottom sheet。
- **動態有分寸**：全站支援 `prefers-reduced-motion`；捲動動畫在減少動態時直接呈現最終狀態。

---

## 架構

```
silvercompanion/
├─ src/
│  ├─ pages/            # 路由頁面（landing、auth、onboarding、seeker/*、provider/*、shared/*）
│  ├─ components/
│  │  ├─ ui/            # 設計系統元件（button、responsive-modal、range-slider、tabs…）
│  │  ├─ common/        # AppShell、SOS、聊天、通知、即時地圖、導航覆蓋層
│  │  ├─ seeker/ provider/ landing/
│  ├─ services/         # 每個領域一個 service：Supabase 實作 + 示範模式實作（同一份 contract）
│  │  └─ demo/          # 瀏覽器內後端：同樣的商業規則、Realtime 模擬、GPS 路線模擬
│  ├─ hooks/ store/ lib/ types/
├─ supabase/
│  ├─ migrations/       # 資料表、觸發器、RPC、RLS、Storage、Realtime 政策、pg_cron
│  ├─ functions/        # linepay-request / linepay-confirm / linepay-refund / sos-notify / line-login
│  └─ seed.sql
├─ tests/db/            # 103 條 RLS 與商業規則斷言（純 SQL）
└─ scripts/             # e2e + 無障礙稽核、DB 測試、OG 圖、GitHub Pages fallback
```

- **服務契約**（`src/services/contracts.ts`）：頁面只依賴介面；`isDemo` 決定使用 Supabase 或示範後端，兩者行為一致（同樣的錯誤碼與限制）。
- **supabase-js 動態載入**：示範模式完全不下載 Supabase SDK；設定 Supabase 時於首次渲染前載入。
- **即時位置**：`navigator.geolocation.watchPosition` 節流後透過 Realtime Broadcast 私有頻道 `tracking:order_{order_id}` 傳送，並以 Presence 讓晚加入的家屬立刻拿到最新位置；頻道權限由 `realtime.messages` 的 RLS 控管（只有該訂單的雙方能訂閱、只有陪伴者能發送）。

### 資料庫與權限（RLS）

| 資料                                | 誰看得到                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `kinship_recipients`、`health_logs` | 家屬本人；陪伴者只在**接單後到服務完成前**可讀                                                               |
| `provider_details` 銀行帳號、餘額   | 僅陪伴者本人（欄位層級 GRANT + `provider_public` 視圖只暴露公開欄位）                                        |
| `orders`                            | 訂單雙方；所有狀態轉換只能透過 RPC（`accept_order`、`start_navigation`、`mark_arrived`、`submit_care_log`…） |
| 公開媒合請求                        | 只顯示行政區與四捨五入到 0.01° 的座標，接單後才看到完整地址                                                  |

RPC 皆為 `SECURITY DEFINER` + `search_path = ''`；計價由觸發器在伺服器端重算；`pg_cron` 每 10 分鐘取消逾時未付款的 LINE Pay 訂單。

### LINE Pay v3

1. 前端呼叫 `linepay-request`（帶使用者 JWT）→ Edge Function 驗證訂單屬於本人、金額以資料庫為準，簽章 `Base64(HMAC-SHA256(secret, secret + uri + body + nonce))` 後呼叫 `/v3/payments/request`，回傳付款網址。
2. 使用者在 LINE Pay 授權後回到 `/payment/confirm`，前端呼叫 `linepay-confirm` → 以 `transactionId`（19 位數，解析時保留精度）確認付款並更新訂單。
3. 取消或婉拒已付款訂單時由 `linepay-refund` 退款。

`LINEPAY_CHANNEL_ID`、`LINEPAY_CHANNEL_SECRET`、`LINEPAY_IS_SANDBOX` 只存在 Supabase Secrets。

---

## 部署到正式環境

### 1. Supabase

```bash
supabase link --project-ref <your-project-ref>
supabase db push                                   # 套用 migrations
cp supabase/functions/.env.example supabase/functions/.env   # 填入 LINE Pay、簡訊、LINE Login
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy linepay-request linepay-confirm linepay-refund sos-notify line-login
```

- Dashboard → Database → Extensions 啟用 `pg_cron`（逾時訂單清理）。
- Auth 設定 Site URL 與 Redirect URL（`<site>/auth/callback`）；需要時開啟 Phone（簡訊 OTP）與 Google。
- 需要示範資料時執行 `supabase/seed.sql`。

### 2. 前端

```bash
cp .env.example .env.local     # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY（anon key 本來就公開，靠 RLS 保護）
npm run build                  # 產出 dist/
```

選填：`VITE_GOOGLE_MAPS_API_KEY`（改用 Google Maps）、`VITE_LINE_LOGIN_CHANNEL_ID`、`VITE_DEMO_MODE=true`（強制示範模式，適合展示站）。

**GitHub Pages**：`npm run build:pages` 以 `/Slimpath/silvercompanion/` 為 base 建置（可用 `PAGES_BASE` 覆寫），並產生 `404.html` 讓深層連結可直接開啟。

---

## 品質

```bash
npm run check            # 型別檢查、ESLint（零警告）、Prettier、單元測試、正式建置
npm run test:db          # 拋棄式 PostgreSQL：套用 migration + seed，跑 103 條 RLS／商業規則斷言
npm run test:functions   # Edge Functions 單元測試（Deno）：LINE Pay 簽章、金額、簡訊…
npm run check:functions  # deno check 所有 Edge Functions
npm run e2e              # Playwright：家屬預約 → 陪伴者接單 → 跨分頁即時 → 聯絡簿，
                         # 並以 axe-core 稽核 14 個頁面 × 手機／桌機（WCAG 2.2 AA，零 serious／critical）
```

CI（`.github/workflows/silvercompanion-ci.yml`）在每次變更 `silvercompanion/` 時執行以上全部。
