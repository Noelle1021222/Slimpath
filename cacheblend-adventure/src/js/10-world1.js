// ===== World 1: 詞元村 (handout lessons 1-2) =====
const WORLDS = [];
WORLDS.push({
  id: 'w1', no: 1, name: '詞元村', en: 'Token Village', color: '#4fa866',
  desc: '文字怎麼變成模型能算的數字', lessons: '講義第 1–2 課',
  intro: [
    ['kv', '歡迎來到<b>詞元村</b>！我是凱薇，一顆 KV 快取精靈。推論王國的一切，都從這裡的小方塊開始。'],
    ['kv', '神諭 LLM 其實看不懂字。文字得先被切成<b>詞元（token）</b>，再換成數字，它才有辦法計算。'],
    ['kv', '用搖桿或 WASD 走路，跳躍鍵（空白鍵）可以跳，也可以直接點地面走過去。拖曳畫面能轉動視角。'],
    ['kv', '看到<b>橘色菱形</b>就靠近互動。迷路的話，跟著腳邊的<b>金色箭頭</b>走。'],
    ['kv', '先去右前方的<b>切詞機</b>試試手感吧！']
  ],
  outro: [
    ['tok', '切得好、查得對、算得準。你已經懂模型「讀字」的第一步了。'],
    ['kv', '拿到第一片<b>融合之刃碎片</b>！下一站是注意力神殿，token 們要開始互相看來看去了。']
  ],
  stations: [
    {
      id: 'tok', name: '切詞機', title: '切詞機：文字變成 token', sub: '講義第 1 課', look: 'machine', codex: ['token', 'tokenid'],
      steps: [
        { t: 'info', kicker: 'TOKEN', title: '模型不是直接讀字',
          html: '<p class="lead">LLM 收到一段文字，第一件事是把它切成 <span class="term">token（詞元）</span>。</p><p>Token 是分詞器 <code>tokenizer</code> 切出來的處理單位。它可能是一個字、半個英文單字、一個標點，<b>不能一律當成一個中文字或一個英文單字</b>。實際怎麼切，由每個模型自己的 tokenizer 決定。</p>' },
        { t: 'cut', q: '動手切：把「我喜歡喝茶」切成 4 個 token。', text: '我喜歡喝茶', cuts: [0, 2, 3], ids: [15, 82, 36, 91],
          hint: '「喜歡」是一個詞，別把它切開；其他每個字各自一塊。',
          after: '我／喜歡／喝／茶。這是教學用的切法，真實切法取決於 tokenizer。每個 token 都對應一個整數編號，叫 <b>token ID</b>。' },
        { t: 'choice', q: '「喜歡」的 ID 是 82，「我」是 15。這兩個數字代表什麼？',
          opts: [
            ['只是查表用的索引編號，大小沒有意義', 1, '82 不代表比 15 重要，它只是一個編號。'],
            ['82 比較大，所以「喜歡」比「我」重要', 0, '編號大小沒有任何意義，它只是索引。'],
            ['把兩個數字相加可以得到句子的意思', 0, 'ID 不能直接拿來算，要先查表換成向量。']
          ] }
      ]
    },
    { id: 'cubes', name: '詞元方塊', title: '收集 4 個詞元方塊', kind: 'act' },
    {
      id: 'emb', name: '嵌入表', title: '嵌入表：token ID 變成向量', sub: '講義第 1 課', look: 'lectern', codex: ['embedding', 'hidden'],
      steps: [
        { t: 'info', kicker: 'EMBEDDING', title: '用編號查出一串數字',
          html: '<p class="lead">模型有一張學到的 <span class="term">embedding table（嵌入表）</span>。給它 token ID，就能取出那個 token 的<b>初始向量</b>。</p><p>例如某個 token 的向量是 <code>[0.2, -0.7, 1.1]</code>。真實模型的向量通常有幾千維，這裡縮成三維方便觀察。</p>' },
        { t: 'lookup', q: '幫「我／喜歡／喝／茶」查出它們的向量。',
          seq: [{ tok: '我', id: 15 }, { tok: '喜歡', id: 82 }, { tok: '喝', id: 36 }, { tok: '茶', id: 91 }],
          table: [[7, [0.9, 0.4, -0.1]], [15, [0.2, -0.7, 1.1]], [36, [-0.4, 0.9, 0.3]], [58, [0.0, -0.2, 0.8]], [82, [1.0, 0.1, -0.5]], [91, [0.6, 0.6, -0.2]]],
          after: '查表就是這麼單純：在同一個模型裡，<b>同一個 ID 永遠查到同一個初始向量</b>。' },
        { t: 'info', kicker: 'HIDDEN STATE', title: '同一個 token，讀到的前文不同就會變',
          html: '<p>初始向量進入 Transformer 之後，會被一層又一層地更新，變成 <span class="term">hidden state（隱藏狀態）</span>，也就是各層算出的中間表示。</p><p>「<b>蘋果</b>很好吃」和「<b>蘋果</b>發表新手機」裡的「蘋果」，查表查到的初始向量一樣；但到了後面幾層，它們的 hidden state 會不同，<b>因為各自讀到的前文後語不同</b>。</p><p class="note">（這是幫助理解的例子，實際數值由模型計算決定。）</p>' },
        { t: 'bucket', q: '換一段輸入，下面這些東西會跟著改變嗎？',
          buckets: ['會跟著這次輸入變', '同一個模型裡固定'],
          items: [
            ['Token ID', 0, '取決於文字和分詞結果'],
            ['同一個 ID 查到的初始 embedding', 1, '查表值固定'],
            ['Hidden state（各層的中間向量）', 0, '包含上下文的影響'],
            ['模型權重', 1, '一般推論時固定'],
            ['KV Cache', 0, '與這次的輸入和上下文有關']
          ],
          after: '記住最後一項：<b>KV Cache 會跟著輸入和上下文改變</b>。整篇 CacheBlend 要解決的難題，就是從這裡來的。' }
      ]
    },
    {
      id: 'mat', name: '矩陣鍛造爐', title: '矩陣鍛造爐：向量、矩陣與內積', sub: '講義第 2 課', look: 'forge', codex: ['matrix', 'dot'],
      steps: [
        { t: 'info', kicker: 'VECTOR · MATRIX', title: '只需要先懂這些數學',
          html: '<p class="lead"><span class="term">向量</span>是一串數字，有幾個數字就是幾維。<span class="term">矩陣</span>是排成列與欄的數字。</p><p>神經網路做的事，就是把向量乘上<b>權重矩陣</b>，得到新的向量。別把每一維想成「年齡、職業」這種有名字的欄位；模型學到的特徵通常分散在很多維度裡。</p>' },
        { t: 'fill', q: '把列向量 h 乘上權重矩陣 W，算出兩個輸出。', fig: 'matmul',
          html: '<span class="lbl">第一個輸出</span>（h 和 W 第一欄的內積）<br>2×1 + 1×3 = {0}<br><span class="lbl">第二個輸出</span>（h 和 W 第二欄的內積）<br>2×2 + 1×4 = {1}',
          blanks: [{ a: 5 }, { a: 8 }], hint: '先乘後加：2×1 是 2，1×3 是 3，加起來是多少？',
          after: '輸出是 [5, 8]。矩陣不只是把整組數字等比例放大，它會<b>混合不同維度的資訊</b>。' },
        { t: 'fill', q: '內積（dot product）：對應位置相乘，再全部加起來。',
          html: '[1, 2] · [3, 4] = 1×3 + 2×4 = {0}', blanks: [{ a: 11 }],
          after: 'Attention 就是用 Q 和 K 的<b>內積</b>算「匹配分數」。它不是固定介於 0 和 1 的機率，也不等同於餘弦相似度。' },
        { t: 'choice', q: '有 n 個 token、每個是 d 維，排成矩陣 H（n×d）。乘上 W（d×k）之後，結果的形狀是？',
          opts: [
            ['n × k', 1, '中間的 d 要對得上；前面的 n 是 token 數，後面的 k 是每個 token 新向量的維度。'],
            ['d × d', 0, '中間的 d 會「消掉」，留下的是頭尾。'],
            ['n × d', 0, '後面那一維會變成 W 的欄數 k。'],
            ['k × n', 0, '順序反了：列數還是 token 的數量 n。']
          ],
          after: '記住「一列就是一個 token」。後面說「只重算部分 token」，就是只挑 H 的<b>幾列</b>去算。' }
      ]
    },
    {
      id: 'gen', name: '神諭擲骰台', title: '神諭擲骰台：推論與自回歸生成', sub: '講義第 1 課', look: 'altar', codex: ['inference', 'autoreg'],
      steps: [
        { t: 'bucket', q: '這件事屬於訓練（training），還是推論（inference）？',
          buckets: ['訓練', '推論'],
          items: [
            ['調整模型的權重', 0],
            ['用已經訓練好的權重處理新輸入', 1],
            ['CacheBlend 動手腳的地方', 1, '它只改推論時怎麼重用、更新中間結果'],
            ['把新知識寫進模型權重', 0]
          ],
          after: 'CacheBlend 改的是<b>推論</b>流程，不需要為每份文件重新訓練模型。' },
        { t: 'autoreg', q: '模型一次只決定「下一個」token。試著當一次模型：',
          start: ['我', '喜歡', '喝'],
          rounds: [[['茶', 0.62], ['咖啡', 0.27], ['水', 0.11]], [['，', 0.48], ['。', 0.40], ['和', 0.12]], [['也', 0.50], ['更', 0.30], ['最', 0.20]]],
          after: '這叫<b>自回歸生成</b>：根據已知前文算出下一個 token 的機率，選一個，接回前文，再繼續。它不是一次把整段回答都決定好。' },
        { t: 'match', q: '把名詞和意思配起來。',
          pairs: [
            ['Prompt', '送進模型的輸入：指示、文件、對話歷史、問題'],
            ['Context', '可供模型參考的上下文'],
            ['Context window', '模型能處理的 token 長度上限'],
            ['自回歸', '每次只產生下一個 token，再接回前文']
          ] }
      ]
    }
  ],
  gate: {
    id: 'gate', name: '村口考驗', title: '村口考驗', sub: '托克的三個問題', look: 'board',
    steps: [
      { t: 'choice', kicker: '第 1 題', q: 'Token 是什麼？',
        opts: [['分詞器切出的處理單位，可能是字、部分單字或標點', 1], ['一定剛好是一個中文字', 0, '不一定，要看 tokenizer 怎麼切。'], ['模型訓練時學到的權重', 0, '權重是模型的參數，token 是輸入的片段。']] },
      { t: 'choice', kicker: '第 2 題', q: 'h = [1, 3]，W = ' + matH([[2, 0], [1, 1]]) + '，h × W = ？',
        opts: [['[5, 3]', 1, '1×2 + 3×1 = 5；1×0 + 3×1 = 3。'], ['[2, 3]', 0, '第一個輸出要用 W 的第一欄：1×2 + 3×1。'], ['[5, 4]', 0, '第二個輸出是 1×0 + 3×1。'], ['[2, 4]', 0, '記得每個輸出都是「對應相乘再加總」。']] },
      { t: 'choice', kicker: '第 3 題', q: '下面哪一個會隨著「這次輸入的上下文」而改變？',
        opts: [['Hidden state', 1, '它一層層更新，會吸收上下文。KV Cache 也是。'], ['模型權重', 0, '推論時權重是固定的。'], ['同一個 token ID 查到的初始 embedding', 0, '查表值是固定的。']] }
    ]
  },
  build(ctx) {
    const lv = ctx.lv;
    const P = B.path(0, 7, 0, 'F');
    const A = P.island(18, 14);
    lv.spawn = { x: 0, y: 0, z: 4.6 };
    B.npc('tok', -3.4, 1.6, 0, { accent: COL.green, trim: COL.gold, hat: 'cap' }, () => (ctx.done('tok')
      ? [['tok', '切得不錯！token 是模型讀字的最小單位，後面每一關都會用到。']]
      : [['tok', '我是托克，在村裡切詞切了三十年。記住：模型讀的是 <b>token</b>，不是字。'], ['tok', '去右邊的切詞機試試，切對了，前面的門就會打開。']]));
    ctx.station('tok', 4.2, -2.6, 0);
    B.house(-6.2, -4.2, 0, 2.8, 2.1, 2.6, 0xf7e7c6, COL.rose);
    B.house(6.6, 3.6, 0, 2.3, 1.8, 2.3, 0xf7e7c6, COL.blue);
    B.tree(-7.6, 4.6, 0, 1.2); B.tree(-5.4, 5.6, 0, 0.9); B.tree(7.8, -5.4, 0, 1.1); B.tree(-8, -0.5, 0, 1);
    B.bush(-2, 5.8, 0, 1.2); B.bush(2.4, 5.4, 0, 1); B.bush(8, 0.4, 0, 1.1); B.rock(-1.2, -5.6, 0, 0.8); B.lamp(1.9, -6, 0); B.lamp(-1.9, -6, 0);
    B.decal('詞元村', 0, 0, 2.2, { h: 1.1, color: '#2f6b3a' });
    B.gemRow(-1, 1.5, 1, -1.5, 0, 3, 'a');
    P.gate({ need: ['tok'], label: '先完成：切詞機' });
    P.bridge(4);
    B.gemRow(0, P.z + 3, 0, P.z + 1, 0, 2, 'b');
    const st = P.stones(3, 1.3, 2.1);
    const Bi = P.island(9, 7);
    B.crate(Bi.x + 2.4, Bi.z - 0.6, 0, 1.7, 1.0, 1.7, 0xd9b382);
    B.tree(Bi.x - 3.2, Bi.z - 2, 0, 0.9);
    ACT.cubes(ctx, { id: 'cubes', after: 'tok', items: [
      { text: '我', id: 15, x: st[0].x, y: 1.3, z: st[0].z },
      { text: '喜歡', id: 82, x: st[1].x, y: 1.3, z: st[1].z },
      { text: '喝', id: 36, x: st[2].x, y: 1.3, z: st[2].z },
      { text: '茶', id: 91, x: Bi.x + 2.4, y: 2.3, z: Bi.z - 0.6 }
    ] });
    P.exit('L');
    P.gate({ need: ['cubes'], label: '先收集 4 個詞元方塊' });
    P.bridge(5);
    B.gemRow(P.x + 4, P.z, P.x + 1, P.z, 0, 2, 'c');
    const C = P.island(15, 13);
    ctx.station('emb', C.x - 1.5, C.z - 2.5, 0);
    B.shelf(C.x - 4.6, C.z - 5.6, 0, 3.4, 2.4); B.shelf(C.x + 0.4, C.z - 5.6, 0, 3.4, 2.4);
    B.tree(C.x + 4.6, C.z + 5.6, 0, 1.1); B.bush(C.x - 5, C.z + 5.4, 0, 1.2); B.lamp(C.x + 3.4, C.z - 5.8, 0);
    B.gemRow(C.x + 2, C.z + 3, C.x - 3, C.z + 3, 0, 3, 'd');
    P.exit('F', -2);
    P.gate({ need: ['emb'], label: '先完成：嵌入表' });
    P.bridge(3);
    P.stairs(4, 0.45, 3);
    P.bridge(2);
    const D = P.island(15, 13);
    ctx.station('mat', D.x + 2.2, D.z - 2, P.y);
    B.box(D.x - 4.4, P.y + 1.6, D.z - 4.2, 1.4, 3.2, 1.4, 0x7a6a6f, { solid: true, walk: false });
    B.box(D.x - 4.4, P.y + 3.5, D.z - 4.2, 1.0, 0.6, 1.0, 0x3a3238);
    B.rock(D.x - 5.6, D.z + 3.6, P.y, 1.1); B.rock(D.x + 5.4, D.z - 4.8, P.y, 0.9); B.torch(D.x - 2.2, D.z - 4.4, P.y); B.tree(D.x + 5.6, D.z + 4.6, P.y, 1);
    B.gemRow(D.x - 2, D.z + 3.4, D.x + 2, D.z + 3.4, P.y, 2, 'e');
    P.exit('R');
    P.gate({ need: ['mat'], label: '先完成：矩陣鍛造爐' });
    P.bridge(2.4);
    const mx = P.x + 3.2, my = P.y, mz = P.z;
    B.mover(mx, my, mz, 2.8, 2.8, (t, m) => { m.mesh.position.x = mx + clamp(Math.sin(t * 0.8) * 1.45, -1, 1) * 1.8; });
    B.gem(mx, my + 1.6, mz, 'f0');
    P.gap(6.4);
    P.bridge(2.4);
    const F = P.island(16, 18);
    ctx.station('gen', F.x - 3.6, F.z - 3.4, P.y);
    ctx.station('gate', F.x + 3, F.z - 0.6, P.y);
    B.portal(F.x + 6.4, F.z + 4.2, P.y, '前往世界地圖');
    B.house(F.x - 6.4, F.z + 4.6, P.y, 2.6, 2, 2.4, 0xf7e7c6, COL.orange);
    B.tree(F.x + 7.4, F.z - 6, P.y, 1.2); B.tree(F.x - 7.6, F.z - 6.2, P.y, 1); B.bush(F.x, F.z + 6.6, P.y, 1.2); B.lamp(F.x + 1, F.z - 6.6, P.y);
    B.flag(F.x + 4.6, F.z - 2.4, P.y, COL.green); B.flag(F.x + 1.4, F.z - 2.4, P.y, COL.green);
    B.gemRow(F.x - 6, F.z + 0.5, F.x - 2, F.z + 2.5, P.y, 2, 'g');
    // optional side stone with a gem (needs a jump)
    const s2 = B.stone(A.x - 11.2, A.z + 1, 0.9, 2.2); B.gem(s2.x, 2, s2.z, 'h0');
  }
});
