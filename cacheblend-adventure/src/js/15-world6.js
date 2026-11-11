// ===== World 6: 融合熔爐 (handout lessons 12-14, paper §4, Figs 5-9) =====
WORLDS.push({
  id: 'w6', no: 6, name: '融合熔爐', en: 'Blend Forge', color: '#c9452f',
  desc: 'CacheBlend 的核心：只重算一小部分 token', lessons: '講義第 12–14 課・論文 §4',
  intro: [
    ['kv', '到了，這裡是<b>融合熔爐</b>。融合之刃 CacheBlend 就是在這座火山裡打造的。'],
    ['kv', '上一關的結論：全部重算太慢，直接拼接品質太差。熔爐的想法是折衷，<b>全部沿用，但只修最需要修的地方</b>。'],
    ['kv', '這一關是整篇論文的核心，慢慢來。鍛造師布蘭德就在前面。']
  ],
  outro: [
    ['ble', '選哪些 token、怎麼不看答案就選到、為什麼少量就夠。三件事你都會了。這把刃的鋒口算是磨好了。'],
    ['kv', '第六片碎片！但刃還得快。下一站是管線碼頭，把 KV 從倉庫搬進 GPU 也要時間。']
  ],
  stations: [
    {
      id: 'sel', name: '重算鐵砧', title: '重算鐵砧：選擇性重算怎麼算', sub: '講義第 12 課・論文 §4.2、圖 5', look: 'forge', codex: ['selective'],
      steps: [
        { t: 'info', kicker: 'GOAL', title: 'CacheBlend 的目標',
          html: '<p class="lead">輸入裡有好幾個重複使用的區塊時，如何<b>快速</b>更新預先算好的 KV，讓 forward attention 矩陣和完整重算的結果<b>差異最小</b>？</p><p>做法叫 <span class="term">selective KV recompute（選擇性重算）</span>：照常一層一層做 prefill，但每一層<b>只更新一小部分 token 的 KV</b>，其他 token 的 KV 直接沿用快取。</p><p class="note">Forward attention 指的是「最後幾個 token 對前面上下文 token」的注意力，它直接影響生成出來的字。</p>' },
        { t: 'selrc', q: '一層裡面發生什麼事',
          after: 'Q 變短了，但 <b>K 和 V 保留完整的 8 個位置</b>，所以分數矩陣是 2 × 8。原本的因果遮罩照樣要守：t₃ 只能看 t₁ 到 t₃。' },
        { t: 'choice', q: '那些「沒被選中」的 token 怎麼了？',
          opts: [
            ['它們的舊 K、V 都還在，被選中的 token 照樣讀得到它們', 1, '減少的是「重新計算的列」，不是把上下文切掉。'],
            ['被刪掉了，模型看不到那些文字', 0, '沒有刪。它們的 K、V 繼續提供給 Attention 讀取。'],
            ['它們的 K、V 被改成 0', 0, '沒有改，直接沿用預先算好的值。']
          ] },
        { t: 'order', q: '論文 §4.2 的步驟。把一層裡的流程排出來。',
          items: ['在這一層的輸入套上遮罩，只留下選中的 token', '只為選中的 token 算出新的 Q、K、V', '把沒選中的 token 的舊 K、V 補回去，湊成完整的 K、V', '跑一樣的 Attention 模組，得到下一層的輸入'],
          after: '「KV 重算」其實是選中的 token 走完這一層的<b>局部 forward</b>（Attention、FFN 等），不是只乘一次權重矩陣。' },
        { t: 'choice', q: '每層只重算 r% 的 token。計算量大約是完整 prefill 的多少？',
          opts: [['大約 r%，計算量和選中的 token 數成正比', 1], ['還是 100%，因為 K、V 仍然有全部的位置', 0, '舊的 K、V 是直接沿用，不必重算。'], ['r% 的平方', 0, '只有 Query 那一邊變少，另一邊仍是全部位置。']],
          after: '這是計算量的估計。實際延遲還包含載入、同步、選 token 等成本，<b>不一定剛好剩 r%</b>。' }
      ]
    },
    {
      id: 'dev', name: '偏差量尺', title: '偏差量尺：怎麼量「差多少」', sub: '講義第 13 課・論文 §4.1', look: 'scale', codex: ['kvdev', 'attndev'],
      steps: [
        { t: 'info', kicker: 'DEVIATION', title: '兩把尺',
          html: '<p><span class="term">KV deviation（KV 偏差）</span>：某一層、某個 token 的 KV，和完整重算的 KV 之間的 <b>L1 距離</b>（每一維的差取絕對值，再全部加起來）。用來判斷「這個 token 該不該重算」。</p><p><span class="term">Attention deviation（注意力偏差）</span>：某一層的 forward attention 矩陣，和完整重算結果之差的 <b>L2 範數</b>。它是 CacheBlend 真正想壓低的目標。</p><p class="note">兩者不是同一個量：前者是每個 token 一個數字，後者是整個矩陣一個數字。</p>' },
        { t: 'fill', q: '算兩個 token 的 KV 偏差（L1 距離）。',
          html: '<span class="lbl">token 甲</span>　快取裡的 K = [1, 2]，完整重算的 K = [2, 4]<br>|2 − 1| + |4 − 2| = {0}<br><span class="lbl">token 乙</span>　快取裡的 K = [1, 2]，完整重算的 K = [1.1, 2.1]<br>|1.1 − 1| + |2.1 − 2| = {1}',
          blanks: [{ a: 3 }, { a: 0.2, tol: 0.011 }],
          after: '甲的偏差是 3，乙只有 0.2。如果只能重算一個，當然先修<b>甲</b>。' },
        { t: 'match', q: '論文表 1 的符號。',
          pairs: [
            ['KV<sup>pre</sup>', '預先算好、存起來的 KV'],
            ['KV<sup>full</sup>', '完整重算得到的 KV，當作標準'],
            ['KV<sup>new</sup>', 'CacheBlend 更新之後的 KV'],
            ['Δ<sub>kv</sub>', '某層某個 token 的 KV 偏差'],
            ['Δ<sub>attn</sub>', '某層 forward attention 矩陣的偏差']
          ] },
        { t: 'choice', q: '差向量是 [1, 2]。它的 L1 距離是 3，那 L2 距離是多少？',
          opts: [['√5 ≈ 2.24', 1, '平方後相加再開根號：√(1² + 2²)。'], ['3', 0, '那是 L1：絕對值相加。'], ['5', 0, '還要開根號。'], ['1.5', 0, 'L2 是平方和開根號，不是平均。']] }
      ]
    },
    { id: 'hunt', name: 'HKVD 獵場', title: 'HKVD 獵場：把額度花在刀口上', kind: 'act',
      fallback: { steps: [{ t: 'pick', q: '區塊 2 接在區塊 1 後面。下面是區塊 2 每個 token 的 KV 偏差（教學示意）。你只能重算 3 個，選哪些？', k: 3, correct: [1, 2, 3],
        items: [{ t: 'Cristiano', s: '1.9' }, { t: 'scored', s: '8.4' }, { t: '8', s: '9.7' }, { t: 'goals', s: '6.9' }, { t: 'at', s: '0.6' }, { t: 'FIFA', s: '1.2' }, { t: 'World', s: '0.8' }, { t: 'Cups', s: '1.5' }, { t: '.', s: '0.4' }],
        after: '偏差最高的那一小群叫 HKVD token。優先重算它們，注意力偏差降得最多。' }] } },
    {
      id: 'curve', name: '偏差火爐', title: '偏差火爐：為什麼少量就夠', sub: '講義第 14 課・論文 §4.3、圖 6、圖 7', look: 'machine', codex: ['hkvd', 'sparsity'],
      steps: [
        { t: 'devcurve', q: '',
          after: '從 15% 加到 50%，偏差只再掉 0.05。<b>最大的降幅來自最前面那一小撮偏差最高的 token。</b>這就是論文的 Insight 1：某層上 KV 偏差越高的 token，重算它讓注意力偏差降得越多。這些 token 叫 <b>HKVD</b>（High-KV-Deviation）token。' },
        { t: 'cdf', q: '',
          hint: '門檻大約在 10 附近。',
          after: '85% 的 token 偏差都在門檻以下，只有大約 <b>10–15%</b> 的 token 偏差明顯偏高。論文圖 7 在三個模型上都看到這種分布。' },
        { t: 'choice', q: '為什麼只有少數 token 的 KV 偏差特別高？',
          opts: [
            ['注意力很稀疏：高注意力通常只發生在少數 token 之間，多數 token 和其他區塊的 cross-attention 本來就低', 1],
            ['因為大部分 token 是標點符號', 0, '和詞性無關，關鍵是 token 之間注意力的分布。'],
            ['因為模型只有少數幾層有 Attention', 0, '每一層都有 Attention。']
          ],
          after: '一個 token 和別的區塊幾乎沒有 cross-attention，它獨立算出來的 KV 就和完整重算差不多，<b>不必重算</b>。這叫 attention sparsity（注意力稀疏性）。這裡的「稀疏」是指權重集中在少數位置，不是指矩陣裡真的都是 0。' }
      ]
    },
    {
      id: 'filter', name: '逐層篩選塔', title: '逐層篩選塔：不看答案怎麼挑', sub: '講義第 13–14 課・論文 §4.3、圖 8、圖 9', look: 'terminal', codex: ['spearman', 'gradual', 'ratio'],
      steps: [
        { t: 'info', kicker: 'CHICKEN AND EGG', title: '剛才在獵場，其實偷看了答案',
          html: '<p>要知道哪個 token 的 KV 偏差最高，得先有「完整重算的 KV」來比對。可是如果先把全部 token、全部層都算一遍，<b>想省的成本早就花光了</b>。</p><p>論文的突破口是 Insight 2：</p><p class="lead">某一層 KV 偏差最高的 token，在<b>下一層</b>多半也是最高的。</p><p class="note">直覺：每個 token 的表示在相鄰層之間變化得很慢，而 KV 是由它線性投影出來的。</p>' },
        { t: 'pick', q: '下面是第 5 層上 6 個 token 的 KV 偏差。點出最高的 3 個。', k: 3, correct: [1, 2, 4],
          items: [{ t: 't₁', s: '0.4' }, { t: 't₂', s: '5.1' }, { t: 't₃', s: '7.8' }, { t: 't₄', s: '0.9' }, { t: 't₅', s: '6.2' }, { t: 't₆', s: '1.1' }],
          after: '是 t₂、t₃、t₅。現在看看同一批 token 到了第 6 層的偏差。' },
        { t: 'info', kicker: 'FIGURE 8', title: '排名幾乎沒變', fig: 'twolayers',
          layers: [{ name: '第 5 層', vals: [0.4, 5.1, 7.8, 0.9, 6.2, 1.1] }, { name: '第 6 層', vals: [0.5, 4.6, 8.3, 0.7, 5.9, 1.4] }], top: [1, 2, 4],
          html: '<p>數值變了，但<b>誰高誰低的排名</b>幾乎一樣。論文用 Spearman 排名相關來量這件事，相鄰兩層的相關都很高（圖 8）。</p>',
          html2: '<p class="note">排名相關高，只代表「高偏差 token 的名單」相近；兩層的 KV 或 attention 矩陣本身仍然可以很不一樣。</p>' },
        { t: 'gradual', q: '逐步篩選（gradual filtering）',
          hint: '每一層都挑數字最大的那幾個。',
          after: '第一層全部重算並挑出 r₁%；下一層只重算這些、再挑出稍微少一點的 r₂%；一路往下。<b>候選名單逐層縮小</b>，比只看第一層就決定所有深層更可靠。' },
        { t: 'choice', q: '做 HKVD 比較時，同一層要同時放「新算的 KV」和「預先算好的 KV」。記憶體會不會爆？',
          opts: [['不會。一進到下一層，這一層多出來的預存 KV 就立刻丟掉，額外的記憶體可以忽略', 1], ['會，需要兩倍的 GPU 記憶體', 0, '只有「正在比較的那一層」短暫地多一份。'], ['不會，因為根本沒有載入預存的 KV', 0, '要比較就一定要載入，只是用完馬上釋放。']] },
        { t: 'choice', q: '所以每層到底要重算多少比例？',
          opts: [
            ['論文的經驗值大約 10–20%，系統以 15% 當最低值。這是特定模型與任務的結果，不是萬用保證', 1],
            ['固定 15%，任何模型任何輸入都保證品質不變', 0, '它是實驗觀察到的經驗值。不同模型與資料集需要的比例不同。'],
            ['至少 50%，否則品質一定崩潰', 0, '實驗顯示遠低於這個比例就夠了。']
          ] }
      ]
    }
  ],
  gate: {
    id: 'gate', name: '熔爐試煉', title: '熔爐試煉', sub: '布蘭德的三個問題', look: 'board',
    steps: [
      { t: 'choice', kicker: '第 1 題', q: '某一層有 20 個 token，選了 3 個重算。Attention 分數矩陣的形狀是？',
        opts: [['3 × 20', 1, 'Query 只有 3 個；Key、Value 仍然是全部 20 個位置。'], ['3 × 3', 0, 'K、V 保留完整的 20 個位置。'], ['20 × 20', 0, '只有選中的 3 個 token 當 Query。'], ['20 × 3', 0, '列是 Query（3），欄是 Key（20）。']] },
      { t: 'choice', kicker: '第 2 題', q: '重算額度有限時，應該優先重算哪些 token？',
        opts: [['KV 偏差最高的 HKVD token', 1], ['排在輸入最前面的 token', 0, '最前面的區塊是前綴，它的 KV 本來就正確。'], ['隨機挑', 0, '多數 token 偏差很小，隨機挑很容易浪費額度。'], ['人類覺得最重要的名詞', 0, '偏差是內部數值的差異，不等於人類判斷的重要性。']] },
      { t: 'choice', kicker: '第 3 題', q: 'CacheBlend 沒有完整重算的 KV 可以對答案。它怎麼找出各層的 HKVD token？',
        opts: [['利用相鄰層偏差排名高度相關：前面的層先挑候選，往後逐層篩選縮小', 1], ['每一層都先完整重算一次再挑', 0, '那樣就沒有省到任何計算。'], ['直接固定重算每個區塊的前 15% token', 0, '是依偏差挑選，不是依位置。']] }
    ]
  },
  build(ctx) {
    const lv = ctx.lv, bas = 0x4a3a40, lava = 0xff7a2a;
    lv.killY = -18;
    const P = B.path(0, 6, 0, 'F');
    const A = P.island(17, 12);
    lv.spawn = { x: 0, y: 0, z: 3.8 };
    B.npc('ble', -3.6, 0.6, 0, { accent: 0xc9452f, trim: COL.gold, hat: 'hood', body: 0xe8e0d8 }, () => (ctx.done('hunt')
      ? [['ble', '好刀匠不會把整塊鐵重打一遍，只修有缺口的地方。']]
      : [['ble', '我是布蘭德，這把融合之刃是我打的。口訣只有一句：<b>全部沿用，修最需要修的</b>。'], ['ble', '右邊的鐵砧先看一層裡怎麼算。']]));
    ctx.station('sel', 3.8, -1.8, 0);
    const pool = (x, z, w, d) => { B.box(x, 0.03, z, w, 0.06, d, lava, { basic: true, cast: false }); const gl = makeGlow(lava, Math.max(w, d) * 1.6); gl.position.set(x, 0.6, z); lv.group.add(gl); };
    pool(-6, -4, 3, 2.4); pool(6.6, 3.8, 2.4, 2);
    B.rock(-7, 3.8, 0, 1.2, bas); B.rock(7, -4.6, 0, 1.4, bas); B.torch(1.9, -5.4, 0); B.torch(-1.9, -5.4, 0);
    B.decal('融合熔爐', 0, 0, 1.6, { h: 1.05, color: '#ffb890' });
    B.gemRow(-1, 1.6, 1, -2, 0, 3, 'a');
    P.gate({ need: ['sel'], label: '先完成：重算鐵砧' });
    P.bridge(4);
    B.gemRow(P.x, P.z + 3, P.x, P.z + 1, 0, 2, 'b');
    const C = P.island(14, 12);
    ctx.station('dev', C.x, C.z - 2.2, 0);
    pool(C.x - 5, C.z + 4, 2.4, 2); B.rock(C.x + 5.4, C.z - 4.6, 0, 1.2, bas); B.torch(C.x + 5.4, C.z + 4.6, 0); B.torch(C.x - 5.4, C.z - 4.6, 0);
    P.exit('L');
    P.gate({ need: ['dev'], label: '先完成：偏差量尺' });
    P.bridge(5);
    B.gemRow(P.x + 4, P.z, P.x + 1, P.z, 0, 2, 'c');
    const H = P.island(18, 27);
    const t1 = ['Lionel', 'Messi', 'scored', '13', 'goals', 'at', 'FIFA', 'World', 'Cups'];
    const t2 = [['Cristiano', 1.9], ['scored', 8.4], ['8', 9.7], ['goals', 6.9], ['at', 0.6], ['FIFA', 1.2], ['World', 0.8], ['Cups', 1.5], ['.', 0.4]];
    const tokens = [];
    t1.forEach((tx, i) => tokens.push({ text: tx, dev: 0, chunk: 1, x: H.x - 10.4 + i * 2.6, z: H.z - 4.6 }));
    t2.forEach((q, i) => tokens.push({ text: q[0], dev: q[1], chunk: 2, x: H.x - 10.4 + i * 2.6, z: H.z + 1.2 }));
    ACT.hunt(ctx, { id: 'hunt', y: 0, cx: H.x, cz: H.z, rx: 15, rz: 10.5, budget: 3, target: 0.25, tokens,
      bad: 'The question is asking for information about FIFA World Cups …（繞圈子）',
      good: 'Lionel Messi scored more goals at FIFA World Cups than Cristiano Ronaldo. ✓',
      win: [
        ['ble', '成了！18 個 token 只重算 3 個，注意力偏差就從 1.00 掉到 0.20，神諭也答對了。'],
        ['kv', '這三個偏差最高的 token，論文叫它們 <b>HKVD token</b>。藍色那排是輸入的前綴，預先算好的 KV 本來就正確，一個都不用動。'],
        ['kv', '不過我要自首：你剛才看得到每個 token 的偏差，是因為我偷偷把「完整重算的標準答案」算出來比對了。'],
        ['ble', '真的系統要是先全部算一遍，就什麼都沒省到。怎麼不看答案也挑得準？去問塔上那台機器。']
      ] });
    B.decal('區塊 1（前綴）', H.x - 11.6, 0, H.z - 7.2, { h: 0.7, color: '#bcd0ff' });
    B.decal('區塊 2', H.x - 12.2, 0, H.z + 3.6, { h: 0.7, color: '#ffc9a0' });
    pool(H.x + 11.4, H.z + 6.4, 3, 2.4); pool(H.x - 11.2, H.z + 7, 2.4, 2);
    B.torch(H.x + 12.6, H.z - 8, 0); B.torch(H.x - 12.6, H.z - 8, 0); B.rock(H.x + 12, H.z - 1.4, 0, 1.2, bas);
    P.exit('F', 3);
    P.gate({ need: ['hunt'], label: '先完成：HKVD 獵場' });
    P.bridge(2.5);
    P.stairs(5, 0.45, 3.2);
    P.bridge(2);
    const F = P.island(20, 17);
    ctx.station('curve', F.x - 5.4, F.z + 1.6, P.y);
    ctx.station('filter', F.x - 0.6, F.z - 4.6, P.y);
    ctx.station('gate', F.x + 5, F.z - 1.2, P.y);
    B.portal(F.x + 6.8, F.z + 5.2, P.y, '前往世界地圖');
    for (let i = 0; i < 4; i++) B.box(F.x - 7.6, P.y + 0.7 + i * 1.4, F.z - 6.2, 2.6 - i * 0.4, 1.3, 2.6 - i * 0.4, i % 2 ? 0x6a585e : 0x4a3a40, i === 0 ? { solid: true, walk: false } : {});
    pool(F.x + 7.4, F.z - 6.4, 2.6, 2.2); B.torch(F.x + 2.4, F.z - 7.4, P.y); B.torch(F.x - 8.6, F.z + 7, P.y); B.rock(F.x + 8.4, F.z + 0.6, P.y, 1, bas);
    B.flag(F.x + 6.6, F.z - 3, P.y, 0xff8a3c); B.flag(F.x + 3.4, F.z - 3, P.y, 0xff8a3c);
    B.gemRow(F.x - 3, F.z + 5, F.x + 1.6, F.z + 6.4, P.y, 3, 'd');
    const s2 = B.stone(A.x + 10.6, A.z + 1, 1.0, 2.2); B.gem(s2.x, 2.1, s2.z, 'e0');
  }
});
