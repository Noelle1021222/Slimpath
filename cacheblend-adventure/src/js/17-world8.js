// ===== World 8: 評測競技場 (handout lessons 18-21, paper §7, Figs 12-19, Tables 2-3) =====
WORLDS.push({
  id: 'w8', no: 8, name: '評測競技場', en: 'Evaluation Arena', color: '#c9a21c',
  desc: '怎麼量快慢與品質、論文測出了什麼', lessons: '講義第 18–21 課・論文 §7',
  intro: [
    ['kv', '歡迎來到<b>評測競技場</b>！方法再漂亮，也要上場比過才算數。'],
    ['kv', '論文第 7 節就是一整場比賽：比誰先吐出第一個字，也比誰答得對。'],
    ['kv', '裁判長伊娃很嚴格。先弄懂計分規則，才看得懂記分板。']
  ],
  outro: [
    ['eva', '你會算倍數、會看指標、會讀圖，也知道每個數字是在什麼條件下量出來的。這才叫看懂實驗。'],
    ['kv', '第八片碎片，集滿了！融合之刃重新成形。最後一站：<b>延遲魔龍</b>的城堡。']
  ],
  stations: [
    {
      id: 'metric', name: '計時台', title: '計時台：效能指標與加速倍數', sub: '講義第 18 課', look: 'terminal', codex: ['ttft', 'speedup'],
      steps: [
        { t: 'match', q: '先認識計時用的指標。',
          pairs: [
            ['TTFT', '第一個輸出 token 出現之前的等待時間'],
            ['Throughput（吞吐量）', '單位時間內完成的工作量'],
            ['End-to-end latency', '整個請求從頭到尾完成所需的時間'],
            ['Request rate', '每秒送進系統的請求數'],
            ['Batch size', '一起處理的請求（序列）數量']
          ],
          after: 'CacheBlend 降低的是長上下文的 prefill 成本，所以論文最主要看 <b>TTFT</b>。延遲越低越好，吞吐量越高越好。' },
        { t: 'fill', q: '加速倍數怎麼算。TTFT 從 3 秒降到 1 秒：',
          html: '加速倍數 = 3 ÷ 1 = {0} 倍<br>減少的比例 = (3 − 1) ÷ 3 ≈ {1} %',
          blanks: [{ a: 3 }, { a: 66.7, tol: 0.5 }], hint: '2 ÷ 3 ≈ 0.667，也就是 66.7%。',
          after: '加速 3 倍，是「減少約 66.7%」，不是「減少 300%」。' },
        { t: 'fill', q: '吞吐量從每秒 2 筆變成每秒 8 筆：',
          html: '變成原本的 8 ÷ 2 = {0} 倍<br>增加的幅度 = (8 − 2) ÷ 2 = {1} %',
          blanks: [{ a: 4 }, { a: 300 }],
          after: '「4 倍」和「增加 300%」是同一件事的兩種說法。延遲和吞吐量的分子分母方向相反，別顛倒。' },
        { t: 'fill', q: '只加速一部分。原本 prefill 3 秒、後續生成 2 秒，總共 5 秒。現在 prefill 加速 3 倍：',
          html: '新的總時間 = 1 + 2 = {0} 秒<br>整體加速 = 5 ÷ 3 ≈ {1} 倍',
          blanks: [{ a: 3 }, { a: 1.67, tol: 0.02 }],
          after: '整體只有 1.67 倍，不是 3 倍。<b>TTFT 快三倍，不代表整段回答也快三倍</b>：後續生成、檢索、排隊的時間沒有跟著變快。' }
      ]
    },
    {
      id: 'quality', name: '品質裁判席', title: '品質裁判席：F1、ROUGE-L 與其他指標', sub: '講義第 19 課', look: 'scale', codex: ['f1', 'rouge'],
      steps: [
        { t: 'info', kicker: 'QUALITY', title: '品質是「和參考答案比較」量出來的',
          html: '<p>品質指標是一套規則：拿模型的輸出，去和資料集的參考答案比較。</p><p>分數接近，代表<b>在這套規則下</b>表現接近。它不代表文字逐字相同，也不保證每個事實都正確。</p>' },
        { t: 'fill', q: 'F1 分數。標準答案是「New York」，模型回答「New York City」。重疊的詞有 2 個。',
          html: '<span class="lbl">Precision</span>（回答的詞有多少是對的）= 2 ÷ 3 ≈ {0}<br><span class="lbl">Recall</span>（標準答案的詞有多少被答到）= 2 ÷ 2 = {1}<br><span class="lbl">F1</span> = 2 × P × R ÷ (P + R) = {2}',
          blanks: [{ a: 0.67, tol: 0.011 }, { a: 1 }, { a: 0.8, tol: 0.011 }],
          hint: '2 × 0.667 × 1 ÷ (0.667 + 1) = 1.333 ÷ 1.667。',
          after: '多答一個字，F1 就掉到 0.8。所以論文在短答案的資料集上，會提示模型「五個字以內作答」，減少答案長度造成的影響。' },
        { t: 'fill', q: 'ROUGE-L 看「最長共同子序列」：順序要一樣，但不必相鄰。',
          html: '「A B C D」和「A X C D」的最長共同子序列是 A C D，長度 = {0}',
          blanks: [{ a: 3 }],
          after: 'ROUGE-L 常用來評估摘要。換句話說可能讓分數降低，所以它和 F1 一樣，只是「在這個規則下」的相近程度。' },
        { t: 'match', q: '論文表 3：每個資料集用哪個指標？',
          pairs: [
            ['2WikiMQA、Musique（多文件問答）', 'F1 分數'],
            ['SAMSum、MultiNews（摘要）', 'Rouge-L 分數'],
            ['RepoBench（程式碼補全）', 'Edit similarity 編輯相似度'],
            ['Loong（長上下文推理）', 'ChatGPT-as-a-judge 模型當評審']
          ],
          after: '摘要寫「五個資料集」，但表 3 實際列了六個。讀報告時以各實驗明列的範圍為準。' },
        { t: 'choice', q: 'F1 從 0.80 掉到 0.78。下面哪個說法正確？',
          opts: [
            ['絕對下降 0.02；相對下降 2.5%', 1, '0.02 ÷ 0.80 = 2.5%。'],
            ['相對下降 2%', 0, '0.02 是絕對差。相對降幅要除以原本的 0.80。'],
            ['下降了 20%', 0, '0.02 不是 0.2。']
          ],
          after: '論文寫「品質損失 0.02」指的是分數的<b>絕對差</b>。' }
      ]
    },
    {
      id: 'setup', name: '選手檢錄處', title: '選手檢錄處：誰來比、怎麼比', sub: '講義第 20 課・論文 §7.1', look: 'lectern', codex: ['setup', 'baselines'],
      steps: [
        { t: 'info', kicker: 'SETUP', title: '六個模型、兩組機器',
          html: '<div class="tw"><table class="t"><tr><th>模型</th><th>測試配置</th></tr><tr><td>Mistral-7B</td><td>1 張 A40</td></tr><tr><td>Yi-34B</td><td>1 張 A40，8-bit 量化</td></tr><tr><td>Llama-70B</td><td>2 張 A40，8-bit 量化</td></tr><tr><td>Qwen3-30B-A3B、gpt-oss-20B</td><td>2 張 H100</td></tr><tr><td>Ministral-8B</td><td>列在受測模型中</td></tr></table></div><p>兩組機器都配 1 TB 的 NVMe SSD，實測吞吐量分別是 4.8 GB/s 和 6.8 GB/s。主要比較（圖 12）用前三個模型；後三個是為了測不同架構（圖 18）。</p>' },
        { t: 'bucket', q: '論文表 2：這個模型是哪一種架構？',
          buckets: ['Full attention ＋ dense MLP', 'Sliding window ＋ dense MLP', 'Full attention ＋ MoE', 'Sliding window ＋ MoE'],
          items: [['Mistral-7B', 0], ['Yi-34B', 0], ['Llama-70B', 0], ['Ministral-8B', 1], ['Qwen3-30B-A3B', 2], ['gpt-oss-20B', 3]],
          after: 'Sliding window attention 只讓 token 參考有限的近期範圍；MoE（mixture of experts）改變的是 FFN 那一段。這兩種新架構 CacheBlend 都測過。' },
        { t: 'match', q: '比較的對象（baselines）。',
          pairs: [
            ['Full KV recompute', '原始文字直接送進 LLM，prefill 時算出全部 KV'],
            ['Prefix caching', '存下常用前綴的 KV；非前綴的部分照樣計算'],
            ['Full KV reuse', 'PromptCache 的做法：各區塊的 KV 直接拼接'],
            ['MapReduce', '先平行摘要每個區塊，再把摘要餵給 LLM 作答'],
            ['MapRerank', '每個區塊各自作答並打信心分數，取最高分的那個']
          ] },
        { t: 'choice', q: '論文對 prefix caching 做了一個「對它有利」的理想化假設。是什麼？',
          opts: [
            ['假設把 KV 從 RAM 或 SSD 載入 GPU 完全不花時間', 1, '所以它在論文裡的表現，比真實情況還好一些。'],
            ['假設它每次都命中全部區塊', 0, '它仍然只能重用前綴。'],
            ['假設它不需要儲存空間', 0, '論文正好指出它得為同一區塊存多個版本。']
          ] },
        { t: 'choice', q: '主要比較（圖 12）裡，每筆請求的上下文長什麼樣子？',
          opts: [
            ['檢索出的 6 個區塊，每塊 512 token', 1, '用 SentenceTransformers 的 embedding、依 L2 距離取前 6 名。'],
            ['1 個區塊，4096 token', 0, '是多個區塊，這正是論文關心的情境。'],
            ['45 個區塊，每塊 128 token', 0, '128 token 是圖 2 那個動機實驗的切法。']
          ],
          after: '另外，測吞吐量的 extended 資料集會<b>略過最前面 1000 筆請求</b>：那時快取還是空的，不該算進統計。讀數字時要連同這些條件一起讀。' }
      ]
    },
    { id: 'race', name: '四強賽跑', title: '四強賽跑：延遲與品質能否兼顧', kind: 'act',
      fallback: { steps: [{ t: 'bucket', q: '論文圖 12：這個方法落在圖的哪裡？（橫軸 TTFT，縱軸品質）',
        buckets: ['左上：快，品質好', '左下：快，品質差', '右上：慢，品質好'],
        items: [['CacheBlend', 0], ['Full KV reuse', 1], ['Prefix caching', 2], ['Full KV recompute', 2]],
        after: '和完整重算相比，CacheBlend 的 TTFT 低 2.2–3.3 倍，F1 與 Rouge-L 的下降在 0.02 以內。' }] } },
    {
      id: 'load', name: '高壓擂台', title: '高壓擂台：請求變多還撐得住嗎', sub: '論文 §7.2、圖 14', look: 'machine', codex: ['results'],
      steps: [
        { t: 'info', kicker: 'KEY TAKEAWAYS', title: '論文第 7 節的三個結論',
          html: '<ul><li><b>TTFT</b>：比 full KV recompute 低 <b>2.2–3.3 倍</b>。</li><li><b>品質</b>：比 full KV reuse 好很多（F1、Rouge-L 從約 0.15 提升到約 0.35）；和 full KV recompute、prefix caching 相比，只掉 <b>0.01–0.03</b>。</li><li><b>吞吐量</b>：相同 TTFT 下，比 full KV recompute 高最多 <b>5 倍</b>，比 prefix caching 高 <b>3.3 倍</b>。</li></ul><p>前兩點剛才在跑道上看過了。第三點要看「請求越來越多」的時候。</p>' },
        { t: 'loadtest', q: '',
          after: '0.84 ÷ 0.20 ≈ 4.2 倍。論文圖 14 的結論：在相近的品質下，CacheBlend 可以承受 <b>2.8–5 倍</b>的請求率。每筆請求佔用 GPU 的時間變短，同樣的機器就能服務更多人。' },
        { t: 'choice', q: '為什麼 prefix caching 在這種多區塊的情境下撐不久？',
          opts: [
            ['同一個區塊前面接不同內容，就得存不同版本的 KV；儲存空間固定時，命中率比較低', 1, '論文 §7.2 的解釋。'],
            ['因為它的品質比較差', 0, '它的品質和完整重算一樣好，問題出在省不到多少 prefill。'],
            ['因為它不能用 GPU', 0, '和硬體無關。']
          ] },
        { t: 'choice', q: '讀圖 14 時，橫軸「request rate」是什麼？',
          opts: [['每秒送進系統的請求數', 1, '只有在系統能穩定處理、TTFT 還壓得住時，才能把它當成「撐得住的吞吐量」來討論。'], ['每秒輸出的 token 數', 0, '它不是直接量到的輸出速度。'], ['GPU 的使用率', 0, '橫軸是負載，不是資源使用率。']] }
      ]
    },
    {
      id: 'sens', name: '變因實驗室', title: '變因實驗室：換個條件還成立嗎', sub: '論文 §7.3、圖 13、圖 15–19', look: 'crystal', codex: ['sensitivity'],
      steps: [
        { t: 'bucket', q: '快問快答：這句話，論文的實驗支持嗎？',
          buckets: ['支持', '不支持'],
          items: [
            ['重算比例在 5%–18% 之間，品質幾乎貼著完整重算（Yi-34B）', 0, '圖 16：品質損失最多 0.002'],
            ['Batch size 越大，CacheBlend 相對完整重算的優勢越明顯', 0, '圖 15(c)：batch 越大，prefill 的開銷越主導'],
            ['KV 放在越慢的磁碟，CacheBlend 就比 full KV reuse 慢越多', 1, '圖 17：差距反而變小，因為延遲由載入主導', '圖 17 顯示差距變小：延遲主要被載入主導，重算那一點成本不明顯。'],
            ['Sliding window attention 和 MoE 架構的模型上，5–20% 的重算比例也能有相近品質', 0, '圖 18'],
            ['CacheBlend 只對問答有效，程式碼補全就不行', 1, '圖 19：RepoBench 和 Loong 上品質也相近', '圖 19 測了 RepoBench（程式碼）和 Loong（推理），品質和完整重算相近。'],
            ['和 MapReduce 比，CacheBlend 的 TTFT 低 2–5 倍，F1 還更高', 0, '圖 13'],
            ['MapRerank 比 CacheBlend 快一點，所以它的品質也比較好', 1, '圖 13：品質差很多', 'MapRerank 把區塊分開處理，忽略區塊之間的依賴，品質差很多。'],
            ['區塊數變多、區塊變長時，CacheBlend 仍然比完整重算省時間', 0, '圖 15(a)(b)']
          ],
          after: '這就是 §7.3 的敏感度分析：一次只改一個條件，看結論還站不站得住。' },
        { t: 'match', q: '每張圖在回答什麼問題？',
          pairs: [
            ['圖 12', '延遲和品質能不能兼顧'],
            ['圖 14', '請求變多時，系統撐不撐得住'],
            ['圖 16', '重算比例和品質怎麼取捨'],
            ['圖 17', '儲存裝置比較慢時，方法還有沒有效'],
            ['圖 18', '換成不同架構的模型還行不行']
          ],
          after: '全部十九張圖的導覽都收在筆記本的「論文圖表導覽」分頁，讀原稿時可以逐圖對照。' },
        { t: 'choice', q: '論文說 5%–18% 的重算比例，換算成 TTFT 大約是多少？',
          opts: [
            ['比 full KV recompute 快 4.1–6.6 倍，比 prefix caching 快 3.4–6.1 倍（Yi-34B）', 1, '這是特定模型上的結果。'],
            ['剛好快 100 ÷ 15 ≈ 6.67 倍，任何模型都一樣', 0, '還有載入等成本，而且每個模型不同。'],
            ['和完整重算一樣慢', 0, '只重算一小部分，當然快得多。']
          ] }
      ]
    }
  ],
  gate: {
    id: 'gate', name: '裁判長試煉', title: '裁判長試煉', sub: '伊娃的三個問題', look: 'board',
    steps: [
      { t: 'choice', kicker: '第 1 題', q: '和 full KV recompute 相比，CacheBlend 的主要結果是？',
        opts: [['TTFT 低 2.2–3.3 倍、吞吐量高 2.8–5 倍，品質幾乎不掉', 1], ['TTFT 低 100 倍，品質掉一半', 0, '沒有這麼誇張，品質也幾乎沒掉。'], ['TTFT 一樣，但品質更好', 0, '品質是「幾乎一樣」，重點在更快。']] },
      { t: 'choice', kicker: '第 2 題', q: '和 full KV reuse 相比呢？',
        opts: [['TTFT 差不多，但問答的 F1 絕對值高出 0.1–0.2', 1, '摘要的 Rouge-L 也高 0.03–0.25。'], ['快很多，品質一樣', 0, 'Full KV reuse 完全不重算，本來就最快。'], ['慢很多，品質也比較差', 0, '品質明顯比較好。']] },
      { t: 'choice', kicker: '第 3 題', q: '圖 12 的橫軸是 TTFT、縱軸是品質。哪個方向比較好？',
        opts: [['左上角：TTFT 低、品質高', 1], ['右上角', 0, '右邊代表等得比較久。'], ['左下角', 0, '下面代表品質差。'], ['右下角', 0, '又慢又差。']] }
    ]
  },
  build(ctx) {
    const lv = ctx.lv, sand = 0xe8dcc0;
    const P = B.path(0, 6, 0, 'F');
    const A = P.island(17, 12);
    lv.spawn = { x: 0, y: 0, z: 3.8 };
    B.npc('eva', -3.4, 0.8, 0, { accent: COL.rose, trim: COL.gold, hat: 'crown' }, () => (ctx.done('race')
      ? [['eva', '跑得快、答得對，兩樣都要。記分板不會說謊。']]
      : [['eva', '我是裁判長伊娃。在我的場子，每個數字都要說清楚是怎麼量的。'], ['eva', '先去右邊的計時台，把倍數算對。']]));
    ctx.station('metric', 3.8, -1.6, 0);
    B.flag(-7.4, -4.8, 0, COL.rose); B.flag(7.4, -4.8, 0, COL.blue); B.flag(-7.4, 4.8, 0, COL.green); B.flag(7.4, 4.8, 0, COL.gold);
    B.decal('評測競技場', 0, 0, 1.6, { h: 1.05, color: '#7a5a14' });
    B.gemRow(-1, 1.6, 1, -2, 0, 3, 'a');
    P.gate({ need: ['metric'], label: '先完成：計時台' });
    P.bridge(4);
    B.gemRow(P.x, P.z + 3, P.x, P.z + 1, 0, 2, 'b');
    const C = P.island(17, 14);
    ctx.station('quality', C.x - 3.6, C.z - 2.4, 0);
    ctx.station('setup', C.x + 3.6, C.z + 1.6, 0);
    B.flag(C.x - 7.4, C.z - 5.8, 0, COL.gold); B.flag(C.x + 7.4, C.z - 5.8, 0, COL.rose); B.pillar(C.x + 7, C.z + 5.6, 0, 3, 0.4, sand); B.pillar(C.x - 7, C.z + 5.6, 0, 3, 0.4, sand);
    P.exit('L');
    P.gate({ need: ['quality', 'setup'], label: '先完成：品質裁判席與選手檢錄處' });
    P.bridge(5);
    B.gemRow(P.x + 4, P.z, P.x + 1, P.z, 0, 2, 'c');
    const H = P.island(22, 36);
    const methods = [
      { key: 'full', name: 'Full KV recompute', color: '#2f4fa8', dark: true },
      { key: 'prefix', name: 'Prefix caching', color: '#7fa8e8' },
      { key: 'reuse', name: 'Full KV reuse', color: '#ec8b3c' },
      { key: 'blend', name: 'CacheBlend', color: '#d9544f', dark: true }
    ];
    ACT.race(ctx, {
      id: 'race', y: 0, x0: H.x - 13, x1: H.x + 11, z0: H.z - 6.6, dz: 2.4, board: { x: H.x - 2, z: H.z + 6.6 },
      lanes: [
        { name: 'Full KV recompute', color: 0x2f4fa8, ttft: 2.1, f1: 0.33 },
        { name: 'Prefix caching', color: 0x7fa8e8, ttft: 1.9, f1: 0.33 },
        { name: 'Full KV reuse', color: 0xec8b3c, ttft: 0.25, f1: 0.15 },
        { name: 'CacheBlend', color: 0xd9544f, ttft: 0.7, f1: 0.32 }
      ],
      quiz: { id: 'race-quiz', title: '賽前預測：讀懂圖 12', sub: '論文 §7.2、圖 12', steps: [
        { t: 'info', kicker: 'FIGURE 12', title: '一張圖看快慢和品質',
          html: '<p>論文最重要的一張結果圖：橫軸是 <b>TTFT</b>（越左越快），縱軸是<b>品質</b>（越高越好）。每個方法是圖上的一個點，<b>越靠左上角越好</b>。</p><p>下一頁有四個沒標名字的點。憑你這一路學到的，把它們認出來。</p>' },
        { t: 'scatter', q: '這四個點各是哪一種方法？', points: [{ id: 'A', x: 0.25, y: 0.15, ans: 'reuse' }, { id: 'B', x: 0.7, y: 0.32, ans: 'blend' }, { id: 'C', x: 1.9, y: 0.33, ans: 'prefix' }, { id: 'D', x: 2.1, y: 0.33, ans: 'full' }], methods,
          cap: '依論文圖 12 各方法的相對位置重繪，數值為教學示意。',
          hint: 'A 最快但品質最差。C 和 D 品質一樣好，其中只比完整重算快一點點的是 prefix caching。',
          after: 'A 是 full KV reuse，B 是 CacheBlend，C 是 prefix caching，D 是 full KV recompute。押好了，開賽！' }
      ] },
      win: [
        ['eva', '成績出爐。Full KV reuse 跑最快，可是 F1 只有 0.15，答案不能用。'],
        ['eva', 'CacheBlend 只慢一點點，F1 卻有 0.32，和完整重算的 0.33 幾乎一樣。而且比完整重算快了 3 倍。'],
        ['kv', '論文的數字：TTFT 比完整重算低 <b>2.2–3.3 倍</b>，F1 和 Rouge-L 的下降在 <b>0.02</b> 以內。這是在 3 個模型、4 個資料集上量到的。'],
        ['kv', 'Prefix caching 幾乎和完整重算一樣慢，因為 6 個區塊裡它只省得到第一個。']
      ]
    });
    // spectator stands on both long sides
    for (let i = 0; i < 3; i++) B.box(H.x, 0.4 + i * 0.7, H.z - 9.1 - i * 0.7, 26, 0.8, 0.7, i % 2 ? 0xd9544f : 0xf4f6fb, i === 0 ? { solid: true, walk: false } : { cast: false });
    B.flag(H.x - 14.5, H.z - 9, 0, COL.rose, 4.5); B.flag(H.x + 14.5, H.z - 9, 0, COL.blue, 4.5); B.flag(H.x - 14.5, H.z + 9.6, 0, COL.green, 4.5); B.flag(H.x + 14.5, H.z + 9.6, 0, COL.gold, 4.5);
    B.gemRow(H.x - 8, H.z + 8.4, H.x + 8, H.z + 8.4, 0, 3, 'd');
    P.exit('F', 15.5);
    P.gate({ need: ['race'], label: '先完成：四強賽跑' });
    P.bridge(2.5);
    P.stairs(4, 0.45, 3);
    P.bridge(2);
    const F = P.island(20, 17);
    ctx.station('load', F.x - 5.4, F.z + 1.4, P.y);
    ctx.station('sens', F.x - 0.6, F.z - 4.6, P.y);
    ctx.station('gate', F.x + 5, F.z - 1.2, P.y);
    B.portal(F.x + 6.8, F.z + 5.2, P.y, '前往世界地圖');
    // podium
    B.box(F.x - 7, P.y + 0.5, F.z - 6.4, 1.6, 1.0, 1.6, COL.gold, { solid: true, walk: false }); B.box(F.x - 8.7, P.y + 0.35, F.z - 6.4, 1.6, 0.7, 1.6, 0xc8ccd6, { solid: true, walk: false }); B.box(F.x - 5.3, P.y + 0.25, F.z - 6.4, 1.6, 0.5, 1.6, 0xc98a5a, { solid: true, walk: false });
    B.pillar(F.x + 8.4, F.z - 7, P.y, 3.6, 0.45, sand); B.pillar(F.x - 8.6, F.z + 7, P.y, 3.6, 0.45, sand);
    B.flag(F.x + 6.6, F.z - 3, P.y, COL.rose); B.flag(F.x + 3.4, F.z - 3, P.y, COL.rose);
    B.gemRow(F.x - 3, F.z + 5, F.x + 1.6, F.z + 6.4, P.y, 3, 'e');
    const s2 = B.stone(A.x + 10.6, A.z + 1, 1.0, 2.2); B.gem(s2.x, 2.1, s2.z, 'f0');
  }
});
