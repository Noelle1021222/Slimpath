// ===== World 7: 管線碼頭 (handout lessons 15-17, paper §5-6, Figs 10-11) =====
WORLDS.push({
  id: 'w7', no: 7, name: '管線碼頭', en: 'Pipeline Harbor', color: '#3f6fb0',
  desc: '把 KV 搬進 GPU：管線化與系統設計', lessons: '講義第 15–17 課・論文 §5–6',
  intro: [
    ['kv', '這裡是<b>管線碼頭</b>。一櫃一櫃的 KV 快取，都要從倉庫吊進 GPU 才能用。'],
    ['kv', '上一關我們把「計算」省到剩 15%。可是剩下 85% 的 KV 還是得<b>搬</b>。搬運也要時間。'],
    ['kv', '碼頭長派普有個聰明的排班方法。去找他吧。']
  ],
  outro: [
    ['pip', '一邊吊貨、一邊加工，誰也不等誰。你把整套系統的排班都摸熟了。'],
    ['kv', '第七片碎片！方法和系統都有了，只差一件事：<b>拿出證據</b>。下一站，評測競技場。']
  ],
  stations: [
    {
      id: 'store', name: '倉庫區', title: '倉庫區：KV 存在哪裡', sub: '講義第 15 課', look: 'machine', codex: ['storage'],
      steps: [
        { t: 'info', kicker: 'STORAGE', title: '快取很大，總得找地方放',
          html: '<p>第 3 世界算過：一段 4096 token 的上下文，KV Cache 就能到 GB 等級。全部塞在 GPU 記憶體裡不切實際。</p><div class="tw"><table class="t"><tr><th>位置</th><th>特性</th></tr><tr><td>GPU 記憶體</td><td>GPU 直接可用；容量最小、最貴</td></tr><tr><td>CPU RAM</td><td>容量較大；用之前要搬進 GPU</td></tr><tr><td>SSD／NVMe</td><td>容量大、可長期保存；讀取較慢</td></tr><tr><td>更慢的磁碟、遠端物件儲存</td><td>最便宜；還要加上網路延遲</td></tr></table></div><p><b>不管放哪裡，要用的時候都得先載入 GPU。</b></p>' },
        { t: 'order', q: '由快到慢排列（同時也是由貴到便宜）。',
          items: ['GPU 記憶體', 'CPU RAM', 'NVMe SSD', '較慢的磁碟／遠端物件儲存'] },
        { t: 'fill', q: '估算載入時間：要搬的位元組數 ÷ 傳輸頻寬。',
          html: '某一層的 KV 有 64 MB，裝置的有效吞吐量是 4 GB/s（= 4000 MB/s）<br>載入時間 ≈ 64 ÷ 4000 秒 = {0} ms',
          blanks: [{ a: 16 }], hint: '64 ÷ 4000 = 0.016 秒。換成毫秒是多少？',
          after: '這就是控制器估算載入時間的方式：<code>T_load = 每個 token 的 KV 大小 × 長度 ÷ 裝置吞吐量</code>。' },
        { t: 'match', q: '搬運相關的名詞。',
          pairs: [['Offload', '把資料移出 GPU'], ['Load／Fetch', '把需要的資料載入'], ['H2D', 'Host to device：CPU 端記憶體搬到 GPU'], ['Cache miss', '找不到可用的既有快取，只能重新計算']] }
      ]
    },
    {
      id: 'pipe', name: '管線吊臂', title: '管線吊臂：一邊載入，一邊重算', sub: '講義第 15 課・論文 §5', look: 'terminal', codex: ['pipelining'],
      steps: [
        { t: 'info', kicker: 'BASIC INSIGHT', title: '兩件事可以同時做',
          html: '<p>CacheBlend 每一層都有兩件工作：<span class="c1">把這一層預存的 KV 載入 GPU</span>，以及 <b>重算這一層選中的 token</b>。</p><p>關鍵觀察：某一層要重算哪些 token，只取決於<b>上一層</b>的結果。所以 GPU 在重算第 i 層的時候，搬運那一邊可以<b>同時去載入第 i+1 層</b>的 KV。</p><p class="lead">論文的 Basic insight：只要重算比載入快，妥善地把兩者管線化，重算帶來的額外延遲就可以忽略。</p>' },
        { t: 'pipeline', q: '每層載入 16 ms、重算 3 ms，共 3 層。把排程調到最快。', load: 16, comp: 3,
          after: '一件一件做要 3 × (16 + 3) = <b>57 ms</b>；重疊之後是 16 + 16 + 16 + 3 = <b>51 ms</b>。穩定運作時，每層的步調約為 <b>max(載入, 重算)</b>，不再是兩者相加。這是論文舉的 Llama-7B 例子：重算 15% 每層 3 ms，從 NVMe SSD 載入一層 16 ms。' },
        { t: 'fill', q: '換一台大模型（論文的 Llama-70B 例子）：每層載入只要 4 ms，重算卻要 7 ms。已經管線化。', fig: 'pipeB', load: 4, comp: 7,
          html: '三層全部完成 = 4 + 7 + 7 + 7 = {0} ms<br>穩定後每一層的步調 ≈ max(4, 7) = {1} ms',
          blanks: [{ a: 25 }, { a: 7 }],
          after: '這次是<b>重算</b>比較慢，載入藏在重算後面，但重算本身藏不住。管線化能消掉「相加的等待」，並不會把兩件工作都變成零成本。' },
        { t: 'choice', q: '所以，什麼情況下「重算幾乎不增加延遲」？',
          opts: [
            ['載入比重算慢的時候：重算可以藏在載入的時間裡', 1, '這時延遲由載入主導。'],
            ['重算比載入慢的時候', 0, '這時每層的步調由重算決定，重算的成本看得到。'],
            ['任何時候都不增加', 0, '要看誰比較慢。']
          ],
          after: '所以需要一個<b>控制器</b>，聰明地決定「重算多少」和「存在哪裡」。' }
      ]
    },
    {
      id: 'ctrl', name: '控制塔', title: '控制塔：Loading Controller 怎麼做決定', sub: '講義第 16 課・論文 §5.1、圖 10', look: 'altar', codex: ['controller'],
      steps: [
        { t: 'info', kicker: 'LOADING CONTROLLER', title: '兩個估算器',
          html: '<p>控制器有兩個事先量好的估算器：</p><ul><li><b>重算時間</b>　<code>T_recompute = r% × 完整 prefill 的時間</code></li><li><b>載入時間</b>　<code>T_load = 每 token 的 KV 大小 × 長度 ÷ 裝置吞吐量</code></li></ul><p>它要回答兩個問題：① 儲存裝置固定時，重算比例該設多少？② 重算比例固定時，該用哪種儲存裝置？</p>' },
        { t: 'ratio', q: '問題 ①：裝置固定，選重算比例',
          after: '在這個例子裡是 <b>26.8%</b>：重算時間剛好等於載入時間。比它少，是白白放棄品質；比它多，延遲才開始增加。' },
        { t: 'fill', q: '但品質有底線。控制器最後取 max(讓兩者相等的比例, 15%)。',
          html: '<span class="lbl">情況甲</span>　完整 prefill 每層 50 ms，載入每層 4 ms<br>讓兩者相等的比例 = 4 ÷ 50 = {0}%　→　控制器選 {1}%<br><span class="lbl">情況乙</span>　完整 prefill 每層 50 ms，載入每層 16 ms<br>讓兩者相等的比例 = 16 ÷ 50 = {2}%　→　控制器選 {3}%',
          blanks: [{ a: 8 }, { a: 15 }, { a: 32 }, { a: 32 }],
          hint: '甲：8% 低於品質底線 15%，所以選 15%。乙：32% 高於 15%，可以多算一點。',
          after: '15% 是論文從實驗（圖 16）得到的「品質幾乎不掉」的最低比例。所以就算裝置很快（例如 CPU RAM），<b>延遲的下限仍是那 15% 的重算時間</b>。' },
        { t: 'choice', q: '問題 ②：重算比例固定在 15%（每層重算 7.5 ms）。哪一個儲存裝置最划算？', fig: 'devices',
          cap: '仿論文圖 10(b)，數值為教學示意。',
          opts: [
            ['SSD（32 Gbps）：不增加延遲的裝置裡最便宜的', 1, '載入 6 ms，藏得進 7.5 ms 的重算裡。'],
            ['GPU 記憶體：最快', 0, '有管線化之後延遲一樣是 7.5 ms，卻最貴。'],
            ['SSD（4 Gbps）：最便宜', 0, '載入 48 ms 遠大於重算，延遲暴增。'],
            ['CPU RAM', 0, '延遲一樣是 7.5 ms，但比 SSD（32 Gbps）貴。']
          ],
          after: '規則：在 <code>T_load ≤ T_recompute</code> 的裝置裡，挑<b>儲存成本最低</b>的。管線化讓 CacheBlend 可以把 KV 放在比較慢、比較便宜的裝置上，卻不增加延遲。' }
      ]
    },
    { id: 'flow', name: '請求之旅', title: '請求之旅：走一遍整套系統', kind: 'act',
      fallback: { steps: [{ t: 'order', q: '一筆請求在 CacheBlend 系統裡的旅程（論文圖 11）。',
        items: ['使用者送出問題，進到 Loading Controller', '取得這一題檢索到的文字區塊', '到 KV Cache Store 查這些區塊的 KV 在不在、存在哪', '把 KV 逐層載入，交給 Fusor 做選擇性重算', '融合後的 KV 交給 LLM', 'LLM 生成答案，送回使用者'] }] } },
    {
      id: 'impl', name: '工程藍圖', title: '工程藍圖：三個元件與實作介面', sub: '講義第 16–17 課・論文 §5.1、§6', look: 'board', codex: ['store', 'fusor', 'interfaces'],
      steps: [
        { t: 'match', q: '三個主要元件各自負責什麼？',
          pairs: [
            ['Loading controller', '估算載入與重算時間，決定重算比例與儲存裝置'],
            ['KV cache store', '保存「文字區塊 → KV 快取」的對應；空間滿了就淘汰'],
            ['Fusor（融合器）', '逐層載入 KV，做選擇性重算，把多份快取融合起來']
          ],
          after: 'Fusor 的 fusion <b>不是把兩份 KV 做平均</b>，是把各區塊的快取放到對的位置，再用局部 forward 更新選定的 token。' },
        { t: 'info', kicker: 'IMPLEMENTATION', title: '蓋在 vLLM 上面',
          html: '<p>論文把 CacheBlend 實作在推論引擎 <b>vLLM</b> 上，大約 3000 行 Python（PyTorch 2.0），程式碼開源在 <b>LMCache</b> 專案。</p><p>使用者先上傳可能重複使用的文字區塊，系統算好 KV 並回傳一個文件 ID。之後的請求帶上這些 ID，並在輸入裡用特殊記號 <code>&lt;DOC&gt;</code> 標出區塊要放的位置。</p>' },
        { t: 'match', q: '論文 §6 的介面。',
          pairs: [
            ['prefill_layer(input_dict, KVCache)', '對某一層做局部 prefill，輸出是下一層的輸入'],
            ['synchronize()', '每一層開始前，確認這層的 KV 已經載入 GPU'],
            ['precompute_kv(doc) → doc_id', '上傳文件，預先算好並存下它的 KV'],
            ['fetch_kv_layer(doc_id, layer_id)', '把某份文件某一層的 KV 從儲存區搬進 GPU'],
            ['all_reduce_sum(per_rank_kv_dev)', '多張 GPU 時，把各張卡算出的 KV 偏差加總']
          ] },
        { t: 'choice', q: 'Ping-pong buffer 是什麼？',
          opts: [
            ['兩個緩衝區輪流用：一個給這一層計算，另一個同時接收下一層的 KV，做完交換', 1, '這就是「邊算邊載入」在 GPU 上的實作方式。'],
            ['把 KV 在兩張 GPU 之間來回複製', 0, '它是同一張卡上的兩塊緩衝區。'],
            ['快取被淘汰前的暫存區', 0, '淘汰策略是另一回事。']
          ] },
        { t: 'choice', q: '儲存空間滿了，KV cache store 淘汰誰？',
          opts: [['最久沒被使用的那一份（LRU）', 1], ['最大的那一份', 0, '論文用的是 LRU：least recently used。'], ['隨機一份', 0, '論文用的是 LRU。']],
          after: '另外兩個細節：① 實作上只用 <b>K 的偏差或 V 的偏差</b>其中之一，就足以找出 HKVD token。② 模型分散在多張 GPU 時（例如 Llama-70B 的 8 個 KV head 分在 2 張卡），每張卡先各算一部分的偏差，再用 all-reduce 加總。' }
      ]
    }
  ],
  gate: {
    id: 'gate', name: '碼頭試煉', title: '碼頭試煉', sub: '派普的三個問題', look: 'board',
    steps: [
      { t: 'choice', kicker: '第 1 題', q: '每層載入 16 ms、重算 3 ms，共 3 層，已經管線化。全部完成要多久？',
        opts: [['51 ms', 1, '16 + 16 + 16 + 3。'], ['57 ms', 0, '那是一件做完再做下一件的時間。'], ['19 ms', 0, '那只是一層的載入加重算。'], ['48 ms', 0, '最後一層還要重算 3 ms。']] },
      { t: 'choice', kicker: '第 2 題', q: '載入時間等於「重算 8%」的時間。品質底線是 15%。控制器選多少？',
        opts: [['15%', 1, 'max(8%, 15%)。這時延遲由重算主導。'], ['8%', 0, '低於品質底線。'], ['23%', 0, '是取較大值，不是相加。'], ['100%', 0, '那就等於完整重算了。']] },
      { t: 'choice', kicker: '第 3 題', q: '真正執行「逐層選擇性重算」的是哪個元件？',
        opts: [['Fusor', 1], ['Loading controller', 0, '它負責估算和決定比例。'], ['KV cache store', 0, '它負責保存和查找 KV。'], ['檢索器', 0, '它負責找出相關的文字區塊。']] }
    ]
  },
  build(ctx) {
    const lv = ctx.lv;
    lv.killY = -18;
    const box = (x, z, y, c, w, hgt, d) => B.crate(x, z, y, w || 2.4, hgt || 1.8, d || 1.8, c);
    const P = B.path(0, 6, 0, 'F');
    const A = P.island(17, 12);
    lv.spawn = { x: 0, y: 0, z: 3.8 };
    B.npc('pip', -3.4, 0.8, 0, { accent: 0x3f6fb0, trim: 0xffd166, hat: 'helmet' }, () => (ctx.done('pipe')
      ? [['pip', '吊臂在動的時候，加工台別閒著。這就是管線化。']]
      : [['pip', '我是碼頭長派普。貨櫃裡裝的都是 KV 快取，又大又重。'], ['pip', '先到右邊的倉庫區，認識一下貨都放在哪。']]));
    ctx.station('store', 3.8, -1.6, 0);
    box(-6.4, -4.2, 0, 0x5b7fd6); box(-6.4, -4.2, 1.8, 0xec8b3c, 2.2, 1.6, 1.7); box(-3.8, -4.4, 0, 0x4fa866); box(6.6, 3.8, 0, 0xd9544f); box(6.8, -4.4, 0, 0x6b7280, 2.2, 1.6, 1.8);
    B.lamp(1.9, -5.4, 0, 0xffd166); B.lamp(-1.9, -5.4, 0, 0xffd166); B.lamp(-7.6, 4.6, 0, 0xffd166);
    B.decal('管線碼頭', 0, 0, 1.6, { h: 1.05, color: '#16324f' });
    B.gemRow(-1, 1.6, 1, -2, 0, 3, 'a');
    P.gate({ need: ['store'], label: '先完成：倉庫區' });
    P.bridge(4);
    B.gemRow(P.x, P.z + 3, P.x, P.z + 1, 0, 2, 'b');
    const C = P.island(15, 13);
    ctx.station('pipe', C.x - 0.6, C.z - 2.2, 0);
    // a gantry crane
    const crane = (x, z) => { B.box(x - 2, 3, z, 0.4, 6, 0.4, 0xffd166, { solid: true, walk: false }); B.box(x + 2, 3, z, 0.4, 6, 0.4, 0xffd166, { solid: true, walk: false }); B.box(x, 6.1, z, 5.4, 0.5, 0.6, 0xffd166); const hook = B.box(x, 4.4, z, 0.14, 3, 0.14, COL.ink); const cargo = B.box(x, 2.6, z, 1.4, 1.1, 1.2, 0x5b7fd6); lv.anims.push((dt, t) => { const k = Math.sin(t * 0.7) * 1.3; hook.position.x = x + k; cargo.position.x = x + k; cargo.position.y = 2.6 + Math.sin(t * 1.4) * 0.3; }); };
    crane(C.x + 3.6, C.z - 5.4);
    box(C.x - 5.4, C.z + 4.6, 0, 0x4fa866); box(C.x - 5.4, C.z - 4.8, 0, 0xec8b3c); B.lamp(C.x + 6.2, C.z + 5.2, 0, 0xffd166);
    P.exit('R');
    P.gate({ need: ['pipe'], label: '先完成：管線吊臂' });
    P.bridge(5);
    B.gemRow(P.x - 4, P.z, P.x - 1, P.z, 0, 2, 'c');
    const D = P.island(15, 13);
    ctx.station('ctrl', D.x + 0.4, D.z - 2, 0);
    B.box(D.x - 4.6, 2.6, D.z - 4.4, 1.6, 5.2, 1.6, 0x5f6f7f, { solid: true, walk: false }); B.box(D.x - 4.6, 5.7, D.z - 4.4, 2.6, 1.0, 2.6, COL.ink); B.box(D.x - 4.6, 5.7, D.z - 3.08, 2.2, 0.6, 0.06, 0xffe9a8, { basic: true, cast: false });
    box(D.x + 5, D.z + 4.6, 0, 0xd9544f); box(D.x + 5, D.z - 4.8, 0, 0x5b7fd6); B.lamp(D.x - 6, D.z + 5.2, 0, 0xffd166);
    P.exit('F', 2);
    P.gate({ need: ['ctrl'], label: '先完成：控制塔' });
    P.bridge(4);
    B.gemRow(P.x, P.z + 3, P.x, P.z + 1, 0, 2, 'd');
    const H = P.island(32, 24);
    ACT.flow(ctx, {
      id: 'flow', y: 0, cx: H.x, cz: H.z, rx: 17, rz: 13,
      stops: [
        { key: 'user', name: '使用者', x: H.x - 11, z: H.z + 6.5, lh: 4.2, hw: 1.4, hd: 1.3 },
        { key: 'ctrl', name: 'Loading Controller', x: H.x - 4.5, z: H.z - 1, lh: 6.2, hw: 1.5, hd: 1.5 },
        { key: 'ret', name: '檢索器', x: H.x - 11.5, z: H.z - 7.5, lh: 3.6, hw: 1.7, hd: 0.7 },
        { key: 'store', name: 'KV Cache Store', x: H.x + 9, z: H.z - 7.5, lh: 3.6, hw: 3.5, hd: 1.3 },
        { key: 'fusor', name: 'Fusor 融合器', x: H.x + 4.5, z: H.z - 0.5, lh: 4.4, hw: 1.3, hd: 1.3 },
        { key: 'llm', name: 'LLM 推論引擎', x: H.x + 11, z: H.z + 6, lh: 5.2, hw: 1.5, hd: 1 }
      ],
      order: ['user', 'ctrl', 'ret', 'store', 'fusor', 'llm', 'user'],
      carry: [['問題', COL.gold], ['問題', COL.gold], ['區塊清單 ×4', COL.blue], ['KV 快取 ×4', COL.cyan], ['融合後的 KV', COL.green], ['答案', COL.orange]],
      hints: ['先去找「使用者」拿問題。', '問題要先進到 CacheBlend 的大腦：Loading Controller。', '控制器需要知道這一題檢索到哪些文字區塊。去找檢索器。', '有了區塊清單，要查它們的 KV 在不在、放在哪。去 KV Cache Store。', '載入的 KV 要逐層做選擇性重算。去 Fusor。', '融合好的 KV 要交給負責生成的 LLM。', '把答案送回給使用者。'],
      says: [
        [['sys', '使用者：「無人機可以用在農業上嗎？」（論文圖 11 的例子）']],
        [['pip', '① 問題先送到 <b>Loading Controller</b>。它得先知道：這一題檢索到了哪些文字區塊？']],
        [['pip', '② 檢索器找回 4 個區塊：無人機 #1、#2，農業 #1、#2。']],
        [['pip', '③ <b>KV Cache Store</b> 查到了：4 個區塊的 KV 都在，存在 SSD 上。'], ['pip', '控制器據此算出重算比例，並開始把 KV 一層一層載入 GPU 的佇列。']],
        [['pip', '④ <b>Fusor</b> 每拿到一層，就做選擇性重算，直到所有層都完成。'], ['pip', '⑤ 融合後的 KV 快取出爐！']],
        [['pip', 'LLM 直接拿融合好的 KV 開始生成，不用再對那 4 個區塊做完整 prefill。']],
        [['sys', '⑥ 答案送達：「可以，無人機……」']]
      ],
      win: [['pip', '如果這次出現了新的區塊，它的 KV 也會存回倉庫，下次就能直接用。'], ['kv', '你剛剛走的路線，就是論文圖 11。綠色星星標的兩個元件，Loading Controller 和 Fusor，是 CacheBlend 自己加進去的。']]
    });
    box(H.x - 14, H.z - 1, 0, 0xec8b3c); box(H.x + 14, H.z - 1.4, 0, 0x4fa866); box(H.x + 14, H.z - 1.4, 1.8, 0x5b7fd6, 2.2, 1.6, 1.7); box(H.x - 2, H.z + 9.6, 0, 0xd9544f); box(H.x + 2.6, H.z + 9.8, 0, 0x6b7280, 2.2, 1.6, 1.8);
    B.lamp(H.x - 7, H.z + 10, 0, 0xffd166); B.lamp(H.x + 7, H.z + 10, 0, 0xffd166); B.lamp(H.x, H.z - 10.6, 0, 0xffd166); B.lamp(H.x - 14.6, H.z - 10.6, 0, 0xffd166); B.lamp(H.x + 14.6, H.z + 10.6, 0, 0xffd166);
    B.gemRow(H.x - 6, H.z + 4, H.x + 6, H.z + 4, 0, 3, 'e');
    P.exit('L', -4);
    P.gate({ need: ['flow'], label: '先完成：請求之旅' });
    P.bridge(3);
    P.stairs(4, 0.45, 3);
    P.bridge(2);
    const F = P.island(16, 18);
    ctx.station('impl', F.x - 0.6, F.z - 4.8, P.y);
    ctx.station('gate', F.x - 0.4, F.z + 1.6, P.y);
    B.portal(F.x - 4.4, F.z + 6.2, P.y, '前往世界地圖');
    // lighthouse
    for (let i = 0; i < 5; i++) B.box(F.x + 5, P.y + 0.8 + i * 1.6, F.z - 6.6, 2.2 - i * 0.24, 1.6, 2.2 - i * 0.24, i % 2 ? COL.rose : COL.paper, Object.assign({ geo: 'cyl' }, i === 0 ? { solid: true, walk: false } : {}));
    B.box(F.x + 5, P.y + 8.6, F.z - 6.6, 0.7, 0.9, 0.7, 0xffe9a8, { geo: 'cyl', basic: true, cast: false });
    const beam = makeGlow(0xffe9a8, 7); beam.position.set(F.x + 5, P.y + 8.6, F.z - 6.6); lv.group.add(beam);
    box(F.x - 5.6, F.z - 7, P.y, 0x4fa866); box(F.x + 5.6, F.z + 6.6, P.y, 0x5b7fd6); B.lamp(F.x + 5.4, F.z + 1, P.y, 0xffd166);
    B.flag(F.x + 1.2, F.z - 0.2, P.y, 0xffd166); B.flag(F.x - 2, F.z - 0.2, P.y, 0xffd166);
    B.gemRow(F.x + 2, F.z + 4.6, F.x + 5, F.z + 3, P.y, 2, 'f');
    const s2 = B.stone(A.x + 10.6, A.z + 1, 1.0, 2.2); B.gem(s2.x, 2.1, s2.z, 'g0');
  }
});
