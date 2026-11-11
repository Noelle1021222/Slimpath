// ===== World 5: 前綴峽谷 (handout lessons 9-11, paper §3.2-3.3, Figs 1, 3, 4, Appendix A) =====
WORLDS.push({
  id: 'w5', no: 5, name: '前綴峽谷', en: 'Prefix Canyon', color: '#d9662a',
  desc: '為什麼不能直接沿用、也不能直接拼接', lessons: '講義第 9–11 課・論文 §3',
  intro: [
    ['kv', '這裡是<b>前綴峽谷</b>。對岸很遠，橋得一段一段搭。'],
    ['kv', '上一關你發現：同一個區塊會被不同的問題反覆用到。那把它的 KV 存起來，下次直接拿來鋪橋不就好了？'],
    ['kv', '很可惜，沒那麼簡單。橋匠普雷會告訴你哪些橋面踩得住、哪些會碎。']
  ],
  outro: [
    ['pre', '只認前綴的橋太保守；硬拼的橋走不穩。你現在知道問題卡在哪了。'],
    ['kv', '第五片碎片！我們要的是「拼接的速度」加上「重算的品質」。答案就在下一關的融合熔爐。']
  ],
  stations: [
    {
      id: 'pfx', name: '橋匠工坊', title: '橋匠工坊：前綴快取', sub: '講義第 9 課・論文 §3.2', look: 'forge', codex: ['prefix'],
      steps: [
        { t: 'info', kicker: 'PREFIX CACHING', title: '把開頭那段的 KV 存起來',
          html: '<p class="lead"><span class="term">Prefix caching（前綴快取）</span>：把一段文字的 KV 預先算好一次；之後只要這段文字出現在輸入的<b>最前面</b>，就直接拿來用。</p><p>前綴的 KV 不受後面文字影響（因果遮罩！），所以這樣重用的結果<b>和完整重算一模一樣</b>，品質完全不打折。vLLM、SGLang、RAGCache 都採用這個做法。</p>' },
        { t: 'info', kicker: '關鍵條件', title: '重點是「從開頭起連續相同」', fig: 'blocks',
          rows: [{ label: '快取裡有', blocks: [['S 系統指示', 's'], ['A', 'c1'], ['B', 'c2'], ['問題一', 'q']] }],
          html: '<p>能不能沿用，關鍵不只是「這段文字一樣」，而是<b>它前面的所有內容也一樣</b>（另外模型、位置等條件也要相同）。</p><p>假設先前算過下面這串輸入，各段的 KV 都存著：</p>',
          html2: '<p>現在來了新的輸入。哪幾段可以直接沿用？到峽谷上實際搭三座橋試試。</p><p class="note">前綴可以跨越好幾個區塊。論文說「只有第一個區塊能重用」，指的是區塊每次重新組合的 RAG 情境。</p>' }
      ]
    },
    { id: 'bridge', name: '前綴之橋', title: '前綴之橋：沿用還是重算', kind: 'act',
      fallback: { steps: [
        { t: 'choice', q: '快取裡有 S＋A＋B＋問題一。新輸入是 S＋A＋<b>C</b>＋問題二。可以直接沿用的前綴是？', opts: [['S＋A', 1, '從 C 開始就和舊序列不同了。'], ['S＋A＋B', 0, '新輸入的第三段是 C，不是 B。'], ['只有 S', 0, 'A 前面的內容和快取相同，A 也可以沿用。'], ['全部都不行', 0, '開頭的 S＋A 完全相同。']] },
        { t: 'choice', q: '快取裡有 S＋A＋B＋問題一。新輸入是 S＋<b>C</b>＋B＋問題二。可以直接沿用的前綴是？', opts: [['只有 S', 1, 'B 的文字雖然一樣，但它前面的內容已經變了。'], ['S 和 B', 0, 'B 不在連續相同的前綴裡。前綴快取不認它。'], ['S＋C＋B', 0, 'C 是新的，快取裡沒有。']], after: 'RAG 每次檢索到的區塊組合和順序都可能不同，所以前綴快取通常只省得到最前面那一小段。' }
      ] } },
    {
      id: 'why', name: '碎橋石碑', title: '碎橋石碑：硬拼會出什麼事', sub: '講義第 10 課・論文 §3.3、圖 3、圖 4', look: 'board', codex: ['fullreuse', 'crossattn'],
      steps: [
        { t: 'info', kicker: 'FULL KV REUSE', title: '乾脆把每一塊的 KV 都拼起來？', fig: 'blocks',
          rows: [{ label: '各自預算', blocks: [['KV A', 'kv'], ['KV B', 'kv'], ['KV C', 'kv']], note: '每個區塊獨立算好' }, { label: '直接拼接', blocks: [['KV C', 'kv'], ['KV A', 'kv'], ['KV B', 'kv'], ['問題', 'q']], note: '不管順序，拿來就用' }],
          html: '<p><span class="term">Full KV reuse</span> 是 PromptCache 提出的做法：每個區塊各自獨立算好 KV；需要時不管它排第幾，直接拼在一起。位置不對的問題，用 buffer 預留位置來處理。</p>',
          html2: '<p>這樣幾乎不用 prefill，非常快。那品質呢？看論文的例子。</p>' },
        { t: 'xattn', q: '切換兩種做法，比較 LLM 的回答。然後切到 Full KV reuse，點一下矩陣裡「整塊消失」的區域。',
          hint: '看左下角那一塊：列是區塊 2 的 token，欄是區塊 1 的 token。',
          after: '消失的是 <b>cross-attention</b>：區塊 2 的 token 去參考區塊 1 的那部分。區塊 2 獨立預算時，根本不知道前面會接區塊 1，所以這塊從來沒被算過。模型無法把 13 球和 8 球放在一起比，回答就開始繞圈子。' },
        { t: 'choice', q: '這篇論文說的 cross-attention，指的是什麼？',
          opts: [
            ['同一個輸入裡，後方區塊的 token 對前方區塊 token 的注意力', 1, '它是 decoder self-attention 的一部分，不是額外加的模組。'],
            ['encoder 和 decoder 之間另外一個注意力模組', 0, '那是傳統 encoder-decoder 架構的用詞。這裡的模型是 decoder-only。'],
            ['兩個不同 LLM 之間互相參考', 0, '這裡只有一個模型、一段輸入。']
          ] },
        { t: 'choice', q: '直接拼接之後，最後面的問題 token 還讀得到區塊 1 和區塊 2 的 K、V 嗎？',
          opts: [
            ['讀得到。缺的是「當初建立區塊 2 的表示時，區塊 2 沒看過區塊 1」', 1],
            ['讀不到區塊 1', 0, '問題的 Q 仍然可以讀到兩個區塊的 K、V。'],
            ['兩個都讀不到', 0, '拼接後 K、V 都在，問題 token 都讀得到。']
          ],
          after: '所以問題不在「看不到」，而在<b>區塊 2 的 KV 本身就和完整重算的不一樣</b>：它少了跨區塊的資訊整合。' },
        { t: 'info', kicker: '公平起見', title: 'Full KV reuse 不是每次都錯',
          html: '<p>當區塊之間的 cross-attention 本來就很低時，直接拼接是可行的。例如固定的 prompt 範本，這正是 PromptCache 主要的應用場景。</p><p>但 RAG 的多個區塊常常要<b>一起讀</b>才有意義。上一關的圖 2 也顯示：區塊越多，少了 cross-attention 的品質落差越大。</p>' }
      ]
    },
    {
      id: 'rope', name: '旋轉羅盤', title: '旋轉羅盤：位置編碼與 RoPE', sub: '講義第 11 課・論文附錄 A', look: 'altar', codex: ['rope'],
      steps: [
        { t: 'info', kicker: 'POSITION', title: '搬動區塊其實有兩個問題',
          html: '<p>「小林喜歡小張」和「小張喜歡小林」用到一樣的字，意思卻相反。模型需要<b>位置資訊</b>才能分辨順序。</p><p>現在主流的做法是 <span class="term">RoPE</span>（Rotary Position Embedding，旋轉位置編碼）：把 Q 和 K 當成平面上的向量，<b>依照 token 的位置旋轉一個角度</b>。</p><p>把預先算好的區塊搬到別的位置，會同時遇到兩個問題：<b>① 位置變了　② 前文變了</b>。先解決第一個。</p>' },
        { t: 'roperel', q: 'RoPE 的重要性質',
          after: '怎麼搬，夾角和內積都不變。<b>注意力分數只跟「相對距離」有關</b>，跟絕對位置無關。論文附錄 A 證明的就是這件事。' },
        { t: 'ropefix', q: '動手校正一個搬了家的 K',
          hint: '3 個位置 × 30° = 90°。',
          after: '多轉 3 × 30° = 90° 就對齊了。這個校正只是把 K 乘上一個旋轉矩陣，而且只做一次，幾乎不花時間（論文註腳 3）。標準 RoPE 旋轉的是 Q 和 K，不旋轉 V。' },
        { t: 'choice', q: '位置校正做完了。它「沒辦法」解決哪一個問題？',
          opts: [
            ['區塊 B 當初沒讀過區塊 A，現在前面卻多了 A', 1, '這會改變跨層的 hidden state，旋轉角度補不回來。'],
            ['區塊 B 原本從位置 0 開始，現在從位置 100 開始', 0, '這正是旋轉校正能處理的。'],
            ['K 向量需要對應到新的位置', 0, '多轉一個角度就解決了。']
          ],
          after: '<b>修正位置，不能取代修正上下文。</b>第二個問題要靠下一關的「選擇性重算」來補。' }
      ]
    },
    {
      id: 'four', name: '四條路', title: '四條路：四種方法擺在一起', sub: '論文圖 1', look: 'terminal', codex: ['fourmethods'],
      steps: [
        { t: 'info', kicker: 'FIGURE 1', title: '論文的第一張圖', fig: 'four',
          html: '<p>到這裡，論文圖 1 的四列你都看得懂了。雙線框代表「沿用預先算好的 KV」。</p>' },
        { t: 'match', q: '方法和它的做法配對。',
          pairs: [
            ['Full KV recompute', '原始文字整段重新 prefill，當作品質基準'],
            ['Prefix caching', '只沿用最前面連續相同那段的 KV，其餘照算'],
            ['Full KV reuse', '校正位置後，把所有區塊的 KV 直接拼起來'],
            ['CacheBlend', '沿用所有區塊的 KV，再重算一小部分 token']
          ] },
        { t: 'bucket', q: '輸入有很多個重複使用的區塊時，這個方法落在哪一格？',
          buckets: ['快，品質好', '快，品質差', '慢，品質好'],
          items: [['CacheBlend', 0], ['Full KV reuse', 1, '忽略了 cross-attention'], ['Full KV recompute', 2], ['Prefix caching', 2, '只省得到第一個區塊，幾乎和完整重算一樣慢']],
          after: '論文的目標一句話：<b>要有 full KV reuse 的速度，也要有 full KV recompute 的品質。</b>' },
        { t: 'choice', q: '「Full KV recompute」在 decode 階段還會用一般的 KV Cache 嗎？',
          opts: [['會。它只是不拿「先前請求的區塊快取」來省 prefill', 1], ['不會，每生成一個 token 都從頭算', 0, '第 3 世界那種一次生成內的 KV Cache，四種方法都有用。'], ['不會，它完全沒有 KV', 0, '它會在 prefill 時算出完整的 KV，再用於 decode。']] }
      ]
    }
  ],
  gate: {
    id: 'gate', name: '峽谷試煉', title: '峽谷試煉', sub: '普雷的三個問題', look: 'board',
    steps: [
      { t: 'choice', kicker: '第 1 題', q: '快取裡有 S＋A＋B＋問題一。新輸入是 S＋A＋B＋問題二。前綴快取可以沿用哪些？',
        opts: [['S＋A＋B', 1, '到 B 為止完整前文都相同；前綴可以跨好幾個區塊。'], ['只有 S', 0, 'A、B 前面的內容都沒變，也能沿用。'], ['全部，包含問題', 0, '問題不同，必須重算。']] },
      { t: 'choice', kicker: '第 2 題', q: 'Full KV reuse 的品質為什麼會下降？',
        opts: [['各區塊獨立預算，缺少區塊之間的 cross-attention', 1], ['因為 KV 存在硬碟上會壞掉', 0, '和儲存位置無關。'], ['因為它沒有校正位置', 0, 'PromptCache 有處理位置。問題出在前文不同。']] },
      { t: 'choice', kicker: '第 3 題', q: 'CacheBlend 想同時得到哪兩樣東西？',
        opts: [['Full KV reuse 的速度，加上 full KV recompute 的品質', 1], ['Prefix caching 的速度，加上 full KV reuse 的品質', 0, '多區塊時 prefix caching 並不快，full KV reuse 品質也不好。'], ['更小的模型，加上更長的答案', 0, '論文只處理一件事：如何快速融合多個區塊的 KV 快取。']] }
    ]
  },
  build(ctx) {
    const lv = ctx.lv, red = 0xb8552e;
    lv.killY = -20;
    const P = B.path(0, 6, 0, 'F');
    const A = P.island(17, 12);
    lv.spawn = { x: 0, y: 0, z: 3.8 };
    B.npc('pre', -3.4, 0.8, 0, { accent: 0xd9662a, trim: COL.blue, hat: 'cap' }, () => (ctx.done('bridge')
      ? [['pre', '記住，前綴快取只認「從開頭起連續相同」的那一段。']]
      : [['pre', '我是橋匠普雷。這座峽谷上的每一座橋，都是用算過的 KV 鋪的。'], ['pre', '先到右邊的工坊聽我講規矩，再上橋。踩錯了可是會碎的。']]));
    ctx.station('pfx', 3.8, -1.6, 0);
    const mesa = (x, z, hgt, w) => { B.box(x, hgt / 2 - 4, z, w, hgt, w * 0.9, red, { cast: false }); B.box(x, hgt - 4 + 0.2, z, w * 1.08, 0.4, w, 0xe0915a, { cast: false }); };
    B.rock(-6.4, -4, 0, 1.3, red); B.rock(6.8, 3.6, 0, 1, red); B.rock(-7, 3.8, 0, 0.8, 0xc06f3e); B.flag(7, -4.6, 0, COL.blue); B.flag(-1.9, -5.4, 0, COL.blue);
    B.decal('前綴峽谷', 0, 0, 1.6, { h: 1.05, color: '#6a2f14' });
    B.gemRow(-1, 1.6, 1, -2, 0, 3, 'a');
    P.gate({ need: ['pfx'], label: '先完成：橋匠工坊' });
    P.bridge(3);
    const L0 = P.island(9, 5);
    const SEG = 2.7 * 4;
    const mk = (now, segs) => ({ x: P.x, y: 0, z0: P.z, cached: 'S＋A＋B＋問題一', now, segs });
    const S = { name: 'S', bg: '#e3d5f5', cost: 1 }, cA = { name: 'A', bg: '#c9d6f5', cost: 4 }, cB = { name: 'B', bg: '#fbdcc0', cost: 4 }, cC = { name: 'C', bg: '#cdebd4', cost: 4 }, Q2 = { name: '問題二', bg: '#ffe9a8', cost: 1 };
    const c1 = mk('S＋A＋B＋問題二', [Object.assign({ reuse: true }, S), Object.assign({ reuse: true }, cA), Object.assign({ reuse: true }, cB), Object.assign({ reuse: false, why: '「問題二」是新的，快取裡存的是「問題一」。' }, Q2)]);
    P.gap(SEG);
    const L1 = P.island(9, 6);
    const c2 = mk('S＋A＋C＋問題二', [Object.assign({ reuse: true }, S), Object.assign({ reuse: true }, cA), Object.assign({ reuse: false, why: '快取裡這個位置是 B，不是 C。新的區塊沒有現成的 KV。' }, cC), Object.assign({ reuse: false, why: '前面已經和快取不同了，後面的全部都要重算。' }, Q2)]);
    P.gap(SEG);
    const L2 = P.island(9, 6);
    const c3 = mk('S＋C＋B＋問題二', [Object.assign({ reuse: true }, S), Object.assign({ reuse: false, why: '快取裡 S 後面接的是 A，不是 C。' }, cC), Object.assign({ reuse: false, why: 'B 的文字雖然和快取裡的一樣，但它前面從 A 換成了 C。前綴快取只認「從開頭起連續相同」的部分。' }, cB), Object.assign({ reuse: false, why: '前面已經不同了，後面的都要重算。' }, Q2)]);
    P.gap(SEG);
    const L3 = P.island(10, 7);
    ACT.bridge(ctx, { id: 'bridge', crossings: [c1, c2, c3], win: [
      ['pre', '三座橋都過了。看出規律了嗎？前綴快取只能沿用「<b>從開頭起連續相同</b>」的部分，一旦中間有一段不同，後面全部重算。'],
      ['kv', '第三座橋最可惜。B 的 KV 明明就躺在倉庫裡，只因為前面換成了 C，就整塊重算，花了 9 單位。'],
      ['pre', 'RAG 每次找回來的區塊組合和順序都不一樣，所以通常只有第一塊撿得到便宜。'],
      ['kv', '那……如果不管三七二十一，硬把 B 的舊 KV 拿來用呢？左邊的石碑記錄了下場。']
    ] });
    mesa(P.x - 9, L0.z - 9, 9, 5); mesa(P.x + 9.5, L1.z - 4, 12, 6); mesa(P.x - 10, L2.z - 6, 14, 5.5); mesa(P.x + 10, L3.z + 3, 8, 4.5); mesa(P.x + 8, L0.z + 2, 6, 4);
    B.gem(L1.x + 3, 1, L1.z, 'b0'); B.gem(L2.x - 3, 1, L2.z, 'b1'); B.gem(L3.x + 3, 1, L3.z - 1.5, 'b2');
    P.exit('L');
    P.gate({ need: ['bridge'], label: '先完成：前綴之橋' });
    P.bridge(5);
    B.gemRow(P.x + 4, P.z, P.x + 1, P.z, 0, 2, 'c');
    const C = P.island(17, 15);
    ctx.station('why', C.x + 2.8, C.z - 3.2, 0);
    ctx.station('rope', C.x - 3.6, C.z + 2.4, 0);
    B.rock(C.x - 6.6, C.z - 6, 0, 1.4, red); B.rock(C.x + 6.4, C.z + 6, 0, 1.1, red); B.flag(C.x + 6.6, C.z - 6.4, 0, COL.blue); B.torch(C.x - 6.6, C.z + 6.2, 0);
    // a broken bridge stub as a memorial
    B.box(C.x + 6.2, 0.2, C.z - 1, 2.2, 0.4, 1.2, 0xf0d0a0).rotation.z = 0.25;
    P.exit('F', -3);
    P.gate({ need: ['why', 'rope'], label: '先完成：碎橋石碑與旋轉羅盤' });
    P.bridge(2.4);
    const st = P.stones(3, 1.3, 2.2, 0.45);
    st.forEach((q, i) => B.gem(q.x, q.y + 1.2, q.z, 'd' + i));
    const F = P.island(18, 16);
    ctx.station('four', F.x - 4.2, F.z - 2, P.y);
    ctx.station('gate', F.x + 3.2, F.z - 1.2, P.y);
    B.portal(F.x + 5.8, F.z + 4.8, P.y, '前往世界地圖');
    B.rock(F.x - 7, F.z - 6.4, P.y, 1.5, red); B.rock(F.x + 7.4, F.z - 6.6, P.y, 1.2, red); B.rock(F.x - 7.2, F.z + 6.4, P.y, 1, 0xc06f3e);
    B.flag(F.x + 4.8, F.z - 3, P.y, COL.blue); B.flag(F.x + 1.6, F.z - 3, P.y, COL.blue); B.torch(F.x - 1, F.z - 7, P.y);
    B.gemRow(F.x - 2, F.z + 4, F.x + 2, F.z + 5.4, P.y, 3, 'e');
    const s2 = B.stone(A.x + 10.6, A.z + 1, 1.0, 2.2); B.gem(s2.x, 2.1, s2.z, 'f0');
  }
});
