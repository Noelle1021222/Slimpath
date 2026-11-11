// ===== World 3: 快取礦坑 (handout lessons 6-7) =====
WORLDS.push({
  id: 'w3', no: 3, name: '快取礦坑', en: 'KV Cache Mine', color: '#3f8fc4',
  desc: 'Prefill、Decode 與 KV Cache 的一生', lessons: '講義第 6–7 課',
  intro: [
    ['kv', '到家了！這裡是<b>快取礦坑</b>，我就是在這裡出生的。每一顆發光的水晶，都是一份算好的 K 和 V。'],
    ['kv', '不過在你認識快取之前，我想先讓你體會一下<b>沒有快取</b>是什麼感覺……'],
    ['kv', '前面那條跑道，去踩踩看。']
  ],
  outro: [
    ['cac', '你現在知道 KV Cache 存什麼、為什麼能省時間，也知道它有多佔空間了。'],
    ['kv', '第三片碎片！下一站是檢索圖書館。那裡的輸入又長又多，prefill 的痛會放大好幾倍。']
  ],
  stations: [
    { id: 'run', name: '生成跑道', title: '生成跑道：有快取和沒快取', kind: 'act',
      fallback: { steps: [{ t: 'fill', q: '輸入有 3 個 token，要生成 3 個 token。每處理一個 token 算 1 次。', html: '<span class="lbl">沒有 KV Cache</span>（每一輪都從頭算）<br>3 + 4 + 5 = {0} 次<br><span class="lbl">有 KV Cache</span>（舊的直接讀，只算新的）<br>3 + 1 + 1 = {1} 次', blanks: [{ a: 12 }, { a: 5 }], after: '一開始一次處理整段輸入叫 prefill，之後逐一生成叫 decode。' }] } },
    {
      id: 'life', name: '時序礦燈', title: '時序礦燈：Prefill 與 Decode', sub: '講義第 6 課', look: 'terminal', codex: ['prefill', 'kvcache', 'noq'],
      steps: [
        { t: 'info', kicker: 'PREFILL · DECODE', title: 'KV Cache 的一生',
          html: '<p class="lead"><span class="term">Prefill</span> 一次處理整段已經知道的輸入，把每一層、每個 token 的 K 和 V 存起來。</p><p><span class="term">Decode</span> 再利用這些存好的 K、V，一步一步產生後面的 token。</p><p>Prefill 沒跑完，第一個字就出不來。所以 <b>prefill 的延遲決定了 TTFT</b>（time to first token，首個 token 的等待時間）。論文提到：4000 個 token 的輸入，在一張 A40 GPU 上 prefill 就要 3 秒（Llama-34B）到 6 秒（Llama-70B）。</p>' },
        { t: 'order', q: '輸入是 x₁ x₂ x₃，要生成 y₁ y₂。把事情排出先後。',
          items: ['Prefill：一次送入 x₁ x₂ x₃，各層存下它們的 K、V', '取樣出第一個輸出 y₁', 'Decode 第 1 步：只送入 y₁，搭配既有的 KV', '快取加入 y₁ 的 K、V，取樣出 y₂'],
          after: '細節：<b>y₁ 剛被選出來時，快取裡還沒有它的 KV</b>。要等它成為下一次 forward 的輸入，才會算出它在各層的 K、V。' },
        { t: 'choice', q: '標準的 KV Cache 為什麼只存 K 和 V，不存 Q？',
          opts: [
            ['生成新位置時，只需要「新位置的 Q」去比對舊 K、讀取舊 V；舊位置的 Q 已經用完了', 1],
            ['因為 Q 太大，存不下', 0, 'Q 和 K、V 一樣大。不存的原因是用不到。'],
            ['因為 Q 每一層都一樣，不用存', 0, 'Q 每一層都不同，只是後續生成用不到舊的 Q。']
          ] },
        { t: 'choice', multi: true, q: '有了 KV Cache，生成一個新 token 時還需要算什麼？（可複選）',
          opts: [
            ['新 token 在每一層的 Q、K、V', 1],
            ['新 token 對所有舊 K、V 做的 Attention', 1],
            ['新 token 的 FFN 和最後的輸出機率', 1],
            ['所有舊 token 的 K、V 再算一遍', 0, '這正是快取省掉的部分。']
          ],
          after: '快取省掉的是「重複產生舊表示」的工作。<b>它不代表後續生成不再參考前文</b>，舊的 K、V 每一步都還在被讀。' }
      ]
    },
    {
      id: 'size', name: '快取秤重台', title: '快取秤重台：KV Cache 有多大', sub: '講義第 7 課', look: 'scale', codex: ['kvsize'],
      steps: [
        { t: 'info', kicker: 'TENSOR', title: '快取裡存的是一大堆數字',
          html: '<p>KV Cache 是大量的數字<b>張量</b>（tensor，可以想成更多維的矩陣）。它不是一份中文摘要，也不是「問題對答案」的字典。</p><p>每一層都要存一份 K 和一份 V。常見的邏輯形狀是：</p><p><code>批次 × KV head 數 × token 數 × 每頭維度</code></p><p>所以上下文越長、層數越多、KV head 越多，快取就越佔記憶體。</p>' },
        { t: 'kvsize', q: '',
          goals: [
            { q: '把設定調成 <b>32 層、32 個 KV head、每頭 128 維、2 bytes</b>，看看每個 token 要佔多少。', set: { L: 32, H: 32, d: 128, b: 2 }, test: (P) => P.L === 32 && P.H === 32 && P.d === 128 && P.b === 2, ok: '每個 token 就要 524,288 bytes，也就是 512 KiB。', bad: '四個參數要同時是 32、32、128、2。' },
            { q: '維持上面的設定，把 token 數調到 <b>4096</b>（RAG 常見的長度）。', set: { L: 32, H: 32, d: 128, b: 2, T: 4096 }, test: (P, pt) => pt === 524288 && P.T === 4096, ok: '一段 4096 token 的上下文，KV Cache 就是 2 GiB。', bad: '保持每個 token 512 KiB，然後把 T 選成 4096。' },
            { q: '現在只把 <b>KV head 數改成 8</b>，其他不動。容量變成多少？', set: { L: 32, H: 8, d: 128, b: 2, T: 4096 }, test: (P) => P.L === 32 && P.H === 8 && P.d === 128 && P.b === 2 && P.T === 4096, ok: '0.5 GiB。KV head 數變成四分之一，容量也變成四分之一。', bad: '只改 KV head 數為 8，其他維持 32 層、128 維、2 bytes、4096 token。' }
          ],
          after: '這些是理想化的教學估算，沒算分頁、對齊和管理空間。重點是感受量級：<b>KV Cache 很大，所以「存在哪裡、怎麼搬」會是一門學問</b>（第 7 世界）。' },
        { t: 'choice', q: '所以 KV Cache 裡到底存了什麼？',
          opts: [['各層已處理 token 的 K、V 數字張量', 1], ['每份文件的文字摘要', 0, '它不是文字，是模型內部的數值。'], ['問題和答案的對照表', 0, '那是「答案快取」，是另一種東西。'], ['模型的權重', 0, '權重是模型的參數；KV Cache 是這次輸入產生的中間結果。']] }
      ]
    },
    {
      id: 'kinds', name: '三色礦車', title: '三色礦車：三種快取別混在一起', sub: '講義第 7 課', look: 'machine', codex: ['cachekinds'],
      steps: [
        { t: 'bucket', q: '這句話在說哪一種快取？',
          buckets: ['一次生成內的 KV Cache', '跨請求的區塊 KV 重用', '答案快取'],
          items: [
            ['讓下一步生成不必重算舊的前綴', 0],
            ['降低「新請求」的 prefill 工作量', 1],
            ['重複的問題直接拿回上次的文字答案', 2],
            ['CacheBlend 主要研究的對象', 1],
            ['存的是已經生成好的文字', 2],
            ['剛才在跑道上體驗到的那一種', 0]
          ],
          after: 'CacheBlend 研究的是第二種：把<b>先前請求算好的上下文 KV</b>，拿來省這次請求的 prefill。' },
        { t: 'choice', q: '兩個不同的問題用到同一份文件，也重用了同一份 KV。它們會得到同一段答案嗎？',
          opts: [
            ['不會。快取融合之後，模型仍然會針對這次的問題重新生成答案', 1],
            ['會。KV 一樣，答案就一樣', 0, 'KV 只是「讀過這份文件」的中間結果，不是答案本身。'],
            ['會，不過只有前半段一樣', 0, '答案由這次的問題和完整上下文決定，沒有這種規則。']
          ] }
      ]
    }
  ],
  gate: {
    id: 'gate', name: '礦坑試煉', title: '礦坑試煉', sub: '卡許的三個問題', look: 'board',
    steps: [
      { t: 'choice', kicker: '第 1 題', q: '輸入 3 個 token，要生成 3 個 token。有 KV Cache 時，總共要處理幾次 token？',
        opts: [['5 次（3 + 1 + 1）', 1], ['12 次（3 + 4 + 5）', 0, '那是沒有快取、每輪都從頭算的次數。'], ['9 次（3 × 3）', 0, '有快取之後，每一步只需要算新的那一個。'], ['3 次', 0, 'Prefill 就要 3 次了，後面每一步還要再算 1 次。']] },
      { t: 'choice', kicker: '第 2 題', q: '32 層、8 個 KV head、每頭 128 維、每個數值 2 bytes。每個 token 的 KV 大約多大？',
        opts: [['128 KiB', 1, '2 × 32 × 8 × 128 × 2 = 131,072 bytes。'], ['512 KiB', 0, '那是 32 個 KV head 的情況。'], ['2 GiB', 0, '那是 4096 個 token、32 個 KV head 的總量。'], ['8 KiB', 0, '記得乘上層數，也要乘上 K、V 兩份。']] },
      { t: 'choice', kicker: '第 3 題', q: '使用者等第一個字出現的時間（TTFT），主要被哪個階段決定？',
        opts: [['Prefill', 1, '整段輸入要先處理完，才生得出第一個 token。'], ['Decode 的最後一步', 0, '那影響的是整段回答何時結束。'], ['訓練', 0, '訓練早就做完了，這裡談的是推論。']] }
    ]
  },
  build(ctx) {
    const lv = ctx.lv, rk = 0x55659a;
    lv.killY = -18;
    const P = B.path(0, 6, 0, 'F');
    const A = P.island(16, 12);
    lv.spawn = { x: 0, y: 0, z: 3.8 };
    B.npc('cac', -3.2, 0.6, 0, { accent: 0x3f8fc4, trim: COL.gold, hat: 'helmet' }, () => (ctx.done('run')
      ? [['cac', '算過的就存起來，別再算第二次。礦坑的老規矩。']]
      : [['cac', '新來的？我是卡許。想懂快取，先去前面那條跑道流點汗。'], ['cac', '規則很簡單：要生成下一個 token，就得把前面每個 token 都踩過一遍。']]));
    B.crystals(5.6, -3.6, 0, 1.2); B.crystals(-6, -4.4, 0, 0.9, 0xc58be0); B.crystals(6.2, 4, 0, 0.8, 0x8ff5c8);
    B.rock(-6.4, 3.6, 0, 1.1, rk); B.lamp(1.9, -5.2, 0, 0xffd9a0); B.lamp(-1.9, -5.2, 0, 0xffd9a0);
    B.decal('快取礦坑', 0, 0, 1.4, { h: 1.1, color: '#bfe0ff' });
    B.gemRow(2.6, 2, 3.6, -1, 0, 2, 'a');
    P.bridge(3);
    const R = P.island(11, 25);
    ACT.run(ctx, { id: 'run', x: R.x - 0.8, z0: R.z + 8.6, y: 0, dz: 3.3 });
    B.crystals(R.x + 4.2, R.z + 9, 0, 0.8); B.crystals(R.x - 4.4, R.z - 3, 0, 1, 0x8ff5c8); B.crystals(R.x + 4.4, R.z - 9.6, 0, 1.1, 0xc58be0);
    B.lamp(R.x - 4.6, R.z + 6, 0, 0xffd9a0); B.lamp(R.x - 4.6, R.z - 8, 0, 0xffd9a0);
    P.exit('R', -8);
    P.gate({ need: ['run'], label: '先完成：生成跑道' });
    P.bridge(5);
    B.gemRow(P.x - 4, P.z, P.x - 1, P.z, 0, 2, 'b');
    const C = P.island(15, 14);
    ctx.station('life', C.x + 0.4, C.z - 2.6, 0);
    B.crystals(C.x - 5, C.z - 5.4, 0, 1.2); B.crystals(C.x + 5.2, C.z + 5.6, 0, 1, 0x8ff5c8); B.rock(C.x + 5.4, C.z - 5.6, 0, 1.2, rk);
    B.crate(C.x - 4.6, C.z + 4.8, 0, 1.6, 1.0, 1.6, 0x7a6650); B.gem(C.x - 4.6, 2.1, C.z + 4.8, 'c0');
    B.gemRow(C.x - 1, C.z + 3.6, C.x + 3, C.z + 3.6, 0, 2, 'd');
    P.exit('F', 2);
    P.gate({ need: ['life'], label: '先完成：時序礦燈' });
    P.bridge(2.4);
    const mz = P.z - 3.4, mx = P.x;
    B.mover(mx, 0, mz, 2.8, 2.8, (t, m) => { m.mesh.position.z = mz + clamp(Math.sin(t * 0.8) * 1.45, -1, 1) * 2; }, { color: 0x7a6650 });
    B.gem(mx, 1.6, mz, 'e0');
    P.gap(6.8);
    P.bridge(2.4);
    const D = P.island(20, 18);
    ctx.station('size', D.x - 5, D.z + 1.6, 0);
    ctx.station('kinds', D.x - 0.4, D.z - 4.6, 0);
    ctx.station('gate', D.x + 5.2, D.z - 1, 0);
    B.portal(D.x + 6.6, D.z + 5.6, 0, '前往世界地圖');
    B.crystals(D.x - 8.4, D.z - 7, 0, 1.5); B.crystals(D.x + 8.2, D.z - 7.4, 0, 1.2, 0xc58be0); B.crystals(D.x - 8.2, D.z + 7, 0, 1, 0x8ff5c8);
    B.lamp(D.x + 2.4, D.z + 7.4, 0, 0xffd9a0); B.rock(D.x + 1, D.z + 4, 0, 0.8, rk);
    B.flag(D.x + 6.8, D.z - 2.8, 0, COL.cyan); B.flag(D.x + 3.6, D.z - 2.8, 0, COL.cyan);
    B.gemRow(D.x - 3, D.z + 5, D.x + 1, D.z + 6.4, 0, 3, 'f');
    const s2 = B.stone(A.x + 10, A.z + 2, 1.0, 2.2); B.gem(s2.x, 2.1, s2.z, 'g0');
  }
});
