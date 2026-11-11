// ===== notebook entries (unlocked by finishing stations) =====
const CODEX = {
  // world 1
  token: { w: 'w1', t: 'Token（詞元）', en: 'token / tokenizer', d: '分詞器切出的處理單位，可能是字、部分單字或標點。模型讀的是 token，不是字。' },
  tokenid: { w: 'w1', t: 'Token ID', en: 'token id', d: '每個 token 對應的整數編號。它只是查表用的索引，大小沒有意義。' },
  embedding: { w: 'w1', t: 'Embedding（嵌入向量）', en: 'embedding table', d: '用 token ID 從嵌入表查出的初始向量。同一個模型裡，同一個 ID 查到的值固定。' },
  hidden: { w: 'w1', t: 'Hidden state（隱藏狀態）', en: 'hidden state', d: '每一層算出的中間向量。同一個 token 讀到的前文不同，後面幾層的 hidden state 就會不同。' },
  matrix: { w: 'w1', t: '向量與矩陣', en: 'vector / matrix', d: '向量是一串數字；矩陣乘法會混合不同維度的資訊。n×d 乘 d×k 得到 n×k，一列就是一個 token。' },
  dot: { w: 'w1', t: '內積', en: 'dot product', d: '對應位置相乘再加總。Attention 用 Q 和 K 的內積當匹配分數；它不是機率，也不等同餘弦相似度。' },
  inference: { w: 'w1', t: '訓練與推論', en: 'training / inference', d: '訓練調整權重；推論用固定權重處理新輸入。CacheBlend 只改推論流程。' },
  autoreg: { w: 'w1', t: '自回歸生成', en: 'autoregressive', d: '每次根據已知前文算出下一個 token 的機率，選一個接回前文，再重複。' },
  // world 2
  qkv: { w: 'w2', t: 'Q、K、V', en: 'query / key / value', d: '同一個表示經過三個不同權重矩陣得到的三種向量。Q：我要找什麼；K：我能被怎麼比對；V：被參考時交出的內容。' },
  attention: { w: 'w2', t: 'Attention（注意力）', en: 'scaled dot-product attention', d: '用 Q 和 K 的內積決定參考比例，再用這組比例加權整合 V。K 影響「分配多少注意力」，V 影響「混進來的資訊」。' },
  softmax: { w: 'w2', t: 'Softmax', en: 'softmax', d: '把一組分數變成加總為 1 的權重。這是資訊混合比例，不是答對的機率。' },
  mask: { w: 'w2', t: '因果遮罩', en: 'causal mask', d: '每個位置只能參考自己與前面的位置（下三角，含對角線）。後面新增的文字不會改變前面位置的計算，這是 KV Cache 能重用的前提。' },
  layer: { w: 'w2', t: 'Transformer 層', en: 'layer', d: 'Attention 讓 token 交換資訊，FFN 各自加工，再加上正規化與殘差。本層的 K、V 由本層 Attention 之前的表示投影而來。' },
  head: { w: 'w2', t: 'Layer、head、token', en: 'layer / head / token position', d: '三個不同方向：第幾層、同一層內第幾組注意力投影、輸入中的第幾個位置。第 2 層不等於第 2 個 token。' },
  // world 3
  prefill: { w: 'w3', t: 'Prefill 與 Decode', en: 'prefill / decode', d: 'Prefill 一次處理整段已知輸入並建立 KV Cache；decode 逐步產生後續 token。Prefill 的延遲決定 TTFT。' },
  kvcache: { w: 'w3', t: 'KV Cache', en: 'KV cache', d: '各層已處理 token 的 K、V 張量。因果遮罩保證新 token 不會改變舊位置的 K、V，所以可以留著重用。' },
  noq: { w: 'w3', t: '為什麼不存 Q', en: 'no Q in cache', d: '生成新位置時只需要「新位置的 Q」去比對所有舊 K、讀取舊 V。舊位置的 Q 已經用完，通常不必保存。' },
  kvsize: { w: 'w3', t: 'KV Cache 的容量', en: 'cache size', d: '約 2 × B × L × T × Hkv × dhead × b。教學例：32 層、32 個 KV head、每頭 128 維、2 bytes，每個 token 512 KiB，4096 個 token 就是 2 GiB。' },
  cachekinds: { w: 'w3', t: '三種快取', en: 'three kinds of cache', d: '一次生成內的 KV Cache、跨請求的前綴或區塊 KV 重用、答案快取。CacheBlend 研究第二種，融合後模型仍會重新生成答案。' },
  // world 4
  rag: { w: 'w4', t: 'RAG（檢索增強生成）', en: 'retrieval-augmented generation', d: '先檢索出相關的外部資料，再把它們放進輸入，請模型據此回答。' },
  chunk: { w: 'w4', t: 'Chunk 與 top-k', en: 'chunk / top-k', d: '文件切成的文字區塊；一次取回排名前 k 個。切太短失去關係，切太長增加計算量。' },
  multihop: { w: 'w4', t: '多跳問答', en: 'multi-hop QA', d: '答案要把多個區塊的資訊連起來才能得到，例如「林安→南星公司→台北」。' },
  retrievalemb: { w: 'w4', t: '三種向量別混淆', en: 'retrieval embedding vs KV', d: '檢索 embedding 用來找文字；token embedding 是生成模型的初始表示；KV Cache 是生成模型每層的投影結果。三者不能互換。' },
  lostmiddle: { w: 'w4', t: '區塊數與品質', en: 'Fig. 2', d: '多放相關區塊通常讓品質提升，但太多會因 lost-in-the-middle 而下降。區塊越多，跨區塊注意力越重要。' },
  // world 5
  prefix: { w: 'w5', t: 'Prefix caching（前綴快取）', en: 'prefix caching', d: '只重用「從輸入開頭起連續相同」的部分。品質等同完整重算，但 RAG 常換區塊組合與順序，命中範圍有限。' },
  crossattn: { w: 'w5', t: 'Cross-attention（跨區塊注意力）', en: 'cross-attention', d: '在本論文指同一輸入內，後方區塊 token 對前方區塊 token 的注意力。它屬於 decoder self-attention 的一部分。' },
  fullreuse: { w: 'w5', t: 'Full KV reuse', en: 'full KV reuse (PromptCache)', d: '校正位置後直接拼接各區塊獨立算好的 KV。最快，但缺少跨區塊注意力，品質可能明顯下降。' },
  rope: { w: 'w5', t: 'RoPE（旋轉位置編碼）', en: 'rotary position embedding', d: '依位置旋轉 Q 和 K。注意力分數只跟相對距離有關，所以區塊搬位置時多轉一個角度就能校正。它修不了「前文不同」。' },
  fourmethods: { w: 'w5', t: '四種方法', en: 'Fig. 1', d: 'Full KV recompute：最慢、品質基準。Prefix caching：只省前綴。Full KV reuse：快但品質低。CacheBlend：重用全部、只重算一小部分。' },
  // world 6
  selective: { w: 'w6', t: 'Selective KV recompute', en: 'selective KV recompute', d: '每層只讓選中的 token 重新產生 Q、K、V，其他 token 沿用舊 K、V。Query 變少，但可讀的上下文完整保留。' },
  kvdev: { w: 'w6', t: 'KV deviation', en: 'Δkv, L1 distance', d: '某層某 token 的預存 KV 與完整重算 KV 的 L1 距離（各維度差取絕對值相加）。' },
  attndev: { w: 'w6', t: 'Attention deviation', en: 'Δattn, L2 norm', d: '某層的 forward attention 矩陣與完整重算結果之差的 L2 範數。CacheBlend 的目標就是把它壓小。' },
  hkvd: { w: 'w6', t: 'HKVD tokens', en: 'high-KV-deviation tokens', d: 'KV 偏差最高的那一小群 token。Insight 1：優先重算它們，attention deviation 降得最多。' },
  gradual: { w: 'w6', t: 'Gradual filtering（逐步篩選）', en: 'Fig. 9', d: '第一層全部重算並挑出 r₁%；下一層只重算這些、再挑 r₂%（略少）；依此往下。候選集合逐層縮小。' },
  sparsity: { w: 'w6', t: '注意力稀疏性', en: 'attention sparsity', d: '高注意力通常只出現在少數 token 之間。所以只有約 10–15% 的 token 有明顯較高的 KV 偏差（圖 7）。' },
  spearman: { w: 'w6', t: '跨層排名相關', en: 'Spearman rank correlation', d: 'Insight 2：某一層 KV 偏差最高的 token，在下一層多半也最高（圖 8）。這讓「用前層挑後層」可行。' },
  ratio: { w: 'w6', t: '重算比例', en: 'recompute ratio', d: '論文在不同實驗用過 5–18%、10–20%，控制器以約 15% 當最低值。它是特定模型與任務的經驗值，不是萬用保證。' },
  // world 7
  storage: { w: 'w7', t: '儲存裝置', en: 'GPU / RAM / SSD', d: 'GPU 記憶體最快但最貴；CPU RAM、SSD、更慢的磁碟容量大但載入慢。KV 要搬進 GPU 才能用。' },
  pipelining: { w: 'w7', t: 'Pipelining（管線化）', en: 'pipelining', d: '重算第 i 層的同時，載入第 i+1 層的 KV。穩定後每層的步調約為 max(載入, 重算)，不是兩者相加。' },
  controller: { w: 'w7', t: 'Loading controller', en: 'loading controller', d: '估算載入與重算時間。固定裝置時取 max(讓兩者相等的比例, 15%)；固定比例時挑「不增加延遲的最便宜裝置」。' },
  store: { w: 'w7', t: 'KV cache store', en: 'KV cache store', d: '保存「文字區塊 → KV 快取」的對應與文件 ID；空間滿了就淘汰最久沒用的（LRU）。' },
  fusor: { w: 'w7', t: 'Fusor（融合器）', en: 'cache fusor', d: '逐層載入各區塊的 KV，依控制器給的比例做選擇性重算。不是把兩份 KV 做平均。' },
  interfaces: { w: 'w7', t: '實作介面', en: 'vLLM integration', d: 'prefill_layer、synchronize、precompute_kv、fetch_kv_layer、all_reduce_sum；建在 vLLM 上，約 3K 行 Python。' },
  // world 8
  ttft: { w: 'w8', t: 'TTFT 與吞吐量', en: 'TTFT / throughput', d: 'TTFT 是第一個輸出 token 出現前的等待；吞吐量是單位時間完成的工作量。延遲越低越好，吞吐量越高越好。' },
  speedup: { w: 'w8', t: '加速倍數怎麼算', en: 'speedup', d: '3 秒變 1 秒是 3 倍加速、減少約 66.7%。只加速一部分時，整體倍數會比較小（5 秒變 3 秒是 1.67 倍）。' },
  f1: { w: 'w8', t: 'F1 分數', en: 'F1-score', d: 'Precision 與 recall 的調和平均。「New York City」對「New York」：P = 2/3、R = 1、F1 = 0.8。' },
  rouge: { w: 'w8', t: 'ROUGE-L', en: 'Rouge-L', d: '以最長共同子序列衡量文字重合，常用於摘要。子序列要維持順序，但不必相鄰。' },
  results: { w: 'w8', t: '主要結果', en: 'key takeaways', d: '比完整重算：TTFT 降低 2.2–3.3 倍、吞吐量提高 2.8–5 倍，品質下降在 0.02 以內。比 full KV reuse：F1 高 0.1–0.2。' },
  baselines: { w: 'w8', t: '比較對象', en: 'baselines', d: 'Full KV recompute、prefix caching、full KV reuse，以及 LangChain 的 MapReduce、MapRerank。' },
  setup: { w: 'w8', t: '實驗設定', en: 'setup', d: '六個模型（Mistral-7B、Yi-34B、Llama-70B、Ministral-8B、Qwen3-30B-A3B、gpt-oss-20B）；六個資料集，各有對應的品質指標。' },
  sensitivity: { w: 'w8', t: '敏感度分析', en: 'sensitivity', d: '改變區塊數、區塊長度、batch size、重算比例、儲存裝置、模型架構與任務，CacheBlend 都維持優勢。' },
  // world 9
  misconceptions: { w: 'w9', t: '常見誤解', en: 'pitfalls', d: '文字相同不代表 KV 能直接沿用；沒選中的 token 沒有被刪掉；重算比例不等於剩餘時間；CacheBlend 不重新訓練模型。' },
  limits: { w: 'w9', t: '限制與未來工作', en: 'limitations', d: '目前只適用 transformer 架構；尚未測試更多量化設定、最新的服務引擎，以及跨節點共享 KV 快取。' }
};

const FIGS = [
  ['圖 1', 'p.2', '四種快取策略差在哪', '哪些 token 重用、哪些重算', 'w5'],
  ['圖 2', 'p.5', '多放區塊對品質有何影響', '區塊數和 F1；不是越多永遠越好', 'w4'],
  ['圖 3', 'p.6', '直接拼接可能發生什麼錯誤', '是具體例子，不代表所有問題必錯', 'w5'],
  ['圖 4', 'p.7', '缺少跨區塊計算改變了什麼', 'Attention 的列、欄與跨區塊區域', 'w5'],
  ['圖 5', 'p.8', '選擇性重算如何運算', 'Q 變短，K 和 V 保留完整位置', 'w6'],
  ['圖 6', 'p.9', '優先更新高偏差 token 有用嗎', '重算比例與 Attention 偏差', 'w6'],
  ['圖 7', 'p.10', '偏差是否集中在少數 token', 'CDF 與高偏差尾端', 'w6'],
  ['圖 8', 'p.11', '前層能否提示後層候選', '相鄰層偏差排名的 Spearman 相關', 'w6'],
  ['圖 9', 'p.11', '候選 token 怎麼逐步篩選', '新舊 KV 比較與保留集合', 'w6'],
  ['圖 10', 'p.12', '重算與儲存如何取捨', '管線化下的時間與比例', 'w7'],
  ['圖 11', 'p.13', '元件如何串成系統', '檢索文字、載入 KV、融合和生成', 'w7'],
  ['圖 12', 'p.16', '延遲與品質能否兼顧', '橫軸 TTFT、縱軸品質，左上方較好', 'w8'],
  ['圖 13', 'p.17', '與其他 RAG 組合方法相比如何', 'MapReduce 與 MapRerank 的額外成本', 'w8'],
  ['圖 14', 'p.18', '請求增加時系統能否承受', '固定 TTFT 看可承受的請求率', 'w8'],
  ['圖 15', 'p.18', '區塊數、長度與 batch 如何影響', '每張子圖只改一個因素', 'w8'],
  ['圖 16', 'p.20', '重算比例和品質如何取捨', '各模型與資料集各自的需要', 'w8'],
  ['圖 17', 'p.20', '儲存較慢時方法是否仍有效', '載入與計算誰主導延遲', 'w8'],
  ['圖 18', 'p.21', '不同架構能否使用', '新模型的品質和重算比例', 'w8'],
  ['圖 19', 'p.22', '程式碼與推理任務能否使用', '指標已改變，不要都當成 F1', 'w8']
];

const CAUTIONS = [
  '前綴快取不只可以包含一個區塊。原稿「只有第一個區塊能重用」的說法，要放在「多區塊重新組合」的情境理解。',
  '第 5 節有一句載入與重算的快慢關係，和 Basic insight 及數值例子相反。判讀時看「哪一段比較慢」。',
  '第 4.3 節交替使用 attention deviation 和 KV deviation。圖 9 與實作是用新舊 KV 的差異挑 token，兩種偏差不是同一個量。',
  '摘要寫五個資料集，但表 3 與第 7 節實際列出六個。主要效能圖與架構擴充圖要分開說明。',
  '附錄的 RoPE 頻率公式排印有疑義，不要照字面實作；理解「分數只跟相對位置有關」比背那一行重要。'
];
