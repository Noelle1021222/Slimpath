# CacheBlend 大冒險

一個用來讀懂論文〈CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion〉的 3D 闖關遊戲。
從 token、向量、Attention、KV Cache、RAG 一路學到 CacheBlend 的方法、系統設計與實驗，內容依據論文原稿與講義《從零理解 CacheBlend》。

這個資料夾和 Slimpath 網站本身無關，也不會被部署（GitHub Pages 只發佈 `public/`）。

## 怎麼玩

直接用瀏覽器打開 `index.html`。

| 操作 | 鍵盤／滑鼠 | 觸控 |
| --- | --- | --- |
| 移動 | WASD、方向鍵，或點地面 | 左下搖桿，或點地面 |
| 跳 | 空白鍵 | 右下「跳」 |
| 互動 | E | 畫面下方的橘色按鈕 |
| 視角 | 拖曳、滾輪 | 拖曳 |
| 地圖／筆記本 | M／N | 右上角按鈕 |

進度存在瀏覽器的 localStorage。裝置不支援 WebGL 時會自動改用「筆記本模式」，教學內容相同。

## 結構

```
index.html          建置後的單一檔案（可直接開啟）
vendor/three.min.js three.js r128（MIT）；CDN 載入失敗時的備援
build.mjs           把 src/ 打包成 index.html
src/page.html       頁面骨架
src/style.css       樣式
src/js/01-util.js … 07-engine.js   工具、音效、存檔、介面、筆記本謎題框架、3D 引擎
src/js/08-builder.js               關卡建造工具（島、橋、站點、角色、裝飾）
src/js/09*-activities.js           3D 小遊戲
src/js/1x-world*.js                每個世界的教學內容與關卡配置
src/js/20-codex.js                 筆記本條目、論文圖表導覽
src/js/30-main.js                  遊戲流程（標題、地圖、通關）
```

修改後執行 `node build.mjs` 重新產生 `index.html`。
