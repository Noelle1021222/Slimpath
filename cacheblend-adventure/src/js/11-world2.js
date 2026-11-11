// ===== World 2: 注意力神殿 (handout lessons 3-5) =====
WORLDS.push({
  id: 'w2', no: 2, name: '注意力神殿', en: 'Attention Temple', color: '#d99a1c',
  desc: 'Q、K、V 與 Attention 怎麼算', lessons: '講義第 3–5 課',
  intro: [
    ['kv', '這裡是<b>注意力神殿</b>。上一關的向量，在這裡要學會「互相看」。'],
    ['kv', '每個 token 會變出三種向量：<b>Q、K、V</b>。整篇論文的主角 KV Cache，名字就是從這裡來的。'],
    ['kv', '神殿深處有一片會發光的地磚，記得多跳幾下。']
  ],
  outro: [
    ['att', '你已經看懂 token 之間如何分配注意力，也知道為什麼只能往前看。'],
    ['kv', '第二片碎片到手！接下來去快取礦坑，把算過的 K 和 V 存起來。']
  ],
  stations: [
    {
      id: 'qkv', name: '三面鏡', title: '三面鏡：Q、K、V 各自負責什麼', sub: '講義第 3 課', look: 'crystal', codex: ['qkv'],
      steps: [
        { t: 'info', kicker: 'QUERY · KEY · VALUE', title: '每個 token 在每一層都有三種向量',
          html: '<div class="tw"><table class="t"><tr><th>向量</th><th>先用這個角色理解</th></tr><tr><td><b>Q</b> Query</td><td>這個 token 要用什麼特徵「尋找」資訊</td></tr><tr><td><b>K</b> Key</td><td>這個 token 提供什麼特徵讓別人「比對」</td></tr><tr><td><b>V</b> Value</td><td>別人參考這個 token 時，要「取走」的內容表示</td></tr></table></div><p>這些只是幫助理解的角色。Q 不是使用者打的問題，K 不是人工挑的關鍵字，V 也不是一段寫好的答案。<b>三者都是模型算出來的數字向量。</b></p>' },
        { t: 'qkv', q: '同一個輸入，三個不同的轉換',
          after: '同一個 token 的 Q、K、V 可以完全不同。W<sub>Q</sub>、W<sub>K</sub>、W<sub>V</sub> 是<b>訓練得到的權重</b>；Q、K、V 則是<b>這次推論算出的結果</b>。' },
        { t: 'match', q: '把向量和它的工作配起來。',
          pairs: [['Q（Query）', '拿去和別人的 K 比對，決定要看誰'], ['K（Key）', '被別人的 Q 比對，決定自己被看多少'], ['V（Value）', '被看的時候，實際交出去混合的內容']] },
        { t: 'choice', q: '下面哪個說法是對的？',
          opts: [
            ['Q、K、V 是這次推論算出來的；W<sub>Q</sub>、W<sub>K</sub>、W<sub>V</sub> 才是訓練學到的權重', 1],
            ['Q 就是使用者輸入的那句問題', 0, 'Q 是每個 token 在每一層都會算出的向量，不是自然語言問題。'],
            ['K 是工程師事先挑好的關鍵字', 0, 'K 也是模型算出來的向量，沒有人工挑選。'],
            ['同一個 token 的 Q、K、V 一定相同', 0, '三個權重矩陣不同，算出的結果通常不同。']
          ] }
      ]
    },
    {
      id: 'mix', name: '注意力祭壇', title: '注意力祭壇：分數、Softmax、加權混合', sub: '講義第 3–4 課', look: 'altar', codex: ['attention', 'softmax'],
      steps: [
        { t: 'info', kicker: 'ATTENTION', title: '用 Q 比 K，再拿比例去混 V',
          html: '<p class="lead">目前 token 的 <span class="c1">Q</span>，會和它可以參考的每個 <span class="c2">K</span> 做內積，得到匹配分數。</p><p>分數經過 softmax 變成一組加總為 1 的<b>權重</b>，再用這組權重對各個 <span class="c3">V</span> 做<b>加權加總</b>。得到的新向量還會繼續送進後面的運算，不會直接變成文字。</p><p><code>Attention = softmax(QKᵀ ÷ √d<sub>k</sub> + M) · V</code></p>' },
        { t: 'attnmix', q: '調整權重，讓 Attention 輸出剛好是 [1.40, 1.20]。', target: 0.7, goal: '[1.40, 1.20]',
          hint: '輸出的第一個數字 = w₁ × 2。要得到 1.40，w₁ 是多少？',
          after: '0.7 × [2, 0] + 0.3 × [0, 4] = [1.4, 1.2]。<b>K 影響「分配多少注意力」，V 影響「被混進來的資訊」。</b>' },
        { t: 'fill', q: '完整算一次：q = [1, 0]，k₁ = [1, 0]，k₂ = [0, 1]，v₁ = [2, 0]，v₂ = [0, 4]。',
          html: '<span class="lbl">① 內積</span>　q·k₁ = {0}　　q·k₂ = {1}<br><span class="lbl">② 縮放</span>　除以 √2 → [0.707, 0]<br><span class="lbl">③ Softmax</span>　e<sup>0.707</sup> ≈ 2.03，e<sup>0</sup> = 1<br>　w₁ = 2.03 ÷ (2.03 + 1) ≈ {2}　　w₂ = 1 − w₁ ≈ {3}<br><span class="lbl">④ 混合</span>　輸出 ≈ [ 2 × w₁ , 4 × w₂ ] = [ {4} , {5} ]',
          blanks: [{ a: 1 }, { a: 0 }, { a: 0.67, tol: 0.011 }, { a: 0.33, tol: 0.011 }, { a: 1.34, tol: 0.03 }, { a: 1.32, tol: 0.03 }],
          hint: 'w₁ 取到小數兩位是 0.67，w₂ 就是 0.33。最後一步：2 × 0.67 和 4 × 0.33。',
          after: '除以 √d<sub>k</sub> 是為了避免維度大的時候內積尺度太大。兩個權重加起來一定是 1。' },
        { t: 'choice', q: 'Softmax 算出來的 0.67 代表什麼？',
          opts: [
            ['混合資訊時，參考第一個來源的比例', 1, '它是資訊混合比例。'],
            ['模型回答正確的機率是 67%', 0, 'Attention 權重和「答對的機率」是兩回事。'],
            ['第一個 token 在人類眼中的重要性是 67 分', 0, '注意力權重不必然等於人類理解的語意重要性。']
          ] }
      ]
    },
    { id: 'floor', name: '因果地磚', title: '因果地磚：點亮可以參考的位置', kind: 'act',
      fallback: { steps: [{ t: 'grid', q: '點亮「這個 Q 可以參考的 K」。每一列是發問的 token，每一欄是被參考的 token。', rows: ['我', '喜歡', '喝', '茶'], cols: ['我', '喜歡', '喝', '茶'], corner: 'Q＼K', on: (r, c) => c <= r, hint: '每個 token 只能看自己，和排在它前面的 token。', after: '下三角（含對角線）就是因果遮罩。' }] } },
    {
      id: 'causal', name: '遮罩石碑', title: '遮罩石碑：為什麼只能往前看', sub: '講義第 4 課', look: 'board', codex: ['mask'],
      steps: [
        { t: 'info', kicker: 'CAUSAL MASK', title: '公式裡的 M 就是剛才的地磚', fig: 'mask4',
          html: '<p>自回歸模型在算 Attention 時，會加上一個<b>因果遮罩 M</b>：看得到的位置加 0，看不到的位置加負無限大。經過 softmax，看不到的位置權重就變成 0。</p>',
          html2: '<p class="note">第 3 個 token「喝」可以看「我、喜歡、喝」，看不到後面的「茶」。對角線上的「自己」也算可見。</p>' },
        { t: 'choice', q: '在輸入最後面多接一個新的 token，前面那些位置原本算好的 K、V 會改變嗎？',
          opts: [
            ['不會。前面的位置看不到後面，計算結果不受影響', 1, '這叫 causal attention（因果注意力）。'],
            ['會。每多一個 token，全部都要重新算', 0, '因果遮罩讓前面的位置看不到新 token，所以它們的結果不變。'],
            ['只有 V 會變，K 不會', 0, 'K 和 V 都來自那個位置自己的表示，都不受後面影響。']
          ],
          after: '這是 <b>KV Cache 能重用的重要前提</b>：後面追加的新文字，不會回頭改變前面位置的運算結果。' }
      ]
    },
    {
      id: 'tower', name: '層層高塔', title: '層層高塔：一層一層疊上去', sub: '講義第 5 課', look: 'machine', codex: ['layer', 'head'],
      steps: [
        { t: 'info', kicker: 'TRANSFORMER LAYER', title: '一層大致做哪些事', fig: 'layer',
          html: '<p>一個 Transformer layer 會更新每個 token 的表示。<b>Attention</b> 讓 token 之間交換資訊；<b>FFN</b>（前饋網路，也叫 MLP）對每個 token 的表示再加工；另外還有正規化和殘差連接。</p>',
          html2: '<p>LLM 通常疊了幾十層。後面層的 K、V，就這樣間接包含了前面層讀到的上下文。</p>' },
        { t: 'order', q: '把一層裡的資料流排出來。',
          items: ['本層的輸入表示 hᵢ', '由 hᵢ 投影出 Qᵢ、Kᵢ、Vᵢ', 'Attention：token 之間交換資訊', 'FFN：每個 token 各自再加工', '得到 hᵢ₊₁，成為下一層的輸入'],
          after: '注意時間順序：<b>本層的 K、V 是從本層 Attention「之前」的表示投影出來的</b>，裡面還沒有本層 Attention 的結果。' },
        { t: 'choice', q: '同一段文字，這次前面接了不一樣的前文。它在第 i+1 層的 K、V 還會和上次一樣嗎？',
          opts: [
            ['可能不同。前文變了 → 本層 Attention 讀到的資訊變了 → hᵢ₊₁ 變了 → 下一層的 K、V 跟著變', 1],
            ['一定相同，因為文字一模一樣', 0, '文字相同，但它讀到的前文不同，後面幾層的表示就會不同。'],
            ['只有 Q 會變，K、V 永遠不變', 0, 'K、V 也是從該層的表示投影出來的，表示變了它們就會變。']
          ],
          after: '這正是「獨立算好的區塊快取，<b>不能無條件套到任意前文後面</b>」的根本原因。先記住，第 5 世界會再遇到它。' },
        { t: 'bucket', q: '這句話在講哪一個方向？',
          buckets: ['Token 位置', 'Layer（層）', 'Attention head'],
          items: [
            ['輸入中的第幾個片段', 0],
            ['模型堆疊的第幾層', 1],
            ['同一層裡的不同注意力投影', 2],
            ['CacheBlend「選 token 重算」選的是這個', 0, '選的是位置，不是層，也不是 FFN 的神經元'],
            ['每個 token 都要一層一層往上經過它', 1]
          ],
          after: '三個方向別搞混：<b>第 2 層不等於第 2 個 token</b>。多頭注意力讓同一層可以用好幾組投影整合資訊。' }
      ]
    }
  ],
  gate: {
    id: 'gate', name: '神殿試煉', title: '神殿試煉', sub: '艾坦的三個問題', look: 'board',
    steps: [
      { t: 'choice', kicker: '第 1 題', q: '兩個來源的權重是 0.5 和 0.5，V 分別是 [2, 0] 和 [0, 4]。Attention 輸出是？',
        opts: [['[1, 2]', 1, '0.5×[2, 0] + 0.5×[0, 4] = [1, 2]。'], ['[2, 4]', 0, '記得要乘上權重。'], ['[1, 1]', 0, '第二個數字是 0.5 × 4。'], ['[0.5, 0.5]', 0, '那是權重，不是輸出。']] },
      { t: 'choice', kicker: '第 2 題', q: '四個 token 的因果遮罩裡，第 3 個 token 可以參考哪些位置？',
        opts: [['第 1、2、3 個', 1, '自己和前面的位置。'], ['只有第 1、2 個', 0, '對角線上的自己也算。'], ['全部四個', 0, '第 4 個在它後面，看不到。'], ['只有第 4 個', 0, '方向反了，只能往前看。']] },
      { t: 'choice', kicker: '第 3 題', q: '本層的 K、V 是怎麼來的？',
        opts: [['由本層 Attention 之前的表示 hᵢ 投影而來', 1], ['從嵌入表直接查出來，每層都一樣', 0, '每一層都會用該層的輸入重新投影。'], ['是本層 Attention 算完之後的輸出', 0, '順序反了：先有 K、V，才做 Attention。']] }
    ]
  },
  build(ctx) {
    const lv = ctx.lv, st = 0xe8d9b0;
    const P = B.path(0, 7, 0, 'F');
    const A = P.island(18, 14);
    lv.spawn = { x: 0, y: 0, z: 4.6 };
    B.npc('att', 3.6, 1.8, 0, { accent: 0x8a5fc7, trim: COL.gold, hat: 'cone' }, () => (ctx.done('qkv')
      ? [['att', 'Q 負責找，K 負責被找，V 負責交出內容。走到哪裡都別忘了。']]
      : [['att', '歡迎，旅人。我是祭司艾坦。在這座神殿，每個 token 都要學會<b>注意</b>別人。'], ['att', '左前方的三面鏡，會照出同一個 token 的三種樣子。去看看吧。']]));
    ctx.station('qkv', -3.8, -2.4, 0);
    [[-7, -5], [7, -5], [-7, 5], [7, 5]].forEach((q) => B.pillar(q[0], q[1], 0, 4.2, 0.5, st));
    B.torch(-1.9, -6, 0); B.torch(1.9, -6, 0); B.rock(6.5, 0, 0, 0.9, 0xc9b384); B.bush(-6.6, 0.6, 0, 1.1, 0x7fae5a);
    B.decal('注意力神殿', 0, 0, 2.2, { h: 1.1, color: '#8a5a1a' });
    B.gemRow(-1, 1, 1, -2, 0, 3, 'a');
    P.gate({ need: ['qkv'], label: '先完成：三面鏡' });
    P.bridge(3);
    P.stairs(5, 0.45, 3.2);
    P.bridge(2);
    const C = P.island(16, 13);
    ctx.station('mix', C.x, C.z - 2.6, P.y);
    B.arch(C.x, C.z - 5.4, P.y, 5.4, 3.8, st);
    B.torch(C.x - 5.4, C.z + 3, P.y); B.torch(C.x + 5.4, C.z + 3, P.y);
    B.pillar(C.x - 6.6, C.z - 5, P.y, 3.2, 0.45, st); B.pillar(C.x + 6.6, C.z - 5, P.y, 3.2, 0.45, st);
    B.gemRow(C.x - 3, C.z + 3.5, C.x + 3, C.z + 3.5, P.y, 3, 'b');
    P.exit('L');
    P.gate({ need: ['mix'], label: '先完成：注意力祭壇' });
    P.bridge(5);
    B.gemRow(P.x + 4, P.z, P.x + 1, P.z, P.y, 2, 'c');
    const D = P.island(22, 20);
    ACT.floor(ctx, { id: 'floor', cx: D.x - 1.5, cz: D.z + 0.6, y: P.y, toks: ['我', '喜歡', '喝', '茶'], check: { x: D.x + 6.8, z: D.z + 4.4 } });
    ctx.station('causal', D.x + 6.6, D.z - 5.6, P.y);
    [[-9, -9], [9, -9], [-9, 9]].forEach((q) => B.pillar(D.x + q[0], D.z + q[1], P.y, 4.6, 0.5, st));
    B.torch(D.x + 8.6, D.z + 8.4, P.y);
    P.exit('F', 4);
    P.gate({ need: ['floor', 'causal'], label: '先完成：因果地磚與石碑' });
    P.bridge(2.5);
    const s = P.stones(3, 1.25, 2.2, 0.5);
    s.forEach((q, i) => B.gem(q.x, q.y + 1.2, q.z, 'd' + i));
    const F = P.island(18, 16);
    ctx.station('tower', F.x - 4, F.z - 2.4, P.y);
    ctx.station('gate', F.x + 3.4, F.z - 1, P.y);
    B.portal(F.x + 5.6, F.z + 5, P.y, '前往世界地圖');
    // the tower itself
    for (let i = 0; i < 5; i++) B.box(F.x - 6.4, P.y + 0.6 + i * 1.2, F.z - 5.6, 2.6 - i * 0.3, 1.1, 2.6 - i * 0.3, i % 2 ? 0xd8c49a : 0xc9b384, i === 0 ? { solid: true, walk: false } : {});
    B.box(F.x - 6.4, P.y + 6.9, F.z - 5.6, 0.9, 1.4, 0.9, COL.gold, { geo: 'cone4', phong: true, flat: true });
    B.pillar(F.x + 7.6, F.z - 6.4, P.y, 4, 0.5, st); B.torch(F.x + 1.2, F.z - 6.6, P.y); B.torch(F.x - 1.6, F.z + 6.6, P.y);
    B.flag(F.x + 5, F.z - 2.8, P.y, COL.gold); B.flag(F.x + 1.8, F.z - 2.8, P.y, COL.gold);
    B.gemRow(F.x - 2, F.z + 3.4, F.x + 2, F.z + 4.6, P.y, 3, 'e');
    const s2 = B.stone(A.x + 11.2, A.z - 2, 1.0, 2.2); B.gem(s2.x, 2.1, s2.z, 'f0');
  }
});
