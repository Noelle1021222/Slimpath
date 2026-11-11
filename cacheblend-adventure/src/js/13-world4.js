// ===== World 4: 檢索圖書館 (handout lesson 8, paper §3.1-3.2, Fig. 2) =====
WORLDS.push({
  id: 'w4', no: 4, name: '檢索圖書館', en: 'RAG Library', color: '#8a5fc7',
  desc: 'RAG：先找資料，再讓模型回答', lessons: '講義第 8 課・論文 §3.1',
  intro: [
    ['kv', '這座飄在空中的建築是<b>檢索圖書館</b>。神諭回答問題之前，會先來這裡借書。'],
    ['kv', '這個做法叫 <b>RAG</b>：先檢索出相關的資料，再把資料塞進輸入裡。答得更準，但輸入也變得又長又貴。'],
    ['kv', '館長芮格在前面等你。等一下你要親自當一次「檢索器」。']
  ],
  outro: [
    ['rag', '找資料、拼成長長的輸入、再讓模型讀完。你看懂 RAG 為什麼好用，也看懂它為什麼慢了。'],
    ['kv', '第四片碎片！同一本書被一借再借，卻每次都要重讀……下一關，我們試著把讀過的結果存起來。']
  ],
  stations: [
    {
      id: 'rag', name: '借書櫃檯', title: '借書櫃檯：RAG 的兩個階段', sub: '講義第 8 課', look: 'lectern', codex: ['rag', 'chunk'],
      steps: [
        { t: 'info', kicker: 'RETRIEVAL-AUGMENTED GENERATION', title: '先找資料，再回答',
          html: '<p class="lead"><span class="term">RAG</span>（檢索增強生成）：系統先找出可能相關的外部資料，把它們放進模型的輸入，再請模型根據這些資料回答。</p><p>好處是答案更準、更一致，也能用上模型沒學過的領域知識。代價是：<b>輸入變得很長</b>。</p>' },
        { t: 'order', q: '把一次 RAG 的流程排出來。',
          items: ['離線：把文件切成一塊一塊的 chunk', '離線：為每個 chunk 建立可搜尋的向量索引', '線上：收到問題，檢索器找出最相關的 top-k 個 chunk', '把系統指示、選中的 chunk 和問題組成 prompt', 'LLM prefill 整個 prompt，然後生成答案'],
          after: '前兩步是事先做好的；後三步每個問題都要跑一次。最花時間的是最後一步的 <b>prefill</b>。' },
        { t: 'match', q: '名詞配對。',
          pairs: [['Chunk', '文件切分後的文字區塊，裡面有很多 token'], ['Chunk size', '一個區塊的長度'], ['Top-k', '一次取回排名前 k 個區塊'], ['Retriever', '負責找出相關區塊的元件']] },
        { t: 'choice', q: 'Chunk 要切多長才對？',
          opts: [
            ['沒有通用的最佳值：切太短會失去上下文關係，切太長會增加輸入與計算量', 1],
            ['越短越好，這樣檢索最精準', 0, '太短會把彼此相關的句子拆散，失去關係。'],
            ['越長越好，這樣資訊最完整', 0, '太長會讓輸入暴增，prefill 更慢。']
          ],
          after: '論文的實驗分別用過 128 token 和 512 token 的切法。' }
      ]
    },
    { id: 'fetch', name: '檢索大廳', title: '檢索大廳：取回 top-2 區塊', kind: 'act',
      fallback: { steps: [{ t: 'pick', q: '問題：「林安任職公司的總部在哪裡？」請當檢索器，選出 top-2 區塊（L2 距離最小的兩個）。', k: 2, correct: [0, 1],
        items: [{ t: 'A 南星公司的總部位於台北', s: '0.38' }, { t: 'B 林安任職於南星公司', s: '0.31' }, { t: 'C 北辰公司的總部位於高雄', s: '0.74' }, { t: 'D 林安喜歡喝烏龍茶', s: '0.62' }, { t: 'E 南星公司成立於 2010 年', s: '0.55' }, { t: 'F 台北 101 高 508 公尺', s: '0.81' }],
        after: '只看 A 不知道林安在哪家公司；只看 B 不知道總部在哪。兩段連起來才答得出「台北」，這叫多跳問答。' }] } },
    {
      id: 'vec', name: '三種向量', title: '三種向量：別把它們當成同一種', sub: '講義第 8 課', look: 'crystal', codex: ['retrievalemb', 'multihop'],
      steps: [
        { t: 'bucket', q: '這句話在講哪一種向量？',
          buckets: ['檢索用 embedding', 'LLM 的 token embedding', 'LLM 的 KV Cache'],
          items: [
            ['由檢索專用的 embedding 模型產生', 0],
            ['向量資料庫裡搜尋的就是它', 0],
            ['生成模型用 token ID 查表得到的初始表示', 1],
            ['生成模型每一層投影出來、供後續 Attention 重用', 2],
            ['CacheBlend 保存和融合的對象', 2],
            ['剛才書上標的「L2 距離」就是用它算的', 0]
          ],
          after: '三者不是同一份向量，<b>不能互換</b>。向量資料庫搜尋的是第一種；CacheBlend 處理的是第三種。' },
        { t: 'choice', q: '「檢索文件」和「載入 KV」在論文裡都可能被叫做 retrieval 或 fetching。它們搬的是同一種東西嗎？',
          opts: [
            ['不是。文件檢索是找到「文字」；KV 載入是搬回「已經算好的張量」', 1],
            ['是，都是把文字搬進 GPU', 0, 'KV 載入搬的不是文字，是算好的 K、V。'],
            ['是，都是在向量資料庫裡搜尋', 0, 'KV 快取不靠相似度搜尋，是用文件 ID 直接取出。']
          ],
          after: '讀論文的圖時，先看清楚「正在搬的是哪一種資料」。論文的檢索實驗用 SentenceTransformers 算 embedding，以 <b>L2 距離</b>由小到大排名。' },
        { t: 'info', kicker: 'MULTI-HOP QA', title: '為什麼需要好幾個區塊',
          html: '<p>剛才的問題要把「林安 → 南星公司」和「南星公司 → 台北」兩段關係接起來，這叫 <span class="term">多跳問答（multi-hop QA）</span>。</p><p>論文用的 <b>2WikiMQA</b> 和 <b>Musique</b> 資料集就是這一類：答案需要同時讀懂好幾段文字。這也是為什麼 RAG 的輸入裡，通常<b>不只一個</b>區塊。</p>' }
      ]
    },
    {
      id: 'reuse', name: '熱門書架', title: '熱門書架：同一段文字被一用再用', sub: '論文 §3.1', look: 'board', codex: [],
      steps: [
        { t: 'info', kicker: 'OPPORTUNITY', title: '重用的機會',
          html: '<p>論文舉了一個例子。一家公司用 LLM 管理內部資料，有兩個問題：</p><ul><li>「IT 部門裡，誰在上次全員大會提議用 RAG 改善客服 X？」</li><li>「IT 部門裡，誰是 Y 大學的畢業生？」</li></ul><p>兩個問題看起來很不一樣，但都需要 <span class="c1">IT 部門員工名單</span> 當作上下文。</p><p>既然同一段文字會反覆出現，把它算過的 KV 存起來重用，就能省下大量 prefill。</p>' },
        { t: 'choice', q: '三個問題各自檢索到的區塊如下。哪一個區塊三次都用到了？', fig: 'blocks',
          rows: [
            { label: '問題 1', blocks: [['客服 X 說明', 'c2'], ['員工名單', 'c1'], ['大會紀錄', 'c3'], ['問題', 'q']] },
            { label: '問題 2', blocks: [['員工名單', 'c1'], ['校友名冊', 's'], ['問題', 'q']] },
            { label: '問題 3', blocks: [['大會紀錄', 'c3'], ['員工名單', 'c1'], ['問題', 'q']] }
          ],
          opts: [['員工名單', 1], ['大會紀錄', 0, '問題 2 沒有用到它。'], ['客服 X 說明', 0, '只有問題 1 用到。'], ['校友名冊', 0, '只有問題 2 用到。']] },
        { t: 'choice', q: '再看一次。在哪個問題裡，「員工名單」剛好排在整個輸入的最前面？', fig: 'blocks',
          rows: [
            { label: '問題 1', blocks: [['客服 X 說明', 'c2'], ['員工名單', 'c1'], ['大會紀錄', 'c3'], ['問題', 'q']] },
            { label: '問題 2', blocks: [['員工名單', 'c1'], ['校友名冊', 's'], ['問題', 'q']] },
            { label: '問題 3', blocks: [['大會紀錄', 'c3'], ['員工名單', 'c1'], ['問題', 'q']] }
          ],
          opts: [['只有問題 2', 1], ['三個問題都是', 0, '問題 1 和問題 3 裡，它前面都還有別的區塊。'], ['問題 1 和問題 3', 0, '這兩個問題裡它都不在最前面。']],
          after: '同一個區塊常常被重用，但<b>不一定排在最前面，前面接的內容也不一樣</b>。這個觀察是下一個世界的關鍵。' },
        { t: 'choice', q: '一次 RAG 請求裡，prefill 的時間主要花在哪一部分？',
          opts: [['前面那一大串檢索到的上下文', 1, '重複使用的上下文通常比問題本身長得多，佔了 prefill 的大宗。'], ['使用者那一句問題', 0, '問題通常很短。'], ['兩者差不多', 0, '上下文往往有幾千個 token，問題只有幾十個。']] }
      ]
    },
    {
      id: 'more', name: '堆書實驗', title: '堆書實驗：區塊放越多越好嗎', sub: '論文圖 2', look: 'scale', codex: ['lostmiddle'],
      steps: [
        { t: 'chunkq', q: '',
          after: '兩個重點：① 多放相關區塊，品質會先升後降。② <b>區塊越多，「有沒有跨區塊注意力」差得越多</b>，因為區塊之間互相參照的地方變多了。' },
        { t: 'choice', q: '圖 2 的橘線（Full KV reuse）代表什麼做法？',
          opts: [
            ['每個區塊各自先算好 KV，用的時候直接拼起來，區塊之間沒有互相看', 1],
            ['每次都把整個輸入從頭 prefill', 0, '那是藍線 Full KV recompute。'],
            ['只把第一個區塊的 KV 存起來', 0, '那是 prefix caching，下一個世界會遇到。']
          ],
          after: '直接拼接很快，但品質掉很多。為什麼會掉？下一個世界揭曉。' }
      ]
    }
  ],
  gate: {
    id: 'gate', name: '館長試煉', title: '館長試煉', sub: '芮格的三個問題', look: 'board',
    steps: [
      { t: 'choice', kicker: '第 1 題', q: '區塊 A「南星公司的總部位於台北」，區塊 B「林安任職於南星公司」。要回答「林安任職公司的總部在哪裡」，需要哪些區塊？',
        opts: [['A 和 B 都要', 1, '兩段關係要接起來，這是多跳問答。'], ['只要 A', 0, '只看 A 不知道林安在哪家公司。'], ['只要 B', 0, '只看 B 不知道總部在哪。']] },
      { t: 'choice', kicker: '第 2 題', q: '檢索用的 embedding 可以直接拿來當 LLM 的 KV Cache 嗎？',
        opts: [['不行。前者用來找文字，後者是生成模型各層算出的 K、V', 1], ['可以，它們都是向量', 0, '都是向量，但由不同模型產生、用途完全不同。'], ['可以，只要維度一樣', 0, '就算維度相同，內容和意義也不一樣。']] },
      { t: 'choice', kicker: '第 3 題', q: '為什麼 RAG 會讓使用者等比較久才看到第一個字？',
        opts: [['輸入前面接了很多檢索到的區塊，prefill 得把全部 token 處理完', 1], ['因為生成的答案變長了', 0, '答案長度影響的是整段回答何時結束，不是第一個字。'], ['因為檢索器要重新訓練', 0, '檢索不需要重新訓練。']] }
    ]
  },
  build(ctx) {
    const lv = ctx.lv, wood = 0xc9a06a;
    const P = B.path(0, 6, 0, 'F');
    const A = P.island(17, 12);
    lv.spawn = { x: 0, y: 0, z: 3.8 };
    B.npc('rag', 3.4, 0.8, 0, { accent: 0x8a5fc7, trim: 0xf2b632, hat: 'scholar' }, () => (ctx.done('fetch')
      ? [['rag', '好的檢索器只帶回最相關的那幾本，不會把整座圖書館搬過去。']]
      : [['rag', '歡迎光臨。我是館長芮格。神諭要回答問題時，都是我替它把書找出來。'], ['rag', '先到左邊的借書櫃檯，弄清楚 RAG 的流程。']]));
    ctx.station('rag', -3.6, -1.8, 0);
    B.shelf(-6.4, -5.3, 0, 3.6, 3); B.shelf(-2, -5.3, 0, 3.6, 3); B.shelf(6, -5.3, 0, 3.6, 3);
    B.lamp(7.6, 4.6, 0, 0xffd9a0); B.lamp(-7.6, 4.6, 0, 0xffd9a0);
    B.decal('檢索圖書館', 0, 0, 1.6, { h: 1.05, color: '#4a2f6a' });
    B.gemRow(-1, 1.4, 1, -2, 0, 3, 'a');
    P.exit('F', 2);
    P.gate({ need: ['rag'], label: '先完成：借書櫃檯' });
    P.bridge(4);
    B.gemRow(P.x, P.z + 3, P.x, P.z + 1, 0, 2, 'b');
    const H = P.island(28, 22);
    const bx = H.x, bz = H.z;
    ACT.fetch(ctx, {
      id: 'fetch', y: 0, k: 2, cx: bx, cz: bz, rx: 15, rz: 12,
      question: '林安任職公司的總部在哪裡？', answer: ['A', 'B'], reply: '台北。',
      desk: { x: bx, z: bz + 3.6 }, board: { x: bx, z: bz - 9.6 },
      books: [
        { id: 'A', text: '南星公司的總部位於台北。', dist: 0.38, x: bx - 9.5, z: bz - 3.5, color: COL.blue },
        { id: 'B', text: '林安任職於南星公司。', dist: 0.31, x: bx + 9.5, z: bz - 3, color: COL.orange },
        { id: 'C', text: '北辰公司的總部位於高雄。', dist: 0.74, x: bx - 5, z: bz - 6.6, color: COL.green },
        { id: 'D', text: '林安喜歡喝烏龍茶。', dist: 0.62, x: bx + 5.4, z: bz - 6.8, color: COL.rose },
        { id: 'E', text: '南星公司成立於 2010 年。', dist: 0.55, x: bx - 10, z: bz + 5.6, color: 0x8a5fc7 },
        { id: 'F', text: '台北 101 高 508 公尺。', dist: 0.81, x: bx + 10, z: bz + 6, color: COL.gold }
      ],
      wrong: { A: '林安在南星公司，但資料裡沒寫南星公司的總部在哪裡。', B: '我不知道「林安」任職於哪一家公司。' },
      win: [['rag', '答對了，是台北。只看 A 不知道林安在哪家公司；只看 B 不知道總部在哪。把兩段連起來才答得出來，這叫<b>多跳問答</b>。'], ['kv', '注意看：兩個區塊接在問題前面，變成一段很長的輸入。神諭得先把<b>每一個 token 都 prefill 完</b>，才吐得出第一個字。'], ['kv', '明天又有人問到南星公司，區塊 A 又要從頭讀一次……有沒有覺得哪裡怪怪的？']]
    });
    B.shelf(bx - 13, bz - 1, 0, 6, 3.4, 'z'); B.shelf(bx + 13, bz + 1, 0, 6, 3.4, 'z');
    B.shelf(bx - 8, bz - 10.2, 0, 4, 3); B.shelf(bx + 8.4, bz - 10.2, 0, 4, 3);
    B.lamp(bx - 4.6, bz + 9, 0, 0xffd9a0); B.lamp(bx + 4.6, bz + 9, 0, 0xffd9a0); B.lamp(bx - 12.6, bz - 9.6, 0, 0xffd9a0); B.lamp(bx + 12.6, bz - 9.6, 0, 0xffd9a0);
    B.box(bx, 0.02, bz, 8, 0.04, 5, 0x8a3a4a, { cast: false });
    B.gemRow(bx - 6, bz + 7.6, bx + 6, bz + 7.6, 0, 3, 'c');
    P.exit('R', 4);
    P.gate({ need: ['fetch'], label: '先完成：檢索大廳' });
    P.bridge(5);
    B.gemRow(P.x - 4, P.z, P.x - 1, P.z, 0, 2, 'd');
    const C = P.island(15, 15);
    ctx.station('vec', C.x - 2.6, C.z - 3, 0);
    ctx.station('reuse', C.x + 3.4, C.z + 2.4, 0);
    B.shelf(C.x - 5, C.z + 6.4, 0, 3.6, 2.6); B.shelf(C.x + 4, C.z - 6.4, 0, 3.6, 2.6); B.lamp(C.x - 6.4, C.z - 6.2, 0, 0xffd9a0);
    P.exit('F', -2);
    P.gate({ need: ['vec', 'reuse'], label: '先完成：三種向量與熱門書架' });
    P.bridge(2.5);
    P.stairs(4, 0.45, 3);
    P.bridge(2);
    const F = P.island(18, 16);
    ctx.station('more', F.x - 4.4, F.z - 2, P.y);
    ctx.station('gate', F.x + 3, F.z - 1.4, P.y);
    B.portal(F.x + 5.8, F.z + 4.8, P.y, '前往世界地圖');
    // a teetering pile of books
    [0x5b7fd6, 0xec8b3c, 0x4fa866, 0xd9544f, 0xf2b632, 0x8a5fc7, 0x5b7fd6].forEach((c, i) => { const m = B.box(F.x - 6.6 + Math.sin(i * 1.7) * 0.18, P.y + 0.16 + i * 0.3, F.z + 4.6 + Math.cos(i * 2.1) * 0.15, 1.5, 0.28, 1.1, c, i === 0 ? { solid: true, walk: false } : {}); m.rotation.y = i * 0.5; });
    B.shelf(F.x - 5, F.z - 7.2, P.y, 4, 3); B.shelf(F.x + 1, F.z - 7.2, P.y, 4, 3); B.lamp(F.x + 7.6, F.z - 6.6, P.y, 0xffd9a0); B.lamp(F.x - 7.8, F.z + 0.4, P.y, 0xffd9a0);
    B.flag(F.x + 4.6, F.z - 3.2, P.y, 0xc58be0); B.flag(F.x + 1.4, F.z - 3.2, P.y, 0xc58be0);
    B.gemRow(F.x - 2, F.z + 4, F.x + 2, F.z + 5.4, P.y, 3, 'e');
    const s2 = B.stone(A.x - 10.6, A.z + 1, 1.0, 2.2); B.gem(s2.x, 2.1, s2.z, 'f0');
  }
});
