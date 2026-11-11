# CacheBlend 大冒險

一個用來讀懂論文〈CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion〉的 3D 闖關遊戲。
從 token、向量、Attention、KV Cache、RAG 一路學到 CacheBlend 的方法、系統設計與實驗，內容依據論文原稿與講義《從零理解 CacheBlend》。

這個資料夾和 Slimpath 網站本身無關，也不會被部署（GitHub Pages 只發佈 `public/`）。

## 九個世界

| # | 世界 | 學什麼 | 3D 小遊戲 |
| --- | --- | --- | --- |
| 1 | 詞元村 | token、embedding、向量與矩陣、自回歸生成 | 收集詞元方塊 |
| 2 | 注意力神殿 | Q／K／V、Attention 計算、因果遮罩、Transformer 層 | 跳地磚點亮因果遮罩 |
| 3 | 快取礦坑 | prefill 與 decode、KV Cache、快取容量 | 有快取／沒快取的生成跑道 |
| 4 | 檢索圖書館 | RAG、chunk 與 top-k、多跳問答、論文圖 2 | 當檢索器取回區塊 |
| 5 | 前綴峽谷 | prefix caching、cross-attention、RoPE、四種方法（圖 1、3、4） | 前綴之橋：沿用還是重算 |
| 6 | 融合熔爐 | 選擇性重算、KV 偏差、HKVD、逐層篩選（圖 5–9） | HKVD 獵場 |
| 7 | 管線碼頭 | 儲存裝置、管線化、loading controller、實作介面（圖 10–11） | 走一遍請求的旅程 |
| 8 | 評測競技場 | TTFT、F1、ROUGE-L、實驗設定與結果（圖 12–19） | 四種方法賽跑 |
| 9 | 魔龍城 | 常見誤解、限制、整篇論文的總結 | 魔龍戰與結業考 |

每個世界的站點完成後會寫進遊戲內的「筆記本」，裡面另有十九張圖的導覽與讀原稿的提醒。

## 怎麼玩

直接用瀏覽器打開 `index.html`。

| 操作 | 鍵盤／滑鼠 | 觸控 |
| --- | --- | --- |
| 移動 | WASD、方向鍵，或點地面 | 左下搖桿，或點地面 |
| 跳 | 空白鍵 | 右下「跳」 |
| 互動 | E（第二個選項按 Q） | 畫面下方的按鈕 |
| 視角 | 拖曳、滾輪 | 拖曳 |
| 地圖／筆記本 | M／N | 右上角按鈕 |

進度存在瀏覽器的 localStorage；在 Claude 的 Artifact 檢視器裡開啟時，也會同步到檢視者自己的帳號資料（`data/users/<id>/save`），換裝置也讀得到。
進度不見時，標題畫面或設定裡的「找回進度」可以選之前打完的世界，直接接著玩。
卡在某個 3D 小遊戲時，可以從左上角的任務清單改用筆記本完成那一站。
裝置不支援 WebGL 時會自動改用「筆記本模式」，教學內容相同。

## 結構

```
index.html          建置後的單一檔案（可直接開啟）
vendor/three.min.js three.js r128（MIT）；CDN 載入失敗時的備援
build.mjs           把 src/ 打包成 index.html
src/page.html       頁面骨架
src/style.css       樣式
src/js/01-util.js … 05-notebook.js   工具、音效、存檔、介面、筆記本謎題框架
src/js/06-widgets-*.js               各世界的互動元件與圖表
src/js/07-engine.js                  3D 引擎（玩家、鏡頭、輸入、碰撞）
src/js/08-builder.js                 關卡建造工具（島、橋、站點、角色、裝飾）
src/js/09*-activities.js             3D 小遊戲
src/js/1x-world*.js                  每個世界的教學內容與關卡配置
src/js/20-codex.js                   筆記本條目、論文圖表導覽
src/js/30-main.js                    遊戲流程（標題、地圖、通關、結業）
dev/                                 Playwright 測試：自動走完每個世界
```

修改後執行 `node build.mjs` 重新產生 `index.html`。

## 測試

`dev/play.cjs` 會用無頭瀏覽器實際走完指定的世界：沿著關卡路線移動、開啟每一站、解完每一步、完成每個小遊戲，最後進傳送門。需要先安裝 Playwright。

```bash
node dev/play.cjs w1,w2,w3,w4,w5,w6,w7,w8,w9
```
