/* 讀通投資 — market instruments (futures, options, volatility, positioning, GCFIE, plan).
   Requires widgets.js; scenario and timeline also read data-plan.js (HB.plan).

   Widgets and their data-* options (defaults in brackets):
   futures      期貨損益、保證金、槓桿與追繳
                data-contract [TX] TX|MTX|TMF|ES|MES|NQ|MNQ · data-side [long] long|short
                data-entry [臺指 47000／ES、MES 6600／NQ、MNQ 24000，示意] · data-move [點，−500／−100／−400]
                data-margin [原始保證金，依契約預設，示意]
   payoff       選擇權到期損益圖
                data-type [call] call|put · data-side [buy] buy|sell · data-strike [100] · data-premium [5] · data-spot [100]
   vixcurve     VIX 期限結構與 GCFIE 判讀
                data-state [contango] contango|flat|backwardation · data-trend [up] up|flat|down
   positioning  期貨部位週變化（加多、減多、加空、減空）
                data-dlong [20000] · data-dshort [−50000] · data-who ["Leveraged Funds"] "Asset Manager"|"Leveraged Funds"
   squeeze      軋空三階段（示意）
                data-stage [1] 1|2|3
   scenario     情境機率與期望報酬
                data-preset ["plan"] · data-capital [1000000]
   riskscore    GCFIE 風險分數（教學版，等權重）
                data-values ["6,5,6,7,6,5,7,6,7"] 九個 0–10 分數，依序 Trend…Price Response
   terminal     GCFIE 末端結構五條件
                data-checked ["2,1"] 預先勾選的條件編號（1–5）
   validation   前一日預警 → 當日價格驗證
                data-outcomes ["up,up,weak,intra"] 四個預警的隔日結果代碼
   timeline     計畫的階段、目標持股與關鍵事件
                data-today [今天] "YYYY-MM-DD"，固定「今天」用於示範
*/
(function () {
  "use strict";
  var HB = window.HB;
  if (!HB || !HB.W) return;
  var W = HB.W;
  var fmt = W.fmt;
  var h = W.h;
  var s = W.s;

  /* ---------------------------------------------------------------- helpers */
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function finite(v, d) {
    var n = parseFloat(v);
    return isFinite(n) ? n : d;
  }
  function r1(v) {
    return Math.round(v * 10) / 10;
  }
  /* number with one decimal only when needed: 33 -> "33", 14.72 -> "14.7" */
  function n1(x) {
    return fmt.num(x, Math.abs(W.round(x, 1) - Math.round(x)) < 1e-9 ? 0 : 1);
  }
  function signed1(x) {
    var v = W.round(x, 1);
    if (v === 0) return "0";
    return (v > 0 ? "+" : "−") + n1(Math.abs(v));
  }
  function minus(str) {
    return String(str).replace(/^-/, "−");
  }
  /* compact 萬／億 without trailing .0 */
  function wanT(v) {
    var a = Math.abs(v),
      sg = v < 0 ? "−" : "";
    if (a >= 1e8) return sg + fmt.num(a / 1e8, Math.abs(W.round(a / 1e8, 2) - Math.round(a / 1e8)) < 1e-9 ? 0 : 2) + " 億";
    if (a >= 1e4) return sg + n1(a / 1e4) + " 萬";
    return sg + fmt.num(a, 0);
  }
  /* rough text width for layout decisions (CJK ≈ 1em, Latin ≈ 0.58em) */
  function estW(str, size, mono) {
    var n = 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      n += c > 0x2e80 ? 1 : c === 32 ? 0.3 : mono ? 0.6 : 0.58;
    }
    return n * size;
  }
  /* SVG text with inline style (presentation attributes lose to the .w-chart text rule) */
  function txt(g, x, y, str, o) {
    o = o || {};
    var st = [];
    if (o.size) st.push("font-size:" + o.size + "px");
    if (o.weight) st.push("font-weight:" + o.weight);
    if (o.fill) st.push("fill:" + o.fill);
    if (o.family) st.push("font-family:" + o.family);
    if (o.halo) st.push("paint-order:stroke;stroke:var(--plate);stroke-width:4px;stroke-linejoin:round");
    if (o.css) st.push(o.css);
    var el = s("text", { x: r1(x), y: r1(y), "text-anchor": o.anchor || null, class: o.mono ? "mono" : null, style: st.length ? st.join(";") : null, text: String(str) });
    g.appendChild(el);
    return el;
  }
  function ln(g, x1, y1, x2, y2, o) {
    o = o || {};
    var el = s("line", {
      x1: r1(x1),
      y1: r1(y1),
      x2: r1(x2),
      y2: r1(y2),
      stroke: o.stroke || "var(--ink-3)",
      "stroke-width": o.width || 1,
      "stroke-dasharray": o.dash || null,
      "stroke-linecap": o.cap || "round",
      opacity: o.opacity === undefined ? null : o.opacity,
      "marker-end": o.end || null,
    });
    g.appendChild(el);
    return el;
  }
  function dot(g, cx, cy, fill, r) {
    var el = s("circle", { cx: r1(cx), cy: r1(cy), r: r || 5, fill: fill, stroke: "var(--plate)", "stroke-width": 2 });
    g.appendChild(el);
    return el;
  }
  function rect(g, x, y, w, hh, o) {
    o = o || {};
    var el = s("rect", {
      x: r1(x),
      y: r1(y),
      width: Math.max(0, r1(w)),
      height: Math.max(0, r1(hh)),
      rx: o.rx || null,
      fill: o.fill || "none",
      opacity: o.opacity === undefined ? null : o.opacity,
      stroke: o.stroke || null,
      "stroke-width": o.sw || null,
      "stroke-dasharray": o.dash || null,
    });
    g.appendChild(el);
    return el;
  }
  /* arrowhead marker; returns url(#id) */
  function arrow(svg, fill, size) {
    var id = W.uid("hbm-ar");
    var defs = s("defs");
    var mk = s("marker", { id: id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: size || 8, markerHeight: size || 8, markerUnits: "userSpaceOnUse", orient: "auto-start-reverse" });
    mk.appendChild(s("path", { d: "M0 0L10 5L0 10z", fill: fill || "var(--ink-3)" }));
    defs.appendChild(mk);
    svg.appendChild(defs);
    return "url(#" + id + ")";
  }
  function svgX(svg, ev) {
    var r = svg.getBoundingClientRect();
    var vb = svg.viewBox && svg.viewBox.baseVal;
    return (ev.clientX - r.left) * (vb && vb.width && r.width ? vb.width / r.width : 1);
  }
  function note(body, text) {
    var p = h("p", { class: "widget-note", text: text });
    body.appendChild(p);
    return p;
  }
  /* push labels apart vertically: items [{y}] sorted in place, min gap */
  function spread(items, gap, lo, hi) {
    items.sort(function (a, b) {
      return a.y - b.y;
    });
    for (var i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < gap) items[i].y = items[i - 1].y + gap;
    var over = items.length ? items[items.length - 1].y - hi : 0;
    if (over > 0) {
      items[items.length - 1].y -= over;
      for (var j = items.length - 2; j >= 0; j--) if (items[j + 1].y - items[j].y < gap) items[j].y = items[j + 1].y - gap;
    }
    if (items.length && items[0].y < lo) {
      var d = lo - items[0].y;
      items.forEach(function (it) {
        it.y += d;
      });
    }
    return items;
  }

  /* ======================================================================
     futures — 期貨損益：契約價值、槓桿、保證金追繳、多空對稱
     ====================================================================== */
  var FUT = {
    TX: { ex: "tw", name: "臺股期貨（大台）", mult: 200, entry: 47000, move: -500, margin: 640000 },
    MTX: { ex: "tw", name: "小型臺指（小台）", mult: 50, entry: 47000, move: -500, margin: 160000 },
    TMF: { ex: "tw", name: "微型臺指", mult: 10, entry: 47000, move: -500, margin: 32000 },
    ES: { ex: "us", name: "E-mini S&P 500", mult: 50, entry: 6600, move: -100, margin: 20000 },
    MES: { ex: "us", name: "微型 E-mini S&P 500", mult: 5, entry: 6600, move: -100, margin: 2000 },
    NQ: { ex: "us", name: "E-mini Nasdaq-100", mult: 20, entry: 24000, move: -400, margin: 30000 },
    MNQ: { ex: "us", name: "微型 E-mini Nasdaq-100", mult: 2, entry: 24000, move: -400, margin: 3000 },
  };
  /* 維持保證金 ≈ 原始 × 比例：期交所約 77%；CME 投機帳戶原始 ≈ 維持 × 110%，即維持 ≈ 91% */
  var EXCH = {
    tw: { cur: "元", maint: 0.77, src: "期交所" },
    us: { cur: "美元", maint: 1 / 1.1, src: "CME" },
  };

  HB.defineWidget("futures", {
    title: "期貨損益：保證金、槓桿與追繳",
    init: function (body, cfg) {
      var key = String(cfg.contract || "TX").toUpperCase();
      if (!FUT[key]) key = "TX";
      var side = cfg.side === "short" ? "short" : "long";
      var k0 = FUT[key];
      var entry0 = finite(cfg.entry, k0.entry);
      if (!(entry0 > 0)) entry0 = k0.entry;
      var margin0 = finite(cfg.margin, k0.margin);
      if (!(margin0 > 0)) margin0 = k0.margin;

      var pick = W.select({
        label: "契約",
        groups: [
          { label: "臺灣期交所（新台幣）", options: [["TX", "TX 臺股期貨・每點 200 元"], ["MTX", "MTX 小型臺指・每點 50 元"], ["TMF", "TMF 微型臺指・每點 10 元"]] },
          { label: "美國 CME（美元）", options: [["ES", "ES E-mini S&P 500・每點 50 美元"], ["MES", "MES 微型 S&P 500・每點 5 美元"], ["NQ", "NQ E-mini Nasdaq-100・每點 20 美元"], ["MNQ", "MNQ 微型 Nasdaq-100・每點 2 美元"]] },
        ],
        value: key,
        onChange: function (v) {
          key = FUT[v] ? v : "TX";
          reset();
          update();
        },
      });
      var sideSeg = W.seg({
        label: "方向",
        options: [["long", "做多（買進）"], ["short", "放空（賣出）"]],
        value: side,
        onChange: function (v) {
          side = v;
          update();
        },
      });
      var entryIn = W.number({ label: "進場點（示意）", suffix: "點", value: entry0, step: 1, min: 1, onInput: function () {
        rerange();
        update();
      } });
      var marginIn = W.number({ label: "原始保證金（示意）", suffix: EXCH[k0.ex].cur, value: margin0, step: 1000, min: 1, onInput: update });
      var moveSl = W.slider({
        label: "進場後指數變動",
        min: -1,
        max: 1,
        step: 1,
        value: 0,
        fmt: function (v) {
          return fmt.signed(v, 0) + " 點（" + fmt.pct(v / entry(), 1, true) + "）";
        },
        onInput: update,
      });
      body.appendChild(h("div", { class: "w-controls" }, [pick.el, sideSeg.el, entryIn.el, marginIn.el, moveSl.el]));

      var ro = W.readout([
        { key: "value", k: "一口契約價值" },
        { key: "lev", k: "槓桿倍數" },
        { key: "pnl", k: "損益" },
        { key: "pct", k: "損益占原始保證金" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 480 ? 236 : 264;
      }, draw);
      note(body, "示意：進場點與保證金只供練習，實際以期交所／CME 最新公告為準（保證金會隨指數與波動調整）。維持保證金以原始保證金的約 77%（期交所）、約 91%（CME）估算。未計手續費與期貨交易稅。");

      function C() {
        return FUT[key];
      }
      function X() {
        return EXCH[C().ex];
      }
      function entry() {
        var v = entryIn.get();
        return v > 0 ? v : C().entry;
      }
      function margin() {
        var v = marginIn.get();
        return v > 0 ? v : C().margin;
      }
      function range() {
        var e = entry();
        var cand = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
        var st = cand[cand.length - 1];
        for (var i = 0; i < cand.length; i++)
          if (cand[i] >= (e * 0.05) / 400) {
            st = cand[i];
            break;
          }
        return { R: Math.max(st, Math.round((e * 0.05) / st) * st), step: st };
      }
      function rerange(target) {
        var r = range();
        var v = target === undefined ? moveSl.get() : target;
        moveSl.setRange(-r.R, r.R, r.step);
        moveSl.set(clamp(Math.round(v / r.step) * r.step, -r.R, r.R));
      }
      function reset() {
        var c = C();
        entryIn.set(c.entry);
        marginIn.set(c.margin);
        var sfx = marginIn.el.querySelector(".w-val");
        if (sfx) sfx.textContent = X().cur;
        rerange(c.move);
      }
      function calc(mv) {
        var c = C(),
          x = X(),
          e = entry(),
          mg = margin();
        var dir = side === "long" ? 1 : -1;
        var pnl = dir * mv * c.mult;
        var maint = mg * x.maint;
        return { c: c, x: x, e: e, mg: mg, maint: maint, gap: mg - maint, value: e * c.mult, lev: (e * c.mult) / mg, dir: dir, pnl: pnl, eq: mg + pnl, callPts: (mg - maint) / c.mult };
      }
      function money(v, cur) {
        return (v > 0 ? "+" : v < 0 ? "−" : "") + fmt.num(Math.abs(v), 0) + " " + cur;
      }

      function update() {
        var mv = moveSl.get();
        var k = calc(mv);
        var cur = k.x.cur;
        ro.update({
          value: { v: wanT(k.value) + cur, s: fmt.num(k.e, 0) + " 點 × 每點 " + k.c.mult + " " + cur },
          lev: { v: fmt.num(k.lev, 1) + " 倍", s: "契約價值 ÷ 原始保證金" },
          pnl: { v: money(k.pnl, cur), s: fmt.signed(mv, 0) + " 點 × " + k.c.mult + (side === "short" ? "，放空方向相反" : ""), tone: k.pnl > 0 ? "up" : k.pnl < 0 ? "down" : "" },
          pct: { v: fmt.pct(k.pnl / k.mg, 1, true), s: "帳戶權益 " + fmt.num(k.eq, 0) + "（維持約 " + fmt.num(k.maint, 0) + "）", tone: k.pnl > 0 ? "up" : k.pnl < 0 ? "down" : "" },
        });
        var idx = fmt.pct(mv / k.e, 2, true);
        var sym =
          "<br><b>多空對稱：</b>同樣 " + fmt.signed(mv, 0) + " 點，做多" + (mv * k.c.mult >= 0 ? "賺 " : "賠 ") + fmt.num(Math.abs(mv * k.c.mult), 0) + " " + cur + "，放空就" + (mv * k.c.mult >= 0 ? "賠 " : "賺 ") + fmt.num(Math.abs(mv * k.c.mult), 0) + " " + cur + "。一方賺的錢，就是另一方賠的錢。";
        if (mv === 0) sym = "<br><b>多空對稱：</b>指數往上，做多賺、放空賠；往下則相反，金額一樣。";
        if (k.eq <= 0)
          vd.set("bad", "<b>保證金全部賠光，還倒欠 " + fmt.num(-k.eq, 0) + " " + cur + "。</b>期貨的虧損可以超過你放進去的錢。實務上權益一跌破維持保證金就會被追繳，不補或繼續虧損，期貨商可以代為沖銷（俗稱砍倉），不會等到歸零。" + sym);
        else if (k.eq < k.maint)
          vd.set(
            "bad",
            "<b>保證金追繳。</b>帳戶權益 " + fmt.num(k.eq, 0) + " " + cur + "，已經低於維持保證金約 " + fmt.num(k.maint, 0) + "。期貨商會通知你把權益補回原始保證金（要補約 " + fmt.num(k.mg - k.eq, 0) + " " + cur + "），不補可能被代為沖銷。指數只動了 " + idx + "，保證金就" + (k.pnl < 0 ? "虧了 " : "動了 ") + fmt.pct(Math.abs(k.pnl / k.mg), 0) + "：這就是 " + fmt.num(k.lev, 1) + " 倍槓桿。" + sym
          );
        else if (k.pnl < 0) {
          var left = (k.eq - k.maint) / k.c.mult;
          vd.set(
            left < k.callPts * 0.5 ? "alert" : "warn",
            "<b>還沒追繳，但緩衝只剩約 " + fmt.num(Math.floor(left), 0) + " 點。</b>指數再往不利方向走這麼多（約 " + fmt.pct(left / k.e, 2) + "），權益就會跌破維持保證金。從進場算起，只要不利 " + fmt.num(Math.floor(k.callPts), 0) + " 點（" + fmt.pct(k.callPts / k.e, 2) + "）就會被追繳。" + sym
          );
        } else if (k.pnl > 0)
          vd.set("good", "<b>賺 " + fmt.num(k.pnl, 0) + " " + cur + "，是保證金的 " + fmt.pct(k.pnl / k.mg, 0) + "。</b>指數只動 " + idx + "，報酬就被放大約 " + fmt.num(k.lev, 1) + " 倍；反方向時，虧損也一樣被放大。" + sym);
        else vd.set("", "<b>指數沒動，損益為 0。</b>拖動「進場後指數變動」看看：每動 1 點，" + (k.c.ex === "tw" ? "這口契約" : "這口契約") + "就賺賠 " + k.c.mult + " " + cur + "。" + sym);
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var mv = moveSl.get();
        var k = calc(mv);
        var R = range().R;
        var narrow = w < 480;
        var tw = k.c.ex === "tw";
        var maxAbs = Math.max(R * k.c.mult, k.gap * 1.3, 1);
        var yt = W.ticks(-maxAbs, maxAbs, narrow ? 4 : 5);
        var yfmt = function (v) {
          if (v === 0) return "0";
          return (v < 0 ? "−" : "+") + (tw ? n1(Math.abs(v) / 1e4) : fmt.num(Math.abs(v), 0));
        };
        var lw = 0;
        yt.forEach(function (v) {
          lw = Math.max(lw, estW(yfmt(v), 11, true));
        });
        var m = { l: Math.ceil(lw) + 12, r: narrow ? 36 : 44, t: 24, b: 42 };
        var x = W.scale(-R, R, m.l, w - m.r);
        var y = W.scale(-maxAbs, maxAbs, hh - m.b, m.t);
        var cx = (m.l + w - m.r) / 2;
        svg.setAttribute("aria-label", "期貨損益隨指數變動：做多與放空兩條線，虛線為保證金追繳線；目前" + (side === "long" ? "做多" : "放空") + "，指數變動 " + fmt.signed(mv, 0) + " 點，損益 " + money(k.pnl, k.x.cur));
        W.gridY(svg, y, yt, m.l, w - m.r, yfmt);
        txt(svg, 0, 12, tw ? "損益（萬元）" : "損益（美元）", { size: 11, fill: "var(--ink-3)" });
        var xt = W.ticks(-R, R, narrow ? 4 : 6);
        W.labelsX(svg, x, xt, hh - m.b + 17, function (v) {
          return fmt.signed(v, 0);
        });
        txt(svg, w - m.r, hh - 4, "指數變動（點）", { anchor: "end", size: 11, fill: "var(--ink-3)" });

        /* margin-call zone */
        var yc = y(-k.gap);
        rect(svg, m.l, yc, w - m.r - m.l, hh - m.b - yc, { fill: "var(--sig-red)", opacity: 0.07 });
        ln(svg, m.l, yc, w - m.r, yc, { stroke: "var(--sig-red)", width: 1.5, dash: "5 4", cap: "butt" });
        var callLbl = "追繳線：虧損 " + (tw ? n1(k.gap / 1e4) + " 萬元" : fmt.num(k.gap, 0) + " 美元");
        var leftSide = x(mv) > cx;
        txt(svg, leftSide ? m.l + 6 : w - m.r - 6, yc - 7, callLbl, { anchor: leftSide ? "start" : "end", size: 12, fill: "var(--ink-2)", halo: true });
        if (k.mg < maxAbs * 0.98) {
          var y0m = y(-k.mg);
          ln(svg, m.l, y0m, w - m.r, y0m, { stroke: "var(--ink-3)", width: 1, dash: "2 4", cap: "butt" });
          txt(svg, leftSide ? m.l + 6 : w - m.r - 6, y0m + 15, "原始保證金賠光", { anchor: leftSide ? "start" : "end", size: 11, fill: "var(--ink-3)", halo: true });
        }
        /* axes through zero */
        ln(svg, m.l, y(0), w - m.r, y(0), { stroke: "var(--ink-3)", width: 1, cap: "butt" });
        ln(svg, x(0), m.t, x(0), hh - m.b, { stroke: "var(--rule)", width: 1, cap: "butt" });

        /* the other side, faint */
        var od = -k.dir;
        svg.appendChild(s("path", { d: "M" + r1(x(-R)) + " " + r1(y(-R * k.c.mult * od)) + "L" + r1(x(R)) + " " + r1(y(R * k.c.mult * od)), fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5, "stroke-dasharray": "5 5", opacity: 0.75 }));
        /* selected side: loss part in --down, gain part in --up */
        var yL = y(-R * k.c.mult * k.dir),
          yR = y(R * k.c.mult * k.dir);
        svg.appendChild(s("path", { d: "M" + r1(x(-R)) + " " + r1(yL) + "L" + r1(x(0)) + " " + r1(y(0)), fill: "none", stroke: k.dir > 0 ? "var(--down)" : "var(--up)", "stroke-width": 2.5, "stroke-linecap": "round" }));
        svg.appendChild(s("path", { d: "M" + r1(x(0)) + " " + r1(y(0)) + "L" + r1(x(R)) + " " + r1(yR), fill: "none", stroke: k.dir > 0 ? "var(--up)" : "var(--down)", "stroke-width": 2.5, "stroke-linecap": "round" }));
        /* end labels */
        var ends = [
          { y: y(R * k.c.mult), t: "多單", on: k.dir > 0 },
          { y: y(-R * k.c.mult), t: "空單", on: k.dir < 0 },
        ];
        ends.forEach(function (e) {
          txt(svg, w - m.r + 6, clamp(e.y + 4, m.t + 4, hh - m.b - 2), e.t, { size: 12, weight: e.on ? 700 : 400, fill: e.on ? "var(--ink)" : "var(--ink-3)" });
        });

        /* current point */
        var px = x(mv),
          py = y(k.pnl);
        ln(svg, px, m.t, px, hh - m.b, { stroke: "var(--ink)", width: 1, opacity: 0.22, cap: "butt" });
        dot(svg, px, py, k.pnl > 0 ? "var(--up)" : k.pnl < 0 ? "var(--down)" : "var(--ink)", 5.5);
        var lab = money(k.pnl, k.x.cur);
        var lwid = estW(lab, 12);
        /* rising line (long) -> free space upper-left / lower-right; falling (short) -> upper-right / lower-left */
        var up = py - 26 > m.t;
        var toLeft = k.dir > 0 ? up : !up;
        var tx = toLeft ? px - 9 : px + 9;
        var anchor = toLeft ? "end" : "start";
        if (toLeft && tx - lwid < m.l) {
          tx = px + 9;
          anchor = "start";
        }
        if (!toLeft && tx + lwid > w - m.r) {
          tx = px - 9;
          anchor = "end";
        }
        txt(svg, tx, up ? py - 10 : py + 20, lab, { anchor: anchor, size: 12, weight: 700, fill: "var(--ink)", halo: true });
      }

      rerange(clamp(finite(cfg.move, k0.move), -range().R, range().R));
      update();
    },
  });

  /* ======================================================================
     payoff — 選擇權到期損益（每 1 單位標的）
     ====================================================================== */
  HB.defineWidget("payoff", {
    title: "選擇權到期損益圖",
    init: function (body, cfg) {
      var st = { type: cfg.type === "put" ? "put" : "call", side: cfg.side === "sell" ? "sell" : "buy" };
      var typeSeg = W.seg({
        label: "種類",
        options: [["call", "買權 Call"], ["put", "賣權 Put"]],
        value: st.type,
        onChange: function (v) {
          st.type = v;
          update();
        },
      });
      var sideSeg = W.seg({
        label: "你站哪一邊",
        options: [["buy", "買方（付權利金）"], ["sell", "賣方（收權利金）"]],
        value: st.side,
        onChange: function (v) {
          st.side = v;
          update();
        },
      });
      var kSl = W.slider({ label: "履約價", min: 60, max: 140, step: 1, value: clamp(finite(cfg.strike, 100), 60, 140), onInput: update });
      var pSl = W.slider({
        label: "權利金",
        min: 0.5,
        max: 30,
        step: 0.5,
        value: clamp(finite(cfg.premium, 5), 0.5, 30),
        fmt: function (v) {
          return fmt.num(v, 1);
        },
        onInput: update,
      });
      var sSl = W.slider({
        label: "到期時標的價格",
        min: 50,
        max: 150,
        step: 0.5,
        value: clamp(finite(cfg.spot, 100), 50, 150),
        fmt: function (v) {
          return n1(v);
        },
        onInput: update,
      });
      body.appendChild(h("div", { class: "w-controls" }, [typeSeg.el, sideSeg.el, kSl.el, pSl.el, sSl.el]));
      var ro = W.readout([
        { key: "be", k: "損益兩平點" },
        { key: "maxp", k: "最大獲利" },
        { key: "maxl", k: "最大損失" },
        { key: "at", k: "到期損益（所選價格）" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var xs = null,
        geom = null;
      var ch = W.chart(body, function (w) {
        return w < 480 ? 236 : 268;
      }, draw);
      note(body, "以 1 單位標的、在到期日計算，未計手續費與交易稅；實際契約要乘上契約乘數，例如臺指選擇權每點 50 元。也可以直接在圖上點按或拖曳，改變到期價格。");

      function intr(S) {
        return st.type === "call" ? Math.max(S - kSl.get(), 0) : Math.max(kSl.get() - S, 0);
      }
      function pnl(S) {
        var v = intr(S);
        return st.side === "buy" ? v - pSl.get() : pSl.get() - v;
      }
      function be() {
        return st.type === "call" ? kSl.get() + pSl.get() : kSl.get() - pSl.get();
      }

      function update() {
        var K = kSl.get(),
          P = pSl.get(),
          S = sSl.get();
        var buy = st.side === "buy",
          call = st.type === "call";
        var b = be();
        var maxp, maxl;
        if (buy) {
          maxp = call ? { v: "無上限", s: "標的漲越多，賺越多" } : { v: "+" + n1(K - P), s: "標的跌到 0 時：履約價 − 權利金" };
          maxl = { v: "−" + n1(P), s: "就是付出的權利金" };
        } else {
          maxp = { v: "+" + n1(P), s: "就是收到的權利金" };
          maxl = call ? { v: "無上限", s: "標的漲越多，賠越多" } : { v: "−" + n1(K - P), s: "標的跌到 0 時：履約價 − 權利金" };
        }
        maxp.tone = "up";
        maxl.tone = "down";
        var at = pnl(S);
        ro.update({
          be: { v: n1(b), s: "履約價 " + n1(K) + (call ? " ＋ " : " − ") + "權利金 " + n1(P) },
          maxp: maxp,
          maxl: maxl,
          at: { v: signed1(at), s: "標的到期價 " + n1(S) + "，每 1 單位", tone: at > 0 ? "up" : at < 0 ? "down" : "" },
        });
        var head;
        if (buy && call) head = "<b>買進買權＝看大漲，損失有限。</b>你付 " + n1(P) + " 買到「到期時可以用 " + n1(K) + " 買進」的權利。標的要漲過 " + n1(b) + "（履約價＋權利金）才開始賺，漲越多賺越多；到期沒超過 " + n1(K) + "，權利作廢，最多賠掉權利金 " + n1(P) + "。";
        else if (!buy && call) head = "<b>賣出買權＝先收權利金，賭不會大漲；大漲時虧損沒有上限。</b>你先收 " + n1(P) + "。到期時標的不超過 " + n1(K) + "，權利金全部入袋；漲過 " + n1(b) + " 就開始賠，而且漲越多賠越多。";
        else if (buy && !call) head = "<b>買進賣權＝看大跌，或替持股買保險，損失有限。</b>你付 " + n1(P) + " 買到「到期時可以用 " + n1(K) + " 賣出」的權利。標的跌破 " + n1(b) + " 才開始賺；到期沒跌破 " + n1(K) + "，最多賠掉權利金 " + n1(P) + "。";
        else head = "<b>賣出賣權＝先收權利金，賭不會大跌；大跌時虧損很大。</b>你先收 " + n1(P) + "。到期時標的不低於 " + n1(K) + "，權利金入袋；跌破 " + n1(b) + " 開始賠，最多可賠 " + n1(K - P) + "（標的跌到 0 時）。";
        var iv = intr(S);
        var tail;
        if (iv > 0) {
          tail = "標的到期價 " + n1(S) + "：這個選擇權有 " + n1(iv) + " 的履約價值。" + (buy ? "扣掉付出的權利金 " + n1(P) + "，" : "賣方要付出 " + n1(iv) + "，加上先收的權利金 " + n1(P) + "，") + (at > 0 ? "淨賺 " + n1(at) : at < 0 ? "淨賠 " + n1(-at) : "剛好打平") + "。";
        } else {
          tail = "標的到期價 " + n1(S) + "：沒有履約價值，選擇權作廢，" + (buy ? "買方賠掉權利金 " + n1(P) + "。" : "賣方賺走權利金 " + n1(P) + "。");
        }
        vd.set(buy ? "warn" : call ? "bad" : "alert", head + "<br>" + tail);
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var narrow = w < 480;
        var K = kSl.get(),
          P = pSl.get(),
          S = sSl.get(),
          b = be();
        var buy = st.side === "buy",
          call = st.type === "call";
        var pts = [50, 150];
        if (K > 50 && K < 150) pts.push(K);
        if (b > 50 && b < 150 && Math.abs(b - K) > 1e-9) pts.push(b);
        pts.sort(function (a, c) {
          return a - c;
        });
        var vals = pts.map(pnl);
        var lo = Math.min(0, Math.min.apply(null, vals)),
          hi = Math.max(0, Math.max.apply(null, vals));
        var pad = (hi - lo) * 0.14 || 5;
        lo -= pad;
        hi += pad;
        var yt = W.ticks(lo, hi, narrow ? 4 : 5);
        var lw = 0;
        yt.forEach(function (v) {
          lw = Math.max(lw, estW(signed1(v), 11, true));
        });
        var m = { l: Math.ceil(lw) + 12, r: 16, t: 28, b: 40 };
        var x = W.scale(50, 150, m.l, w - m.r),
          y = W.scale(lo, hi, hh - m.b, m.t);
        xs = x;
        geom = { w: w };
        svg.setAttribute("aria-label", (buy ? "買進" : "賣出") + (call ? "買權" : "賣權") + "的到期損益圖：履約價 " + n1(K) + "，權利金 " + n1(P) + "，損益兩平點 " + n1(b));
        W.gridY(svg, y, yt, m.l, w - m.r, signed1);
        W.labelsX(svg, x, narrow ? [50, 75, 100, 125, 150] : [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150], hh - m.b + 17);
        txt(svg, w - m.r, hh - 4, "到期時標的價格", { anchor: "end", size: 11, fill: "var(--ink-3)" });
        /* legend */
        rect(svg, 0, 4, 10, 10, { fill: "var(--up)", opacity: 0.55, rx: 2 });
        txt(svg, 14, 13, "獲利", { size: 12 });
        rect(svg, 50, 4, 10, 10, { fill: "var(--down)", opacity: 0.55, rx: 2 });
        txt(svg, 64, 13, "虧損", { size: 12 });
        txt(svg, w - m.r, 13, "每 1 單位標的", { anchor: "end", size: 11, fill: "var(--ink-3)" });

        /* shaded regions (exact: the payoff is linear between the vertices) */
        function area(sign) {
          var d = "M" + r1(x(pts[0])) + " " + r1(y(0));
          pts.forEach(function (p) {
            var v = pnl(p);
            d += "L" + r1(x(p)) + " " + r1(y(sign > 0 ? Math.max(v, 0) : Math.min(v, 0)));
          });
          d += "L" + r1(x(pts[pts.length - 1])) + " " + r1(y(0)) + "Z";
          return d;
        }
        svg.appendChild(s("path", { d: area(1), fill: "var(--up)", opacity: 0.12 }));
        svg.appendChild(s("path", { d: area(-1), fill: "var(--down)", opacity: 0.12 }));
        ln(svg, m.l, y(0), w - m.r, y(0), { stroke: "var(--ink-3)", width: 1, cap: "butt" });

        /* payoff line; an arrowhead where it keeps going (unlimited side) */
        var unl = (buy && call) || (!buy && call);
        var mk = unl ? arrow(svg, "var(--ink)", 9) : null;
        svg.appendChild(
          s("path", {
            d: W.linePath(
              pts.map(function (p) {
                return [x(p), y(pnl(p))];
              })
            ),
            fill: "none",
            stroke: "var(--ink)",
            "stroke-width": 2,
            "stroke-linejoin": "round",
            "stroke-linecap": "round",
            "marker-end": mk,
          })
        );

        /* strike: at the kink */
        var kv = pnl(K);
        var ky = y(kv);
        var kLbl = "履約價 " + n1(K);
        var kBelow = buy;
        var kyText = kBelow ? ky + 18 : ky - 9;
        var kAnchor = "middle",
          kx = x(K);
        if (kBelow && kyText > hh - m.b - 3) {
          kyText = ky - 9;
          kAnchor = call ? "end" : "start";
          kx = call ? x(K) - 4 : x(K) + 4;
        }
        if (!kBelow && kyText < m.t + 10) {
          kyText = ky + 18;
          kAnchor = call ? "end" : "start";
          kx = call ? x(K) - 4 : x(K) + 4;
        }
        if (K >= 50 && K <= 150) {
          ln(svg, x(K), y(0) - 4, x(K), y(0) + 4, { stroke: "var(--ink-2)", width: 1.5, cap: "butt" });
          txt(svg, clamp(kx, m.l + (kAnchor === "middle" ? estW(kLbl, 12) / 2 : 0), w - m.r - (kAnchor === "middle" ? estW(kLbl, 12) / 2 : 0)), kyText, kLbl, { anchor: kAnchor, size: 12, fill: "var(--ink-2)", halo: true });
        }

        /* spot marker + label; free side: call -> left, put -> right; buyer above, seller below */
        var sx = x(S),
          sv = pnl(S),
          sy = y(sv);
        ln(svg, sx, m.t, sx, hh - m.b, { stroke: "var(--ink)", width: 1, opacity: 0.22, cap: "butt" });
        var lab = "到期價 " + n1(S) + "：" + signed1(sv);
        var lwid = estW(lab, 12);
        var goLeft = call;
        var sAbove = buy;
        var lx = goLeft ? sx - 9 : sx + 9,
          an = goLeft ? "end" : "start";
        if (goLeft && lx - lwid < m.l) {
          lx = sx + 9;
          an = "start";
        }
        if (!goLeft && lx + lwid > w - m.r) {
          lx = sx - 9;
          an = "end";
        }
        var ly = sAbove ? sy - 10 : sy + 20;
        if (ly < m.t + 2) ly = sy + 20;
        if (ly > hh - m.b - 4) ly = sy - 10;

        /* breakeven on the zero line (label hidden when it would sit on the spot label) */
        if (b > 50 && b < 150) {
          var bx = x(b);
          var bLbl = "損益兩平 " + n1(b);
          var bw = estW(bLbl, 12);
          var bAn = call ? "end" : "start";
          var bTx = call ? bx - 7 : bx + 7;
          var bTy = buy ? y(0) - 9 : y(0) + 18;
          var bx0 = bAn === "end" ? bTx - bw : bTx,
            sx0 = an === "end" ? lx - lwid : lx;
          var clash = Math.abs(ly - bTy) < 16 && bx0 < sx0 + lwid && sx0 < bx0 + bw;
          if (!clash && bx0 > m.l - 2 && bx0 + bw < w - m.r + 2) txt(svg, bTx, bTy, bLbl, { anchor: bAn, size: 12, fill: "var(--ink-2)", halo: true });
          dot(svg, bx, y(0), "var(--ink-2)", 4.5);
        }
        dot(svg, sx, sy, sv > 0 ? "var(--up)" : sv < 0 ? "var(--down)" : "var(--ink)", 5.5);
        txt(svg, lx, ly, lab, { anchor: an, size: 12, weight: 700, fill: "var(--ink)", halo: true });
      }

      /* tap / drag on the chart moves the expiry price */
      var dragging = false;
      ch.svg.style.touchAction = "pan-y";
      ch.svg.style.cursor = "ew-resize";
      function setFrom(ev) {
        if (!xs) return;
        var v = xs.invert(svgX(ch.svg, ev));
        sSl.set(clamp(Math.round(v * 2) / 2, 50, 150));
        update();
      }
      ch.svg.addEventListener("pointerdown", function (ev) {
        dragging = true;
        setFrom(ev);
      });
      ch.svg.addEventListener("pointermove", function (ev) {
        if (dragging && (ev.pointerType !== "mouse" || ev.buttons)) setFrom(ev);
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) {
        ch.svg.addEventListener(t, function () {
          dragging = false;
        });
      });
      update();
    },
  });

  /* ======================================================================
     vixcurve — VIX 期限結構 × 股市走勢 → GCFIE 第十節判讀
     ====================================================================== */
  var VIXC = {
    contango: { v: [15, 16.5, 17.6, 18.4, 19, 19.4, 19.7], name: "正價差" },
    flat: { v: [22, 22.2, 22.3, 22.3, 22.4, 22.4, 22.5], name: "變平" },
    backwardation: { v: [34, 30, 27.5, 26, 25, 24.4, 24], name: "逆價差" },
  };
  HB.defineWidget("vixcurve", {
    title: "VIX 期限結構與 GCFIE 判讀",
    init: function (body, cfg) {
      var st = { state: VIXC[cfg.state] ? cfg.state : "contango", trend: ["up", "flat", "down"].indexOf(cfg.trend) >= 0 ? cfg.trend : "up" };
      var stateSeg = W.seg({
        label: "期限結構（示意）",
        options: [["contango", "正價差（正常）"], ["flat", "變平"], ["backwardation", "逆價差"]],
        value: st.state,
        onChange: function (v) {
          st.state = v;
          update();
        },
      });
      var trendSeg = W.seg({
        label: "同一段時間的股市",
        options: [["up", "上漲"], ["flat", "持平"], ["down", "下跌"]],
        value: st.trend,
        onChange: function (v) {
          st.trend = v;
          update();
        },
      });
      body.appendChild(h("div", { class: "w-controls" }, [stateSeg.el, trendSeg.el]));
      var ro = W.readout([
        { key: "spot", k: "現貨 VIX" },
        { key: "m1", k: "近月期貨 M1" },
        { key: "shape", k: "曲線形狀" },
        { key: "gc", k: "GCFIE 判讀" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 480 ? 228 : 256;
      }, draw);
      note(body, "曲線數字為示意，不是即時報價。現貨 VIX 由 S&P 500 選擇權價格推算，代表市場預期未來 30 天的波動；M1–M6 是依到期月份由近到遠排列的 VIX 期貨。");

      function judge() {
        var S = st.state,
          T = st.trend;
        if (S === "backwardation")
          return {
            tone: "bad",
            name: "恐慌確認",
            en: "Backwardation",
            text:
              "<b>恐慌確認：逆價差 → 波動率市場進入壓力狀態。</b>近月期貨比遠月貴，代表大家搶著要「現在」的保險。" +
              (T === "down" ? "股市下跌加上逆價差，是最典型的壓力組合。" : T === "up" ? "股市雖然反彈，但曲線仍是逆價差：壓力還沒解除，要等曲線回到正價差才算降溫。" : "股市沒再跌，但曲線仍是逆價差：壓力還在，先不要急著判斷已經安全。"),
          };
        if (S === "flat" && T === "down") return { tone: "alert", name: "高風險", en: "Risk-off 形成中", text: "<b>高風險：股票下跌 + VIX 快速上升 + 期貨曲線變平 → Risk-off 正在形成。</b>現貨 VIX 追上遠月，代表市場不再只為「未來」付保險費，而是為眼前的下跌付費。" };
        if (S === "flat") return { tone: "warn", name: "升級警戒", en: "Volatility Divergence", text: "<b>升級警戒：股票" + (T === "up" ? "還在漲" : "沒有跌") + "，VIX 卻在上升 → Volatility Divergence。</b>曲線被拉平，代表有人在股價還好的時候就先買保險。GCFIE 把它當成多頭變脆弱的早期訊號，不是下跌的保證。" };
        if (T === "down") return { tone: "warn", name: "觀察", en: "尚未確認", text: "<b>股票在跌，但波動率結構還是正常的正價差。</b>這還不是 GCFIE 說的 Risk-off：接下來要看 VIX 會不會快速上升、曲線會不會開始變平。" };
        return { tone: "good", name: "正常", en: "Contango", text: "<b>正常：VIX 低 + 期貨正價差 → 市場平穩。</b>平常市場認為「未來總會有事」，所以越遠的月份越貴，曲線向右上。" };
      }

      function update() {
        var c = VIXC[st.state].v;
        var j = judge();
        ro.update({
          spot: { v: fmt.num(c[0], 1), s: "預期未來 30 天波動（年化 %）" },
          m1: { v: fmt.num(c[1], 1), s: "M1 − 現貨 " + signed1(c[1] - c[0]) },
          shape: { v: VIXC[st.state].name, s: "M6 − 現貨 " + signed1(c[6] - c[0]) },
          gc: { v: j.name, s: j.en },
        });
        vd.set(j.tone, j.text);
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var narrow = w < 480;
        var m = { l: 30, r: narrow ? 50 : 64, t: 26, b: 30 };
        var y = W.scale(10, 40, hh - m.b, m.t);
        var x = function (i) {
          return m.l + 14 + (i * (w - m.r - m.l - 28)) / 6;
        };
        svg.setAttribute("aria-label", "VIX 期限結構示意：現貨與第 1 到第 6 個月期貨，目前為" + VIXC[st.state].name);
        W.gridY(svg, y, [10, 20, 30, 40], m.l, w - m.r);
        txt(svg, 0, 12, "VIX", { size: 11, fill: "var(--ink-3)" });
        var cats = ["現貨", "M1", "M2", "M3", "M4", "M5", "M6"];
        cats.forEach(function (c, i) {
          txt(svg, x(i), hh - m.b + 18, c, { anchor: "middle", mono: i > 0, size: i ? null : 12, fill: i ? null : "var(--ink-2)" });
        });
        txt(svg, w - m.r, hh - 2, "", {});
        /* ghosts first */
        var labels = [];
        ["contango", "flat", "backwardation"].forEach(function (k) {
          var on = k === st.state;
          var v = VIXC[k].v;
          var p = v.map(function (val, i) {
            return [x(i), y(val)];
          });
          if (!on) svg.appendChild(s("path", { d: W.linePath(p), fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5, "stroke-dasharray": "4 4", opacity: 0.6 }));
          labels.push({ y: y(v[6]) + 4, t: VIXC[k].name, on: on });
        });
        var c = VIXC[st.state].v;
        var pts = c.map(function (val, i) {
          return [x(i), y(val)];
        });
        svg.appendChild(s("path", { d: W.linePath(pts), fill: "none", stroke: "var(--cat-1)", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }));
        pts.forEach(function (p, i) {
          dot(svg, p[0], p[1], "var(--cat-1)", i === 0 ? 6 : 4.5);
          txt(svg, p[0], p[1] + (st.state === "backwardation" ? 18 : -10), fmt.num(c[i], 1), { anchor: "middle", mono: true, fill: "var(--ink-2)", halo: true });
        });
        spread(labels, 15, m.t + 4, hh - m.b - 2).forEach(function (l) {
          txt(svg, w - m.r + 8, l.y, l.t, { size: 12, weight: l.on ? 700 : 400, fill: l.on ? "var(--ink)" : "var(--ink-3)" });
        });
        var ann = { contango: "遠月比現貨貴：曲線向右上", flat: "各月份差不多：曲線變平", backwardation: "近月比遠月貴：曲線向右下" }[st.state];
        txt(svg, w - m.r, m.t + 4, ann, { anchor: "end", size: 12, fill: "var(--ink-2)", halo: true });
      }
      update();
    },
  });

  /* ======================================================================
     positioning — ΔLong / ΔShort → ΔNet 與動作分類（CFTC TFF 週資料）
     ====================================================================== */
  HB.defineWidget("positioning", {
    title: "期貨部位週變化：加多、減空怎麼看",
    init: function (body, cfg) {
      var who = /asset/i.test(String(cfg.who || "")) ? "am" : "lf";
      var dl0 = clamp(finite(cfg.dlong, 20000), -1e7, 1e7),
        ds0 = clamp(finite(cfg.dshort, -50000), -1e7, 1e7);
      var dlIn = W.number({ label: "ΔLong 多單本週變化", suffix: "口", value: dl0, step: 1000, onInput: update });
      var dsIn = W.number({ label: "ΔShort 空單本週變化", suffix: "口", value: ds0, step: 1000, onInput: update });
      var whoSeg = W.seg({
        label: "對象（CFTC TFF 分類）",
        options: [["am", "Asset Manager"], ["lf", "Leveraged Funds"]],
        value: who,
        onChange: function (v) {
          who = v;
          update();
        },
      });
      body.appendChild(h("div", { class: "w-controls" }, [dlIn.el, dsIn.el, whoSeg.el]));
      var ro = W.readout([
        { key: "net", k: "ΔNet 淨部位變化" },
        { key: "la", k: "多方動作" },
        { key: "sa", k: "空方動作" },
        { key: "dir", k: "淨部位方向" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 480 ? 214 : 204;
      }, draw);
      note(body, "CFTC 資料是週資料：Position date 為週二、發布在週五，有延遲，不代表即時部位。ΔShort 是「空單口數」的變化：負數表示空單變少，也就是減空（空單回補）。");

      function vals() {
        var dl = clamp(dlIn.get(), -1e7, 1e7),
          ds = clamp(dsIn.get(), -1e7, 1e7);
        return { dl: dl, ds: ds, net: dl - ds };
      }
      function la(v) {
        return v > 0 ? "加多" : v < 0 ? "減多" : "持平";
      }
      function sa(v) {
        return v > 0 ? "加空" : v < 0 ? "減空（回補）" : "持平";
      }
      function ko(v) {
        return fmt.signed(v, 0) + " 口";
      }

      function update() {
        var d = vals();
        ro.update({
          net: { v: ko(d.net), s: "ΔLong − ΔShort ＝ " + fmt.signed(d.dl, 0) + " − (" + fmt.signed(d.ds, 0) + ")", tone: d.net > 0 ? "up" : d.net < 0 ? "down" : "" },
          la: { v: la(d.dl), s: "多單 " + ko(d.dl) },
          sa: { v: sa(d.ds), s: "空單 " + ko(d.ds) },
          dir: { v: d.net > 0 ? "往多方移動" : d.net < 0 ? "往空方移動" : "沒有變化", s: "是「變化」的方向，不是部位本身偏多或偏空" },
        });
        var L = d.dl,
          S = d.ds;
        var tone, t;
        if (L > 0 && S < 0) {
          tone = "good";
          t = "<b>加多＋減空＝最積極的轉多。</b>一邊加多單、一邊回補空單，淨部位一週往多方移動 " + fmt.num(d.net, 0) + " 口。";
        } else if (L < 0 && S > 0) {
          tone = "bad";
          t = "<b>減多＋加空＝最積極的轉空。</b>一邊砍多單、一邊加空單，淨部位一週往空方移動 " + fmt.num(-d.net, 0) + " 口。";
        } else if (S < 0 && L === 0) {
          tone = "warn";
          t = "<b>減空 " + fmt.num(-S, 0) + " 口＝Short Covering（空單回補）。</b>要搭配價格看：價格加速上漲是 Stage 2（軋空進行中），價格漲不動是 Stage 3（燃料耗盡）。";
        } else if (S < 0 && L < 0) {
          tone = "warn";
          t = "<b>減多＋減空＝雙邊降低曝險（去槓桿）。</b>多空兩邊都在縮手，ΔNet " + ko(d.net) + "。其中減空 " + fmt.num(-S, 0) + " 口是空單回補：仍要搭配價格看是 Stage 2 還是 Stage 3。";
        } else if (L > 0 && S > 0) {
          tone = "warn";
          t = "<b>加多＋加空＝兩邊部位一起變大。</b>可能是看法分歧，或是一邊持有、一邊避險；重點看淨變化 " + ko(d.net) + " 的方向。";
        } else if (L > 0) {
          tone = "good";
          t = "<b>加多 " + fmt.num(L, 0) + " 口。</b>主動增加多單，淨部位往多方移動。";
        } else if (L < 0) {
          tone = "warn";
          t = "<b>減多 " + fmt.num(-L, 0) + " 口。</b>可能是獲利了結或看法轉保守，淨部位往空方移動。";
        } else if (S > 0) {
          tone = "alert";
          t = "<b>加空 " + fmt.num(S, 0) + " 口。</b>主動看空或加強避險，淨部位往空方移動。";
        } else {
          tone = "";
          t = "<b>本週部位沒有變化。</b>輸入多單與空單的週變化看看。";
        }
        t +=
          who === "lf"
            ? "<br><b>Leveraged Funds</b>（避險基金、CTA 等）的空單常包含避險與套利，「空單很多」不等於一定會軋空；GCFIE 看的是空單有沒有開始快速回補，以及價格怎麼反應。"
            : "<br><b>Asset Manager</b>（退休基金、共同基金等）多半是長線多單，變化較慢，反映的是資產配置；它減多通常比單週數字更值得留意。";
        vd.set(tone, t);
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var narrow = w < 480;
        var d = vals();
        var rows = [
          { k: "ΔLong", zh: "多單", v: d.dl, act: la(d.dl), bull: d.dl > 0 },
          { k: "ΔShort", zh: "空單", v: d.ds, act: sa(d.ds), bull: d.ds < 0 },
          { k: "ΔNet", zh: "淨部位", v: d.net, act: d.net > 0 ? "往多方" : d.net < 0 ? "往空方" : "不變", bull: d.net > 0 },
        ];
        var labW = narrow ? 92 : 132;
        var m = { l: labW, r: 12, t: 34, b: 12 };
        var rowH = (hh - m.t - m.b) / 3;
        var mx = Math.max(Math.abs(d.dl), Math.abs(d.ds), Math.abs(d.net), 1) * 1.08;
        var x = W.scale(-mx, mx, m.l, w - m.r);
        svg.setAttribute("aria-label", "部位週變化長條圖：ΔLong " + ko(d.dl) + "、ΔShort " + ko(d.ds) + "、ΔNet " + ko(d.net));
        /* legend */
        rect(svg, 0, 6, 10, 10, { fill: "var(--up)", rx: 2 });
        txt(svg, 14, 15, narrow ? "偏多" : "偏多（加多、減空）", { size: 12 });
        var lx = narrow ? 56 : 136;
        rect(svg, lx, 6, 10, 10, { fill: "var(--down)", rx: 2 });
        txt(svg, lx + 14, 15, narrow ? "偏空" : "偏空（加空、減多）", { size: 12 });
        txt(svg, w - m.r, 15, "顏色＝對行情的含義", { anchor: "end", size: 11, fill: "var(--ink-3)" });
        ln(svg, x(0), m.t - 4, x(0), hh - m.b, { stroke: "var(--ink-3)", width: 1, cap: "butt" });
        rows.forEach(function (r, i) {
          var cy = m.t + rowH * i + rowH / 2;
          if (i === 2) ln(svg, 0, m.t + rowH * 2, w - m.r, m.t + rowH * 2, { stroke: "var(--rule-2)", width: 1, cap: "butt" });
          txt(svg, 0, cy - 3, r.k + " " + r.zh, { size: 13, weight: 700, fill: "var(--ink)" });
          txt(svg, 0, cy + 13, r.act, { size: 12, fill: "var(--ink-3)" });
          var x0 = x(Math.min(0, r.v)),
            x1 = x(Math.max(0, r.v));
          var bh = 18;
          var col = r.v === 0 ? "var(--ink-3)" : r.bull ? "var(--up)" : "var(--down)";
          rect(svg, x0, cy - bh / 2, Math.max(r.v === 0 ? 0 : 1.5, x1 - x0), bh, { fill: col, opacity: i === 2 ? 1 : 0.85, rx: 1.5 });
          var lab = fmt.signed(r.v, 0);
          var lwid = estW(lab, 12, true);
          var len = x1 - x0;
          if (r.v === 0) txt(svg, x(0) + 6, cy + 4, "0", { mono: true });
          else if (len > lwid + 14) txt(svg, r.v > 0 ? x1 - 6 : x0 + 6, cy + 4, lab, { anchor: r.v > 0 ? "end" : "start", mono: true, size: 12, weight: 600, fill: "var(--plate)" });
          else txt(svg, r.v > 0 ? x1 + 6 : x0 - 6, cy + 4, lab, { anchor: r.v > 0 ? "start" : "end", mono: true, size: 12, fill: "var(--ink)" });
        });
      }
      update();
    },
  });

  /* ======================================================================
     squeeze — 軋空三階段（示意）：價格與空單部位，第 1 週＝100
     ====================================================================== */
  var SQZ = {
    1: { shorts: [100, 103, 106, 108, 111, 113, 114, 116], price: [100, 100.6, 99.7, 100.4, 101.1, 100.5, 101.2, 101.6], pn: "原地踏步", sn: "越堆越高" },
    2: { shorts: [100, 97, 92, 86, 80, 75, 70, 66], price: [100, 100.8, 102, 103.8, 106.2, 108.9, 111.9, 115.2], pn: "加速上漲", sn: "快速回補" },
    3: { shorts: [100, 92, 82, 71, 60, 50, 42, 36], price: [100, 102.6, 105.4, 107.6, 108.9, 109.3, 108.8, 107.9], pn: "漲不動、開始回落", sn: "回補到見底" },
  };
  HB.defineWidget("squeeze", {
    title: "軋空三階段（示意）",
    init: function (body, cfg) {
      var stage = [1, 2, 3].indexOf(Math.round(finite(cfg.stage, 1))) >= 0 ? Math.round(finite(cfg.stage, 1)) : 1;
      var seg = W.seg({
        label: "階段",
        options: [[1, "1 潛在燃料"], [2, "2 軋空進行中"], [3, "3 燃料耗盡"]],
        value: stage,
        onChange: function (v) {
          stage = v;
          update();
        },
      });
      body.appendChild(h("div", { class: "w-controls" }, [seg.el]));
      var ro = W.readout([
        { key: "sc", k: "空單部位變化（8 週）" },
        { key: "pc", k: "價格變化（8 週）" },
        { key: "fuel", k: "燃料剩餘" },
      ]);
      body.appendChild(ro.el);
      var meter = h("span", { style: "display:block;height:6px;border-radius:3px;background:var(--rule-2);overflow:hidden;margin-top:4px" });
      var fill = h("span", { style: "display:block;height:100%;border-radius:3px;background:var(--foil);transition:width .35s var(--ease)" });
      meter.appendChild(fill);
      var tiles = ro.el.querySelectorAll(".w-stat");
      if (tiles[2]) tiles[2].appendChild(meter);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 480 ? 272 : 284;
      }, draw);
      note(body, "圖中數字為示意。GCFIE 的規則：不能只寫「空單很多，所以會軋空」，必須分清楚現在是哪一個階段。");

      var TXT = {
        1: { tone: "warn", t: "<b>Stage 1｜Potential Fuel：空單很多但尚未回補，偏多但不是即時訊號。</b>空單越堆越高、價格原地踏步：這些空單未來可能被迫買回（燃料），但什麼時候點火沒人知道。GCFIE 禁止只因「淨空很多」就寫「可能軋空」。" },
        2: { tone: "good", t: "<b>Stage 2｜Active Short Squeeze：空單開始快速回補，而且價格加速上漲，多頭仍強。</b>空方被迫買回，買盤推高價格，價格上漲又逼更多空單回補，形成循環。" },
        3: {
          tone: "alert",
          t: "<b>Stage 3｜Fuel Exhaustion Warning：空單快速回補，但價格開始漲不動。</b>這是黃金版最重要的末端風險訊號之一：推升價格的燃料快用完了，買盤卻接不上。GCFIE 的例子：ES 一週回補約 50,000 口空單，但 S&P／Nasdaq 不再加速創高，意義遠高於「淨空仍然很多」。",
        },
      };

      function update() {
        var d = SQZ[stage];
        var sc = d.shorts[7] / d.shorts[0] - 1,
          pc = d.price[7] / d.price[0] - 1;
        var peak = Math.max.apply(null, d.shorts);
        var fuel = d.shorts[7] / peak;
        ro.update({
          sc: { v: fmt.pct(sc, 0, true), s: "空單" + d.sn },
          pc: { v: fmt.pct(pc, 1, true), s: "價格" + d.pn, tone: pc > 0 ? "up" : pc < 0 ? "down" : "" },
          fuel: { v: fmt.pct(fuel, 0), s: fuel > 0.8 ? "燃料還很多" : fuel > 0.5 ? "燃料正在被使用" : "所剩不多" },
        });
        fill.style.width = (fuel * 100).toFixed(1) + "%";
        vd.set(TXT[stage].tone, TXT[stage].t);
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var narrow = w < 480;
        var d = SQZ[stage];
        var m = { l: 34, r: 10 };
        var t1 = 22,
          pH = narrow ? 92 : 98,
          gapT = 34,
          bH = hh - t1 - pH - gapT - 26;
        var pTop = t1,
          pBot = t1 + pH,
          bTop = pBot + gapT,
          bBot = bTop + bH;
        var band = (w - m.l - m.r) / 8;
        var cxw = function (i) {
          return m.l + band * (i + 0.5);
        };
        var yp = W.scale(96, 118, pBot, pTop);
        var yb = W.scale(0, 120, bBot, bTop);
        svg.setAttribute("aria-label", "軋空第 " + stage + " 階段示意：上圖價格、下圖空單部位，皆以第 1 週為 100");
        if (stage === 3) {
          rect(svg, m.l + band * 5, pTop - 4, band * 3, pH + 4, { fill: "var(--sig-orange)", opacity: 0.1 });
          rect(svg, m.l + band * 5, bTop - 4, band * 3, bH + 4, { fill: "var(--sig-orange)", opacity: 0.1 });
        }
        /* titles */
        txt(svg, 0, 13, "價格（第 1 週＝100）", { size: 12, weight: 700, fill: "var(--ink)" });
        txt(svg, w - m.r, 13, d.pn, { anchor: "end", size: 12, fill: "var(--ink-2)" });
        txt(svg, 0, bTop - 12, "空單部位（第 1 週＝100）", { size: 12, weight: 700, fill: "var(--ink)" });
        txt(svg, w - m.r, bTop - 12, "空單" + d.sn, { anchor: "end", size: 12, fill: "var(--ink-2)" });
        W.gridY(svg, yp, [100, 105, 110, 115], m.l, w - m.r);
        W.gridY(svg, yb, [0, 50, 100], m.l, w - m.r);
        /* price line */
        var pp = d.price.map(function (v, i) {
          return [cxw(i), yp(v)];
        });
        svg.appendChild(s("path", { d: W.linePath(pp), fill: "none", stroke: "var(--ink)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
        pp.forEach(function (p, i) {
          if (i === 7) dot(svg, p[0], p[1], "var(--ink)", 4.5);
          else svg.appendChild(s("circle", { cx: r1(p[0]), cy: r1(p[1]), r: 2.5, fill: "var(--ink)" }));
        });
        /* short-position bars */
        var bw = Math.min(28, band * 0.58);
        d.shorts.forEach(function (v, i) {
          rect(svg, cxw(i) - bw / 2, yb(v), bw, yb(0) - yb(v), { fill: "var(--cat-2)", opacity: 0.85, rx: 1.5 });
          if (!narrow || i === 0 || i === 7) txt(svg, cxw(i), yb(v) - 5, fmt.num(v, 0), { anchor: "middle", mono: true });
        });
        ln(svg, m.l, yb(0), w - m.r, yb(0), { stroke: "var(--ink-3)", width: 1, cap: "butt" });
        for (var i = 0; i < 8; i++) txt(svg, cxw(i), bBot + 17, narrow ? String(i + 1) : "第" + (i + 1) + "週", { anchor: "middle", mono: true });
        if (narrow) txt(svg, m.l - 6, bBot + 17, "週", { anchor: "end", size: 11, fill: "var(--ink-3)" });
      }
      update();
    },
  });

  /* ======================================================================
     scenario — 情境機率 × 報酬 → 期望值（瀑布圖）
     ====================================================================== */
  HB.defineWidget("scenario", {
    title: "情境期望值：機率 × 報酬",
    init: function (body, cfg) {
      var src = HB.plan && HB.plan.scenarios ? HB.plan.scenarios : null;
      var base = src
        ? src.map(function (sc) {
            return { name: sc.name, p: sc.p, r: (sc.lo + sc.hi) / 2, trigger: sc.trigger, idx: sc.idx };
          })
        : [
            { name: "樂觀", p: 30, r: 25 },
            { name: "基準", p: 50, r: 10 },
            { name: "悲觀", p: 20, r: -13.5 },
          ];
      var capIn = W.number({ label: "本金", suffix: "元", value: Math.max(1, finite(cfg.capital, (HB.plan && HB.plan.capital) || 1000000)), step: 10000, min: 1, onInput: update });
      var resetBtn = h("button", { type: "button", class: "w-btn ghost", text: "回到計畫的數字" });
      resetBtn.addEventListener("click", function () {
        rows.forEach(function (r, i) {
          r.p.set(base[i].p);
          r.r.set(base[i].r);
        });
        update();
      });
      body.appendChild(h("div", { class: "w-controls" }, [capIn.el, h("div", { class: "w-field", style: "align-content:end" }, [resetBtn])]));

      var list = h("div", { style: "display:grid;gap:.6rem" });
      var rows = base.map(function (sc) {
        var pS = W.slider({
          label: "機率（主觀）",
          min: 0,
          max: 100,
          step: 1,
          value: sc.p,
          fmt: function (v) {
            return fmt.num(v, 0) + "%";
          },
          onInput: update,
        });
        var rN = W.number({ label: "情境報酬", suffix: "%", value: sc.r, step: 0.5, min: -100, onInput: update });
        var norm = h("span", { class: "mono", style: "font-size:var(--fs-2xs);color:var(--ink-3)" });
        var head = h("div", { style: "display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap" }, [h("b", { text: sc.name + "情境" + (sc.idx ? "　加權指數 " + sc.idx : "") }), norm]);
        var grid = h("div", { style: "display:grid;grid-template-columns:minmax(0,1fr) minmax(0,8rem);gap:.4rem 1rem;align-items:end" }, [pS.el, rN.el]);
        var kids = [head, grid];
        if (sc.trigger) kids.push(h("p", { class: "widget-note", text: "觸發條件：" + sc.trigger }));
        list.appendChild(h("div", { style: "border:1px solid var(--rule-2);background:var(--paper);padding:.65rem .8rem;display:grid;gap:.45rem" }, kids));
        return { name: sc.name, p: pS, r: rN, norm: norm };
      });
      body.appendChild(list);

      var ro = W.readout([
        { key: "er", k: "期望報酬" },
        { key: "ea", k: "期望資產" },
        { key: "bw", k: "最好／最壞情境資產" },
        { key: "lp", k: "賠錢機率" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 480 ? 216 : 206;
      }, draw);
      note(body, "預設值取自計畫的「持有期情境（主觀估計，非預測）」：機率約 3 成／5 成／2 成，報酬取區間中點（+20%～+30%、+5%～+15%、停損後 −12%～−15%）。");

      function calc() {
        var raw = rows.map(function (r) {
          return clamp(r.p.get(), 0, 100);
        });
        var ret = rows.map(function (r) {
          return clamp(r.r.get(), -100, 1000);
        });
        var sum = raw.reduce(function (a, b) {
          return a + b;
        }, 0);
        var pn = raw.map(function (p) {
          return sum > 0 ? p / sum : 1 / raw.length;
        });
        var contrib = pn.map(function (p, i) {
          return p * ret[i];
        });
        var E = contrib.reduce(function (a, b) {
          return a + b;
        }, 0);
        var lossP = pn.reduce(function (a, p, i) {
          return a + (ret[i] < 0 ? p : 0);
        }, 0);
        return { raw: raw, ret: ret, sum: sum, pn: pn, contrib: contrib, E: E, lossP: lossP, cap: Math.max(1, capIn.get()) };
      }

      function update() {
        var c = calc();
        rows.forEach(function (r, i) {
          r.norm.textContent = Math.abs(c.sum - 100) < 1e-9 ? "權重 " + fmt.num(c.pn[i] * 100, 0) + "%" : "標準化後 " + fmt.num(c.pn[i] * 100, 1) + "%";
        });
        var best = Math.max.apply(null, c.ret),
          worst = Math.min.apply(null, c.ret);
        var bi = c.ret.indexOf(best),
          wi = c.ret.indexOf(worst);
        ro.update({
          er: { v: fmt.pct(c.E / 100, 1, true), s: "Σ 機率 × 報酬", tone: c.E > 0 ? "up" : c.E < 0 ? "down" : "" },
          ea: { v: wanT(c.cap * (1 + c.E / 100)) + "元", s: "本金 " + wanT(c.cap) + "元" },
          bw: { v: wanT(c.cap * (1 + best / 100)) + "／" + wanT(c.cap * (1 + worst / 100)), s: rows[bi].name + "／" + rows[wi].name + "情境" },
          lp: { v: fmt.pct(c.lossP, c.lossP * 100 % 1 ? 1 : 0), s: "報酬為負的情境機率加總" },
        });
        var t = "";
        if (c.sum <= 0) t += "<b>三個機率都是 0。</b>計算時暫時當成各占三分之一。<br>";
        else if (Math.abs(c.sum - 100) > 1e-9)
          t +=
            "<b>機率加起來是 " + fmt.num(c.sum, 0) + "%，不是 100%。</b>計算時已按比例換算成 " +
            c.pn
              .map(function (p) {
                return fmt.num(p * 100, 1) + "%";
              })
              .join("／") +
            "。<br>";
        t += "<b>加權期望報酬 " + fmt.pct(c.E / 100, 1, true) + "：" + wanT(c.cap) + "元期望變成約 " + wanT(c.cap * (1 + c.E / 100)) + "元。</b>";
        if (Math.abs(c.E - 10) <= 0.5 && Math.abs(c.cap - 1e6) < 1) t += "和計畫寫的「加權期望報酬約 +10%（約 110 萬）」一致。";
        t += "但期望值不是你會拿到的結果：最後只會發生其中一個情境（" + c.ret.map(function (r) { return fmt.pct(r / 100, 1, true); }).join("、") + "）。這些機率是主觀估計，改改看悲觀情境的機率，期望值會怎麼變。";
        vd.set(c.E < 0 ? "bad" : c.lossP >= 0.4 ? "alert" : c.E > 0 ? "good" : "warn", t);
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var narrow = w < 480;
        var c = calc();
        var labW = narrow ? 86 : 124;
        var m = { l: labW, r: 14, t: 24, b: 8 };
        var n = rows.length + 1;
        var rowH = (hh - m.t - m.b) / n;
        var cum = [0];
        c.contrib.forEach(function (v) {
          cum.push(cum[cum.length - 1] + v);
        });
        var lo = Math.min(0, Math.min.apply(null, cum)),
          hi = Math.max(0, Math.max.apply(null, cum));
        var span = hi - lo || 1;
        var x = W.scale(lo - span * 0.22, hi + span * 0.22, m.l, w - m.r);
        svg.setAttribute("aria-label", "各情境對期望報酬的貢獻（瀑布圖），合計 " + fmt.pct(c.E / 100, 1, true));
        txt(svg, 0, 13, "每個情境的貢獻（機率 × 報酬，百分點）", { size: 12, fill: "var(--ink-2)" });
        ln(svg, x(0), m.t - 2, x(0), hh - m.b, { stroke: "var(--ink-3)", width: 1, cap: "butt" });
        var bh = Math.min(20, rowH * 0.5);
        for (var i = 0; i < n; i++) {
          var cy = m.t + rowH * i + rowH / 2;
          var total = i === n - 1;
          var a = total ? 0 : cum[i],
            b = total ? c.E : cum[i + 1];
          var v = total ? c.E : c.contrib[i];
          if (total) ln(svg, 0, m.t + rowH * i, w - m.r, m.t + rowH * i, { stroke: "var(--rule)", width: 1, cap: "butt" });
          txt(svg, 0, cy - 2, total ? "期望報酬" : rows[i].name, { size: 13, weight: 700, fill: "var(--ink)" });
          txt(svg, 0, cy + 13, total ? "三項加總" : fmt.num(c.pn[i] * 100, c.pn[i] * 100 % 1 ? 1 : 0) + "% × " + fmt.pct(c.ret[i] / 100, 1, true), { mono: true });
          var x0 = x(Math.min(a, b)),
            x1 = x(Math.max(a, b));
          rect(svg, x0, cy - bh / 2, Math.max(1.5, x1 - x0), bh, { fill: total ? "var(--ink)" : v >= 0 ? "var(--up)" : "var(--down)", opacity: total ? 1 : 0.85, rx: 1.5 });
          var lab = total ? fmt.pct(v / 100, 1, true) : signed1(v);
          txt(svg, v >= 0 ? x1 + 6 : x0 - 6, cy + 4, lab, { anchor: v >= 0 ? "start" : "end", mono: true, size: 12, weight: total ? 700 : 500, fill: "var(--ink)" });
          if (!total && i < n - 2) ln(svg, x(b), cy + bh / 2, x(b), cy + rowH - bh / 2, { stroke: "var(--ink-3)", width: 1, dash: "2 3", cap: "butt" });
        }
        /* total marker through all rows */
        ln(svg, x(c.E), m.t - 2, x(c.E), hh - m.b, { stroke: "var(--ink)", width: 1, dash: "4 4", opacity: 0.5, cap: "butt" });
      }
      update();
    },
  });

  /* ======================================================================
     riskscore — GCFIE 風險分數（等權重教學版）
     ====================================================================== */
  var RISK = [
    ["Trend", "趨勢", "多頭趨勢穩健", "跌破趨勢"],
    ["Asset Manager", "部位", "長線資金續加多", "長線資金減多"],
    ["Leveraged Funds", "部位", "部位不擁擠", "極端擁擠"],
    ["Short Covering", "階段", "燃料還在", "燃料耗盡"],
    ["VIX", "水準與方向", "低且下降", "高且快升"],
    ["Term Structure", "期限結構", "正價差", "逆價差"],
    ["Put/Call", "情緒", "情緒中性", "投機或恐慌極端"],
    ["Rates", "利率", "長端穩定", "10Y／30Y 急升"],
    ["Price Response", "價格反應", "利多推得動", "利多漲不動"],
  ];
  var BANDS = [
    { lo: 0, hi: 3, en: "Low Risk", zh: "低", zhn: "低", tone: "good", sig: "g", c: "var(--sig-green)" },
    { lo: 3, hi: 5, en: "Normal", zh: "正常", zhn: "正常", tone: "warn", sig: "y", c: "var(--sig-yellow)" },
    { lo: 5, hi: 7, en: "Elevated", zh: "升高", zhn: "升高", tone: "alert", sig: "o", c: "var(--sig-orange)" },
    { lo: 7, hi: 8, en: "High", zh: "高", zhn: "高", tone: "alert", sig: "o", c: "var(--sig-orange)" },
    { lo: 8, hi: 9, en: "Late-Cycle / High Risk", zh: "末端", zhn: "末端", tone: "bad", sig: "r", c: "var(--sig-red)" },
    { lo: 9, hi: 10, en: "Systemic Stress", zh: "系統性", zhn: "系統", tone: "bad", sig: "r", c: "var(--sig-red)" },
  ];
  function bandOf(score) {
    for (var i = 0; i < BANDS.length; i++) if (score < BANDS[i].hi) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }
  HB.defineWidget("riskscore", {
    title: "GCFIE 風險分數（教學版）",
    init: function (body, cfg) {
      var init = String(cfg.values === undefined ? "6,5,6,7,6,5,7,6,7" : cfg.values)
        .split(/[,\s]+/)
        .map(function (v) {
          return clamp(finite(v, 5), 0, 10);
        });
      while (init.length < RISK.length) init.push(5);
      var fields = RISK.map(function (r, i) {
        var sl = W.slider({
          label: r[0] + " " + r[1],
          min: 0,
          max: 10,
          step: 0.5,
          value: Math.round(init[i] * 2) / 2,
          fmt: function (v) {
            return n1(v);
          },
          onInput: update,
        });
        sl.el.style.padding = "6px 8px";
        sl.el.style.borderRadius = "3px";
        sl.el.style.transition = "background .2s";
        sl.el.appendChild(
          h("span", { style: "display:flex;justify-content:space-between;gap:8px;font-size:var(--fs-2xs);color:var(--ink-3);line-height:1.3" }, [h("span", { text: "0 " + r[2] }), h("span", { text: r[3] + " 10", style: "text-align:right" })])
        );
        var lab = sl.el.querySelector("label span");
        return { sl: sl, lab: lab, r: r };
      });
      body.appendChild(
        h(
          "div",
          { class: "w-controls", style: "gap:.35rem .8rem" },
          fields.map(function (f) {
            return f.sl.el;
          })
        )
      );
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 480 ? 196 : 188;
      }, draw);
      note(body, "GCFIE 沒有公布權重，這裡用等權重示範：重點是分數必須由多個變數綜合，不能只看一個。0 分＝這個面向看不到風險，10 分＝風險最高。");

      function calc() {
        var v = fields.map(function (f) {
          return f.sl.get();
        });
        var avg =
          v.reduce(function (a, b) {
            return a + b;
          }, 0) / v.length;
        var sc = W.round(avg, 1);
        var order = v
          .map(function (val, i) {
            return { i: i, v: val };
          })
          .sort(function (a, b) {
            return b.v - a.v || a.i - b.i;
          });
        var top = order
          .slice(0, 3)
          .filter(function (o) {
            return o.v > 0;
          })
          .map(function (o) {
            return o.i;
          });
        return { v: v, avg: avg, score: sc, band: bandOf(sc), top: top };
      }

      function update() {
        var c = calc();
        fields.forEach(function (f, i) {
          var on = c.top.indexOf(i) >= 0;
          f.sl.el.style.background = on ? "var(--foil-soft)" : "transparent";
          if (f.lab) f.lab.style.fontWeight = on ? "700" : "";
          if (f.lab) f.lab.style.color = on ? "var(--ink)" : "";
        });
        var b = c.band;
        var topTxt = c.top
          .map(function (i) {
            return RISK[i][0] + " " + RISK[i][1] + "（" + n1(c.v[i]) + "）";
          })
          .join("、");
        var hiCount = c.v.filter(function (v) {
          return v >= 8;
        }).length;
        var desc = {
          "Low Risk": "各面向都看不到明顯壓力，趨勢、部位與波動率大致一致。",
          Normal: "有零星警訊，但還沒有形成結構性的壓力。",
          Elevated: "多個面向同時亮起警訊：趨勢可能還在，但容錯率變低。",
          High: "風險已經擴散到多數面向，價格對利空會更敏感。",
          "Late-Cycle / High Risk": "接近 GCFIE 的末端結構：空單回補、情緒過熱、波動率與利率同步施壓。",
          "Systemic Stress": "全面壓力：常見於 VIX 逆價差、流動性緊縮、跨資產同步去槓桿。",
        }[b.en];
        var t = "<b>美股衍生品風險 " + fmt.num(c.score, 1) + " / 10：" + b.en + "（" + b.zh + "）。</b>" + desc;
        if (topTxt) t += "<br>分數最高的三項：" + topTxt + "。";
        if (hiCount && c.score < 7) t += "<br>有 " + hiCount + " 項在 8 分以上，但平均只有 " + fmt.num(c.score, 1) + "：單一變數很高不等於整體高風險，這正是 GCFIE 要求綜合判斷的原因。";
        vd.set(b.tone, t, b.sig);
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var narrow = w < 480;
        var c = calc();
        var m = { l: 6, r: 6 };
        var x = W.scale(0, 10, m.l, w - m.r);
        var gT = narrow ? 112 : 104,
          gH = 24;
        svg.setAttribute("aria-label", "GCFIE 風險分數 " + fmt.num(c.score, 1) + " / 10，等級 " + c.band.en);
        /* big score */
        var big = fmt.num(c.score, 1);
        txt(svg, 0, 44, big, { size: 44, weight: 600, family: "var(--font-numeral)", fill: "var(--ink)", css: "letter-spacing:-.01em" });
        var bw = estW(big, 44) * 0.92;
        txt(svg, bw + 6, 44, "/ 10", { size: 16, fill: "var(--ink-3)", family: "var(--font-mono)" });
        var bx = bw + 52;
        svg.appendChild(s("circle", { cx: bx + 6, cy: 23, r: 6, fill: c.band.c }));
        txt(svg, bx + 18, 28, c.band.en, { size: 14, weight: 700, fill: "var(--ink)" });
        txt(svg, bx + 18, 46, "美股衍生品風險・" + c.band.zh, { size: 12, fill: "var(--ink-2)" });
        /* gauge */
        BANDS.forEach(function (b) {
          var on = b === c.band;
          rect(svg, x(b.lo), gT, x(b.hi) - x(b.lo), gH, { fill: b.c, opacity: on ? 0.55 : 0.2 });
          var lbl = narrow ? b.zhn : b.zh;
          if (estW(lbl, 12) < x(b.hi) - x(b.lo) - 4) txt(svg, (x(b.lo) + x(b.hi)) / 2, gT + 16, lbl, { anchor: "middle", size: 12, weight: on ? 700 : 400, fill: on ? "var(--ink)" : "var(--ink-2)" });
        });
        BANDS.slice(1).forEach(function (b) {
          ln(svg, x(b.lo), gT, x(b.lo), gT + gH, { stroke: "var(--plate)", width: 2, cap: "butt" });
        });
        [0, 3, 5, 7, 8, 9, 10].forEach(function (v) {
          txt(svg, clamp(x(v), m.l + 4, w - m.r - 6), gT + gH + 30, String(v), { anchor: v === 0 ? "start" : v === 10 ? "end" : "middle", mono: true });
        });
        /* factor dots above the gauge, stacked on ties */
        var stack = {};
        c.v.forEach(function (v, i) {
          var key = String(v);
          var k = stack[key] || 0;
          stack[key] = k + 1;
          var on = c.top.indexOf(i) >= 0;
          var col = Math.floor(k / 4);
          var row = k % 4;
          var px = clamp(x(v) + (col % 2 ? 1 : -1) * Math.ceil(col / 2) * 10, m.l + 5, w - m.r - 5);
          svg.appendChild(s("circle", { cx: r1(px), cy: r1(gT - 9 - row * 10), r: 4, fill: on ? "var(--ink)" : "var(--plate)", stroke: on ? "var(--plate)" : "var(--ink-3)", "stroke-width": on ? 1.5 : 1.5 }));
        });
        /* average marker */
        var ax = x(c.score);
        ln(svg, ax, gT - 3, ax, gT + gH + 3, { stroke: "var(--ink)", width: 2.5, cap: "butt" });
        svg.appendChild(s("path", { d: "M" + r1(ax) + " " + (gT + gH + 4) + "l-6 9h12z", fill: "var(--ink)" }));
        /* legend */
        var ly = hh - 6;
        svg.appendChild(s("circle", { cx: 5, cy: ly - 4, r: 4, fill: "var(--plate)", stroke: "var(--ink-3)", "stroke-width": 1.5 }));
        txt(svg, 14, ly, "各變數分數", { size: 11, fill: "var(--ink-3)" });
        svg.appendChild(s("circle", { cx: 90, cy: ly - 4, r: 4, fill: "var(--ink)" }));
        txt(svg, 99, ly, "最高三項", { size: 11, fill: "var(--ink-3)" });
        svg.appendChild(s("path", { d: "M170 " + (ly + 1) + "l-5 -8h10z", fill: "var(--ink)" }));
        txt(svg, 179, ly, "等權平均", { size: 11, fill: "var(--ink-3)" });
      }
      update();
    },
  });

  /* ======================================================================
     terminal — GCFIE 第十二節：末端結構五條件（依 2026/08/18 案例順序畫成鏈）
     ====================================================================== */
  var TERM = [
    { n: 1, sym: "①", t: "Call 投機情緒極端", ex: "例：Equity Put/Call 降到約 0.5 附近，個股追 Call、FOMO 升高。", short: "Call 投機極端", en: "FOMO" },
    { n: 2, sym: "②", t: "ES／NQ 空單開始快速回補", ex: "例：ES 一週回補約 50,000 口空單（Short Covering）。", short: "空單快速回補", en: "Short Covering" },
    { n: 3, sym: "③", t: "VIX／VVIX 反升", ex: "股票還沒跌，波動率卻先上升（Volatility Divergence）。", short: "VIX 反升", en: "Vol Divergence" },
    { n: 4, sym: "④", t: "10Y／30Y 殖利率上升", ex: "長端利率走高，壓縮高估值股票的折現價值。", short: "長端利率上升", en: "Rate Pressure" },
    { n: 5, sym: "⑤", t: "SPX／Nasdaq 漲不動甚至下跌", ex: "利多與回補燃料都在，價格卻推不上去。", short: "指數漲不動", en: "Price Rejection" },
  ];
  var CHAIN = [2, 1, 3, 4, 5]; /* 08/18 case: Short Covering → FOMO → Vol Divergence → Rate Pressure → Price Rejection */
  HB.defineWidget("terminal", {
    title: "GCFIE 末端結構：五個條件",
    init: function (body, cfg) {
      var pre = String(cfg.checked === undefined ? "2,1" : cfg.checked)
        .split(/[,\s]+/)
        .map(function (v) {
          return parseInt(v, 10);
        });
      var boxes = {};
      var listEl = h("div", { class: "w-controls", style: "grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:.5rem" });
      TERM.forEach(function (d) {
        var input = h("input", { type: "checkbox", style: "width:1.05rem;height:1.05rem;margin:.2rem 0 0;accent-color:var(--engrave)" });
        input.checked = pre.indexOf(d.n) >= 0;
        input.addEventListener("change", update);
        var lab = h("label", { style: "display:grid;grid-template-columns:1.3rem minmax(0,1fr);gap:.45rem;align-items:start;padding:.55rem .7rem;border:1px solid var(--rule-2);background:var(--paper);cursor:pointer;line-height:1.5;transition:border-color .2s,background .2s" }, [
          input,
          h("span", {}, [h("b", { text: d.sym + " " + d.t }), h("br"), h("span", { style: "color:var(--ink-3);font-size:var(--fs-2xs)", text: d.ex })]),
        ]);
        listEl.appendChild(lab);
        boxes[d.n] = { input: input, lab: lab };
      });
      body.appendChild(listEl);
      var allBtn = h("button", { type: "button", class: "w-btn ghost", text: "套用 08/18 案例（五項都成立）" });
      var clrBtn = h("button", { type: "button", class: "w-btn ghost", text: "全部清除" });
      allBtn.addEventListener("click", function () {
        TERM.forEach(function (d) {
          boxes[d.n].input.checked = true;
        });
        update();
      });
      clrBtn.addEventListener("click", function () {
        TERM.forEach(function (d) {
          boxes[d.n].input.checked = false;
        });
        update();
      });
      body.appendChild(h("div", { class: "w-row" }, [allBtn, clrBtn]));
      var ro = W.readout([
        { key: "n", k: "成立的條件" },
        { key: "st", k: "GCFIE 狀態" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 520 ? 5 * 58 + 12 : 176;
      }, draw);
      note(body, "鏈條順序取自 GCFIE 2026/08/18 驗證案例的捕捉路徑：Positioning → Short Covering → FOMO → Volatility Divergence → Rate Pressure → Price Rejection → Price Confirmation。點圖上的節點也可以勾選。");

      function on(n) {
        return boxes[n].input.checked;
      }
      function count() {
        return TERM.filter(function (d) {
          return on(d.n);
        }).length;
      }
      function state(n) {
        if (n >= 3) return { tone: "bad", sig: "r", name: n === 5 ? "全部成立" : "大部分成立", en: "Late-Cycle / Terminal Structure Alert", c: "var(--sig-red)" };
        if (n === 2) return { tone: "warn", sig: "y", name: "留意", en: "兩個條件同時出現", c: "var(--sig-yellow)" };
        if (n === 1) return { tone: "good", sig: "g", name: "未形成", en: "只有單一條件", c: "var(--engrave)" };
        return { tone: "", sig: "w", name: "未形成", en: "沒有條件成立", c: "var(--engrave)" };
      }

      function update() {
        var n = count();
        var stt = state(n);
        TERM.forEach(function (d) {
          var b = boxes[d.n];
          b.lab.style.borderColor = on(d.n) ? "var(--ink)" : "var(--rule-2)";
          b.lab.style.background = on(d.n) ? "var(--plate)" : "var(--paper)";
        });
        ro.update({
          n: { v: n + " / 5", s: n >= 3 ? "超過一半" : n === 2 ? "接近一半" : "少數" },
          st: { v: stt.name, s: stt.en },
        });
        var caveat = "GCFIE 特別強調：這不等於「市場要崩盤」，正確意思是多頭趨勢進入低容錯率、高脆弱性階段。";
        var t;
        if (n >= 3)
          t = "<b>" + (n === 5 ? "五項全部成立" : "五項中有 " + n + " 項成立（大部分成立）") + "：GCFIE Late-Cycle / Terminal Structure Alert。</b>" + caveat + "實務上的意思是：同樣的壞消息，現在可能造成更大的下跌，部位與停損要更保守。";
        else if (n === 2) t = "<b>留意：兩個條件同時出現。</b>單看任何一個都很常見，但它們開始一起出現時，要盯緊剩下的條件會不會跟上。" + caveat;
        else if (n === 1) t = "<b>未形成：只有一個條件。</b>單一訊號不足以判斷頂部，GCFIE 也禁止「用單一 Put/Call 判斷市場頂部」。" + caveat;
        else t = "<b>未形成：五個條件都沒有成立。</b>勾選上面的條件，看鏈條怎麼一節一節亮起來。" + caveat;
        vd.set(stt.tone, t, stt.sig);
        ch.redraw();
      }

      function toggle(n) {
        boxes[n].input.checked = !boxes[n].input.checked;
        update();
      }

      function draw(svg, w, hh) {
        var vert = w < 520;
        var n = count();
        var stt = state(n);
        var lit = n >= 2 ? stt.c : "var(--engrave)";
        svg.setAttribute("aria-label", "末端結構鏈條：五個條件中有 " + n + " 個成立");
        var R = 19;
        var pos = CHAIN.map(function (num, i) {
          if (vert) return { x: 26, y: 30 + i * 58 };
          var gx = (w - 2 * 64) / 4;
          return { x: 64 + i * gx, y: 44 };
        });
        var mk = arrow(svg, "var(--ink-3)", 8);
        var mkOn = arrow(svg, lit, 9);
        for (var i = 0; i < CHAIN.length - 1; i++) {
          var a = pos[i],
            b = pos[i + 1];
          var both = on(CHAIN[i]) && on(CHAIN[i + 1]);
          if (vert) ln(svg, a.x, a.y + R + 3, b.x, b.y - R - 4, { stroke: both ? lit : "var(--rule)", width: both ? 2.5 : 1.5, dash: both ? null : "4 4", end: both ? mkOn : mk, cap: "butt" });
          else ln(svg, a.x + R + 4, a.y, b.x - R - 5, b.y, { stroke: both ? lit : "var(--rule)", width: both ? 2.5 : 1.5, dash: both ? null : "4 4", end: both ? mkOn : mk, cap: "butt" });
        }
        CHAIN.forEach(function (num, i) {
          var d = TERM[num - 1];
          var p = pos[i];
          var isOn = on(num);
          var g = s("g", { tabindex: 0, role: "button", "aria-pressed": String(isOn), "aria-label": d.sym + " " + d.t + (isOn ? "，已成立" : "，未成立") });
          g.style.cursor = "pointer";
          g.appendChild(s("circle", { cx: r1(p.x), cy: r1(p.y), r: R, fill: isOn ? lit : "var(--plate)", stroke: isOn ? lit : "var(--rule)", "stroke-width": 2 }));
          if (isOn) g.appendChild(s("circle", { cx: r1(p.x), cy: r1(p.y), r: R + 5, fill: "none", stroke: lit, "stroke-width": 1, opacity: 0.4 }));
          txt(g, p.x, p.y + 6, d.sym, { anchor: "middle", size: 17, weight: 700, fill: isOn ? "var(--plate)" : "var(--ink-3)" });
          if (vert) {
            txt(g, p.x + R + 16, p.y - 2, d.short, { size: 14, weight: 700, fill: isOn ? "var(--ink)" : "var(--ink-2)" });
            txt(g, p.x + R + 16, p.y + 15, d.en, { mono: true });
          } else {
            txt(g, p.x, p.y + R + 24, d.short, { anchor: "middle", size: 13, weight: 700, fill: isOn ? "var(--ink)" : "var(--ink-2)" });
            txt(g, p.x, p.y + R + 41, d.en, { anchor: "middle", mono: true });
          }
          g.appendChild(s("rect", { x: r1(p.x - R - 6), y: r1(p.y - R - 6), width: vert ? w - 8 : 2 * R + 12, height: 2 * R + 12, fill: "transparent" }));
          g.addEventListener("click", function () {
            toggle(num);
          });
          g.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle(num);
            }
          });
          svg.appendChild(g);
        });
        if (!vert) {
          txt(svg, pos[0].x - R, 12, "08/18 案例的出現順序 →", { size: 11, fill: "var(--ink-3)" });
          txt(svg, w - 4, 12, n + " / 5 成立", { anchor: "end", size: 12, weight: 700, fill: "var(--ink)" });
        } else {
          txt(svg, w - 4, 14, n + " / 5 成立", { anchor: "end", size: 12, weight: 700, fill: "var(--ink)" });
        }
      }
      update();
    },
  });

  /* ======================================================================
     validation — GCFIE 第十九～二十節：前一日預警 → 當日價格驗證
     ====================================================================== */
  var LV = {
    white: { sig: "w", t: "未確認", rank: 0 },
    yellow: { sig: "y", t: "部分確認", rank: 1 },
    orange: { sig: "o", t: "高度確認", rank: 2 },
    red: { sig: "r", t: "正式確認", rank: 3 },
    lost: { sig: "r", t: "失守確認", rank: 3 },
    fail: { sig: "w", t: "訊號失效", rank: -1 },
  };
  var ALERTS = [
    { name: "VIX 開始反升", why: "股市還沒跌，波動率先上升", q: "今天的 VIX", opts: [["up", "持續上升", "red"], ["flat", "持平", "yellow"], ["down", "回落", "white"]] },
    { name: "10Y 上升", why: "長端利率壓力升高", q: "今天的 10 年期殖利率", opts: [["high", "再創高", "red"], ["up", "續升、未創高", "orange"], ["flat", "持平", "yellow"], ["down", "回落", "white"]] },
    { name: "半導體仍強", why: "AI／半導體仍是盤面主軸", q: "今天的費城半導體（SOX）", opts: [["strong", "續強", "red"], ["mixed", "震盪", "yellow"], ["weak", "轉弱", "fail"]] },
    { name: "45,800 支撐", why: "台股預先設定的價格驗證線", q: "今天的加權指數", opts: [["close", "收盤跌破", "lost"], ["intra", "盤中跌破、收盤守住", "yellow"], ["hold", "守住", "white"]] },
  ];
  HB.defineWidget("validation", {
    title: "前一日預警 → 當日價格驗證",
    init: function (body, cfg) {
      var pre = String(cfg.outcomes || "up,up,weak,intra").split(/[,\s]+/);
      var pick = ALERTS.map(function (a, i) {
        var ok = a.opts.some(function (o) {
          return o[0] === pre[i];
        });
        return ok ? pre[i] : a.opts[0][0];
      });
      var badges = [];
      var list = h("div", { style: "display:grid;gap:.5rem" });
      ALERTS.forEach(function (a, i) {
        var badge = h("span", { class: "sig w", style: "font-weight:700;font-size:var(--fs-xs)" });
        badges.push(badge);
        var sg = W.seg({
          label: "",
          options: a.opts.map(function (o) {
            return [o[0], o[1]];
          }),
          value: pick[i],
          onChange: function (v) {
            pick[i] = v;
            update();
          },
        });
        sg.el.setAttribute("aria-label", a.q);
        list.appendChild(
          h("div", { style: "border:1px solid var(--rule-2);background:var(--paper);padding:.6rem .75rem;display:grid;gap:.4rem" }, [
            h("div", { style: "display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap" }, [
              h("span", {}, [h("span", { class: "mono", style: "font-size:var(--fs-2xs);color:var(--ink-3);margin-right:.5em", text: "昨天的預警" }), h("b", { text: "「" + a.name + "」" })]),
              badge,
            ]),
            h("span", { style: "font-size:var(--fs-2xs);color:var(--ink-3)", text: a.why + "。" + a.q + "：" }),
            sg.el,
          ])
        );
      });
      body.appendChild(list);
      var ro = W.readout([
        { key: "hit", k: "命中率" },
        { key: "conf", k: "正式／高度確認" },
        { key: "part", k: "部分確認" },
        { key: "miss", k: "未確認／失效" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 560 ? 5 * 52 + 14 : 150;
      }, draw);
      note(body, "燈號代表「昨天的預警被今天的價格證實到什麼程度」，不是漲跌方向。四個例子取自 GCFIE 第十九節，隔日結果為示意。");

      function levels() {
        return ALERTS.map(function (a, i) {
          var o = a.opts.filter(function (x) {
            return x[0] === pick[i];
          })[0];
          return o[2];
        });
      }
      function tally() {
        var lv = levels();
        var c = { conf: 0, red: 0, orange: 0, part: 0, white: 0, fail: 0 };
        lv.forEach(function (l) {
          if (l === "red" || l === "lost") {
            c.conf++;
            c.red++;
          } else if (l === "orange") {
            c.conf++;
            c.orange++;
          } else if (l === "yellow") c.part++;
          else if (l === "fail") c.fail++;
          else c.white++;
        });
        c.total = lv.length;
        c.hit = c.conf / c.total;
        c.lv = lv;
        return c;
      }

      function update() {
        var c = tally();
        c.lv.forEach(function (l, i) {
          badges[i].className = "sig " + LV[l].sig;
          badges[i].textContent = LV[l].t;
          badges[i].style.textDecoration = l === "fail" ? "line-through" : "";
          badges[i].style.color = l === "fail" ? "var(--ink-3)" : "";
        });
        ro.update({
          hit: { v: fmt.pct(c.hit, 0), s: "（正式＋高度確認）÷ " + c.total },
          conf: { v: String(c.conf), s: "紅燈 " + c.red + "、橙燈 " + c.orange },
          part: { v: String(c.part), s: "黃燈" },
          miss: { v: c.white + "／" + c.fail, s: "白燈／訊號失效" },
        });
        var parts = [];
        if (c.red) parts.push("正式確認 " + c.red);
        if (c.orange) parts.push("高度確認 " + c.orange);
        if (c.part) parts.push("部分確認 " + c.part);
        if (c.white) parts.push("未確認 " + c.white);
        if (c.fail) parts.push("訊號失效 " + c.fail);
        var t = "<b>今天回頭驗證 " + c.total + " 個預警：" + parts.join("、") + "。命中率 " + fmt.pct(c.hit, 0) + "。</b>";
        if (c.fail) t += "「半導體仍強」被價格否定，這一項要進入 Model Adjustment：是資料讀錯，還是這個訊號的權重該調低？";
        else if (c.white) t += "未確認的預警不算錯，但也不能算對：要記下來，連續未確認就要檢討它的參考價值。";
        else t += "每一項預警都至少被價格部分證實。";
        t += "<br>這就是 <b>Forecast Accountability</b>：GCFIE 不允許只產生預測、不檢查結果，每一項重大預警隔天都要回答「昨天說的事情發生了嗎？」流程是 Signal → Forecast → Market Reaction → Validation → Model Adjustment。";
        vd.set(c.hit >= 0.75 ? "good" : c.hit >= 0.5 ? "warn" : "alert", t);
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var vert = w < 560;
        var c = tally();
        var adj = c.fail ? "檢討失效的訊號" : c.white ? "未確認的續觀察" : "模型維持不變";
        var steps = [
          { zh: "訊號", en: "Signal", sub: "昨天看到的資料" },
          { zh: "預測", en: "Forecast", sub: "寫下預警與驗證線" },
          { zh: "市場反應", en: "Market Reaction", sub: "今天價格怎麼走" },
          { zh: "驗證", en: "Validation", sub: "命中 " + c.conf + "／" + c.total, hot: true },
          { zh: "模型調整", en: "Model Adjustment", sub: adj, hot: c.fail > 0 },
        ];
        svg.setAttribute("aria-label", "Forecast Accountability 流程：訊號、預測、市場反應、驗證、模型調整，再回到下一次訊號");
        var mk = arrow(svg, "var(--ink-3)", 8);
        if (vert) {
          var bw = w - 46,
            bh = 40;
          steps.forEach(function (st, i) {
            var y0 = 8 + i * 52;
            rect(svg, 0, y0, bw, bh, { fill: st.hot ? "var(--engrave-wash)" : "var(--paper)", stroke: st.hot ? "var(--engrave)" : "var(--rule)", sw: st.hot ? 1.5 : 1, rx: 3 });
            txt(svg, 12, y0 + 17, st.zh, { size: 13, weight: 700, fill: "var(--ink)" });
            txt(svg, 12, y0 + 33, st.en, { mono: true });
            txt(svg, bw - 10, y0 + 25, st.sub, { anchor: "end", size: 12, fill: st.hot ? "var(--ink)" : "var(--ink-2)", weight: st.hot ? 700 : 400 });
            if (i < steps.length - 1) ln(svg, 24, y0 + bh + 1, 24, y0 + 51, { stroke: "var(--ink-3)", width: 1.5, end: mk, cap: "butt" });
          });
          var yb = 8 + 4 * 52 + bh / 2,
            yt = 8 + bh / 2;
          svg.appendChild(s("path", { d: "M" + bw + " " + yb + "H" + (w - 12) + "V" + yt + "H" + (bw + 2), fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5, "stroke-dasharray": "4 3", "marker-end": mk }));
          txt(svg, w - 4, (yb + yt) / 2, "隔天再來一次", { anchor: "middle", size: 11, fill: "var(--ink-3)", css: "writing-mode:vertical-rl;letter-spacing:.1em" });
        } else {
          var gap = 22,
            bw2 = (w - gap * 4) / 5,
            bh2 = 74,
            y1 = 8;
          steps.forEach(function (st, i) {
            var x0 = i * (bw2 + gap);
            rect(svg, x0, y1, bw2, bh2, { fill: st.hot ? "var(--engrave-wash)" : "var(--paper)", stroke: st.hot ? "var(--engrave)" : "var(--rule)", sw: st.hot ? 1.5 : 1, rx: 3 });
            txt(svg, x0 + bw2 / 2, y1 + 22, st.zh, { anchor: "middle", size: 14, weight: 700, fill: "var(--ink)" });
            txt(svg, x0 + bw2 / 2, y1 + 39, st.en, { anchor: "middle", mono: true, size: estW(st.en, 11, true) > bw2 - 8 ? 10 : 11 });
            txt(svg, x0 + bw2 / 2, y1 + 60, st.sub, { anchor: "middle", size: 12, fill: st.hot ? "var(--ink)" : "var(--ink-2)", weight: st.hot ? 700 : 400 });
            if (i < steps.length - 1) ln(svg, x0 + bw2 + 3, y1 + bh2 / 2, x0 + bw2 + gap - 3, y1 + bh2 / 2, { stroke: "var(--ink-3)", width: 1.5, end: mk, cap: "butt" });
          });
          var yb2 = y1 + bh2 + 2,
            lastX = 4 * (bw2 + gap) + bw2 / 2,
            firstX = bw2 / 2;
          svg.appendChild(s("path", { d: "M" + r1(lastX) + " " + yb2 + "V" + (yb2 + 26) + "H" + r1(firstX) + "V" + (yb2 + 5), fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5, "stroke-dasharray": "4 3", "marker-end": mk }));
          txt(svg, w / 2, yb2 + 22, "隔天再來一次：調整後的模型產生下一個訊號", { anchor: "middle", size: 12, fill: "var(--ink-3)", halo: true });
        }
      }
      update();
    },
  });

  /* ======================================================================
     timeline — 計畫的五個階段、目標持股、關鍵事件與「今天」
     ====================================================================== */
  var TL_EVENTS = [
    { d: "2026-10-28", short: "Fed", label: "聯準會會議", full: "聯準會利率決議（台灣時間 10/29 凌晨公布）。計畫寫：市場估 10/28 再升息機率約三成；若 10 月不升，12/9 升息被視為高機率。" },
    { d: "2026-10-29", approx: true, when: "10 月底", short: "CSP", label: "美系雲端大廠財報", full: "美系雲端大廠（CSP）財報：看第三季資本支出，確認 AI 需求是否延續。" },
    { d: "2026-11-03", short: "期中選舉", label: "美國期中選舉", full: "美國期中選舉。投信經理人預期選後震盪趨緩。" },
    { d: "2026-11-10", short: "10月營收", label: "10 月營收公布期限", full: "10 月營收公布期限（11/10 前）。加碼階段用營收與財報汰弱留強。" },
    { d: "2026-11-14", short: "Q3財報", label: "第三季財報期限", full: "第三季財報公布期限（11/14 前）。同樣用來汰弱留強。" },
    { d: "2026-11-20", approx: true, when: "11 月下旬", short: "輝達", label: "輝達財報", full: "輝達財報（11 月下旬）：看 Rubin 占比與第四季財測。" },
    { d: "2026-11-28", short: "九合一", label: "九合一選舉", full: "台灣九合一地方選舉。" },
    { d: "2026-12-09", short: "Fed", label: "聯準會會議", full: "聯準會利率決議（台灣時間 12/10 凌晨公布）。計畫的最後一筆加碼可以等這次結果。" },
    { d: "2027-01-07", approx: true, when: "1 月上旬", short: "CES", label: "CES 消費電子展", full: "CES（1 月上旬）。同一段時間還有年底投信作帳、元月行情。" },
    { d: "2027-01-15", approx: true, when: "1 月中", short: "台積法說", label: "台積電法說會", full: "台積電法說會（1 月中）：看 2027 年營收、資本支出與漲價。" },
    { d: "2027-01-29", approx: true, when: "1 月底至 2 月初", short: "CSP", label: "CSP 財報（資本支出指引）", full: "CSP 財報（1 月底至 2 月初）公布 2027 年資本支出指引，計畫稱為「封關前最重要的一關」。" },
    { d: "2027-02-06", short: "春節", label: "春節初一，台股休市", full: "春節初一（2/6）。台股休市約一週，美股照常交易；封關日以證交所公告為準。" },
    { d: "2027-02-24", approx: true, when: "2 月下旬", short: "輝達", label: "輝達財報", full: "輝達財報（2 月下旬）：出場前最後一個大事件，計畫在財報前後先賣一半。" },
    { d: "2027-03-05", end: "2027-03-10", short: "出清", label: "分批出清", full: "3/5 至 3/10 之間分批出清：趁強勢賣，不要等最後一天。" },
  ];
  var TL_OPS = {
    1: "核心與防守股先買一半到 2/3；成長股只買配置的一半；高彈性股等跌進買進區才買。",
    2: "條件二選一才加碼：大盤站回月線且外資停止連賣，或指數回測約 44,500–45,000 點時分批承接；用營收與財報汰弱留強。",
    3: "抱住部位：到目標 1 賣 1/3，剩下的部位把停損上移到成本價。",
    4: "封關前先賣已達目標或走勢最弱的股票，持股降到約 60%；封關日以證交所公告為準。",
    5: "連假期間美股平穩可回補部分；輝達財報前後先賣一半，3/5–3/10 之間分批出清。",
  };
  var TL_HOLD = { 1: [40, 50], 2: [80, 85], 3: [88, 88], 4: [60, 60], 5: [60, 0] };
  var TL_PHASES = [
    { id: 1, name: "建倉", from: "2026-10-19", to: "2026-11-04", hold: "40–50%" },
    { id: 2, name: "加碼", from: "2026-11-05", to: "2026-12-10", hold: "80–85%" },
    { id: 3, name: "抱住停利", from: "2026-12-10", to: "2027-01-31", hold: "約 88%" },
    { id: 4, name: "節前降碼", from: "2027-02-01", to: "2027-02-05", hold: "約 60%" },
    { id: 5, name: "出場", from: "2027-02-11", to: "2027-03-10", hold: "逐步降至 0%" },
  ];
  var CIRC = ["", "①", "②", "③", "④", "⑤"];
  var WD = "日一二三四五六";
  function dayNo(str) {
    var p = String(str).split("-");
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5);
  }
  function md(dn) {
    var d = new Date(dn * 864e5);
    return d.getUTCMonth() + 1 + "/" + d.getUTCDate();
  }
  function wd(dn) {
    return WD.charAt(new Date(dn * 864e5).getUTCDay());
  }

  HB.defineWidget("timeline", {
    title: "計畫時間軸：階段、持股與關鍵事件",
    init: function (body, cfg) {
      var phases = (HB.plan && HB.plan.phases && HB.plan.phases.length === 5 ? HB.plan.phases : TL_PHASES).map(function (p, i, arr) {
        var a = dayNo(p.from),
          b = dayNo(p.to) + 1;
        if (arr[i + 1]) b = Math.min(b, dayNo(arr[i + 1].from));
        return { id: p.id, name: p.name, hold: p.hold, a: a, b: b, from: dayNo(p.from), to: dayNo(p.to) };
      });
      var evs = TL_EVENTS.map(function (e) {
        return { e: e, dn: dayNo(e.d), end: e.end ? dayNo(e.end) : null };
      });
      var D0 = dayNo("2026-10-19"),
        D1 = dayNo("2027-03-12") + 1;
      var gap = { a: phases[3].b, b: phases[4].a };
      var today;
      if (cfg.today && /^\d{4}-\d{1,2}-\d{1,2}$/.test(String(cfg.today))) today = dayNo(cfg.today);
      else {
        var nd = new Date();
        today = Math.round(Date.UTC(nd.getFullYear(), nd.getMonth(), nd.getDate()) / 864e5);
      }
      var inRange = today >= D0 && today < D1;
      var locked = null,
        hover = null;

      var ro = W.readout([
        { key: "ph", k: "目前階段" },
        { key: "hold", k: "目標持股" },
        { key: "next", k: "下一個事件" },
        { key: "end", k: "距離出清完成" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 560 ? listHeight() : 244;
      }, draw);
      note(body, "日期依計畫（2026/10/16 版本）；標「約」的是預估時間，以公司與交易所公告為準。點時間軸上的事件或階段，可以在上方看到說明。");

      function phaseAt(dn) {
        for (var i = 0; i < phases.length; i++) if (dn >= phases[i].a && dn < phases[i].b) return phases[i];
        return null;
      }
      function evDate(v) {
        var e = v.e;
        if (v.end) return md(v.dn) + "–" + md(v.end);
        return (e.approx ? "約 " : "") + md(v.dn) + (e.approx ? "" : "（" + wd(v.dn) + "）");
      }
      function sel() {
        return hover || locked;
      }

      function describe() {
        var cur = sel();
        if (cur && cur.kind === "ev") {
          var v = cur.v;
          var p = phaseAt(v.dn);
          var inGap = v.dn >= gap.a && v.dn < gap.b;
          return {
            tone: "",
            t: "<b>" + evDate(v) + (v.e.approx ? "（" + v.e.when + "）" : "") + "　" + v.e.label + "</b><br>" + v.e.full + (p ? "<br>所屬階段：" + CIRC[p.id] + " " + p.name + "（目標持股 " + p.hold + "）。" : inGap ? "<br>這段時間台股春節休市。" : ""),
          };
        }
        if (cur && cur.kind === "ph") {
          var q = cur.p;
          return { tone: "", t: "<b>" + CIRC[q.id] + " " + q.name + "　" + md(q.from) + "–" + md(q.to) + "，目標持股 " + q.hold + "</b><br>" + TL_OPS[q.id] };
        }
        if (!inRange) return { tone: "", t: today < D0 ? "<b>計畫還沒開始。</b>第一階段「建倉」從 10/19 開始。點時間軸上的事件或階段看說明。" : "<b>這份計畫的期間已經結束（3/10 出清完成）。</b>點時間軸上的事件或階段，回顧每一步的安排。" };
        var ph = phaseAt(today);
        if (!ph) return { tone: "warn", t: "<b>今天在春節休市期間。</b>台股休市約一週，美股照常交易；計畫在連假期間若美股平穩，可以回補部分持股。" };
        return { tone: "good", t: "<b>今天 " + md(today) + " 在 " + CIRC[ph.id] + " " + ph.name + " 階段，目標持股 " + ph.hold + "。</b><br>" + TL_OPS[ph.id] + "<br>點時間軸上的事件，可以看它對計畫的意義。" };
      }

      function update() {
        var ph = inRange ? phaseAt(today) : null;
        var nxt = null;
        for (var i = 0; i < evs.length; i++)
          if (evs[i].dn >= today || (evs[i].end && evs[i].end >= today)) {
            nxt = evs[i];
            break;
          }
        var endDay = phases[4].to;
        ro.update({
          ph: { v: !inRange ? (today < D0 ? "尚未開始" : "已結束") : ph ? CIRC[ph.id] + " " + ph.name : "春節休市", s: ph ? md(ph.from) + "–" + md(ph.to) : inRange ? "約 2/6–2/10" : "計畫期間 10/19–3/10" },
          hold: { v: ph ? ph.hold : inRange ? "約 60%" : "—", s: ph ? "其餘為現金" : inRange ? "休市，持股不變" : "" },
          next: nxt ? { v: (nxt.e.approx ? "約 " : "") + md(nxt.dn) + " " + nxt.e.short, s: nxt.dn === today ? "就是今天" : nxt.dn > today ? "還有 " + (nxt.dn - today) + " 天：" + nxt.e.label : "進行中：" + nxt.e.label } : { v: "—", s: "計畫內的事件都已過去" },
          end: today <= endDay ? { v: endDay - today + " 天", s: "到 3/10 分批出清完成" } : { v: "已完成", s: "3/10 分批出清完成" },
        });
        var d = describe();
        vd.set(d.tone, d.t);
        ch.redraw();
      }

      function bind(g, item) {
        g.style.cursor = "pointer";
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "mouse") {
            hover = item;
            update();
          }
        });
        g.addEventListener("pointerleave", function (e) {
          if (e.pointerType === "mouse" && hover) {
            hover = null;
            update();
          }
        });
        function pick() {
          var same = locked && locked.kind === item.kind && (item.kind === "ev" ? locked.v === item.v : locked.p === item.p);
          locked = same ? null : item;
          hover = null;
          update();
        }
        g.addEventListener("click", pick);
        g.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick();
          }
        });
      }
      function isSel(kind, obj) {
        var c = sel();
        return !!c && c.kind === kind && (kind === "ev" ? c.v === obj : c.p === obj);
      }

      /* ---------- vertical list (phones) ---------- */
      function listItems() {
        var items = [];
        phases.forEach(function (p, i) {
          items.push({ kind: "ph", p: p, dn: p.a, h: 34 });
          evs.forEach(function (v) {
            if (v.dn >= p.a && v.dn < p.b) items.push({ kind: "ev", v: v, dn: v.dn, h: 28 });
          });
          if (i === 3) {
            items.push({ kind: "gap", dn: gap.a, h: 30 });
            evs.forEach(function (v) {
              if (v.dn >= gap.a && v.dn < gap.b) items.push({ kind: "ev", v: v, dn: v.dn, h: 28 });
            });
          }
        });
        return items;
      }
      function listHeight() {
        return (
          listItems().reduce(function (a, it) {
            return a + it.h;
          }, 0) + 30
        );
      }
      function drawList(svg, w) {
        var items = listItems();
        var y = 4;
        var railX = 70;
        var todayY = null;
        items.forEach(function (it) {
          if (inRange && todayY === null && it.dn > today) todayY = y;
          if (it.kind === "ph") {
            var p = it.p;
            var g = s("g", { "aria-label": CIRC[p.id] + " " + p.name });
            var on = isSel("ph", p);
            rect(g, 0, y + 3, w, it.h - 6, { fill: on ? "var(--engrave-soft)" : "var(--paper-2)", rx: 3 });
            txt(g, 10, y + 22, CIRC[p.id] + " " + p.name, { size: 14, weight: 700, fill: "var(--ink)" });
            txt(g, 10 + estW(CIRC[p.id] + " " + p.name, 14) + 10, y + 22, md(p.from) + "–" + md(p.to), { mono: true });
            txt(g, w - 10, y + 22, p.hold, { anchor: "end", size: 12, weight: 700, fill: "var(--ink-2)" });
            svg.appendChild(g);
            bind(g, { kind: "ph", p: p });
          } else if (it.kind === "gap") {
            var pid = W.uid("hbm-hatch");
            var defs = s("defs");
            var pat = s("pattern", { id: pid, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
            pat.appendChild(s("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "var(--rule)", "stroke-width": 2 }));
            defs.appendChild(pat);
            svg.appendChild(defs);
            rect(svg, 0, y + 4, w, it.h - 8, { fill: "url(#" + pid + ")", rx: 3 });
            txt(svg, 10, y + 20, "春節休市（約 2/6–2/10）", { size: 12, weight: 700, fill: "var(--ink-2)", halo: true });
          } else {
            var v = it.v;
            var on2 = isSel("ev", v);
            var g2 = s("g", { "aria-label": evDate(v) + " " + v.e.label });
            rect(g2, 0, y, w, it.h, { fill: on2 ? "var(--engrave-wash)" : "transparent" });
            ln(g2, railX, y, railX, y + it.h, { stroke: "var(--rule)", width: 1.5, cap: "butt" });
            svg.appendChild(s("circle", {}));
            g2.appendChild(s("circle", { cx: railX, cy: y + it.h / 2, r: on2 ? 5.5 : 4.5, fill: v.e.approx ? "var(--plate)" : "var(--engrave)", stroke: "var(--engrave)", "stroke-width": 1.8 }));
            txt(g2, railX - 12, y + it.h / 2 + 4, v.end ? md(v.dn) + "–" + new Date(v.end * 864e5).getUTCDate() : (v.e.approx ? "約" : "") + md(v.dn), { anchor: "end", mono: true, fill: on2 ? "var(--ink)" : null });
            txt(g2, railX + 14, y + it.h / 2 + 5, v.e.label, { size: 13, weight: on2 ? 700 : 400, fill: on2 ? "var(--ink)" : "var(--ink-2)" });
            svg.appendChild(g2);
            bind(g2, { kind: "ev", v: v });
          }
          y += it.h;
        });
        if (inRange && todayY === null) todayY = y;
        if (inRange) {
          ln(svg, 0, todayY, w, todayY, { stroke: "var(--foil)", width: 2, cap: "butt" });
          var tl = "今天 " + md(today);
          rect(svg, w - estW(tl, 12) - 14, todayY - 9, estW(tl, 12) + 14, 18, { fill: "var(--foil)", rx: 9 });
          txt(svg, w - 7, todayY + 4, tl, { anchor: "end", size: 12, weight: 700, fill: "var(--plate)" });
        }
        txt(svg, 0, y + 22, "● 確定日期　○ 約略日期", { size: 11, fill: "var(--ink-3)" });
      }

      /* ---------- horizontal timeline (wider screens) ---------- */
      function drawWide(svg, w, hh) {
        var m = { l: 40, r: 14 };
        var x = W.scale(D0, D1, m.l, w - m.r);
        var pTop = 30,
          pBot = 122;
        var yv = W.scale(0, 100, pBot, pTop + 4);
        var evY = pBot + 36;
        /* phase bands */
        phases.forEach(function (p, i) {
          var on = isSel("ph", p);
          var g = s("g", { "aria-label": CIRC[p.id] + " " + p.name + "，目標持股 " + p.hold });
          rect(g, x(p.a), pTop - 26, x(p.b) - x(p.a), pBot - pTop + 26, { fill: on ? "var(--engrave-wash)" : i % 2 ? "transparent" : "var(--paper-2)", opacity: on ? 1 : 0.8 });
          var full = CIRC[p.id] + " " + p.name;
          var lbl = estW(full, 13) + 6 < x(p.b) - x(p.a) ? full : CIRC[p.id];
          txt(g, (x(p.a) + x(p.b)) / 2, pTop - 10, lbl, { anchor: "middle", size: 13, weight: 700, fill: "var(--ink)" });
          svg.appendChild(g);
          bind(g, { kind: "ph", p: p });
        });
        /* holiday gap hatch */
        var pid = W.uid("hbm-hatch");
        var defs = s("defs");
        var pat = s("pattern", { id: pid, width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
        pat.appendChild(s("line", { x1: 0, y1: 0, x2: 0, y2: 5, stroke: "var(--rule)", "stroke-width": 1.6 }));
        defs.appendChild(pat);
        svg.appendChild(defs);
        rect(svg, x(gap.a), pTop - 26, x(gap.b) - x(gap.a), pBot - pTop + 26, { fill: "url(#" + pid + ")" });
        W.gridY(svg, yv, [0, 50, 100], m.l, w - m.r, function (v) {
          return v + "%";
        });
        /* target holding: ranges as bands, single values as lines, phase 5 as a ramp */
        var path = "M" + r1(x(phases[0].a)) + " " + r1(yv(0));
        phases.forEach(function (p) {
          var hv = TL_HOLD[p.id];
          if (p.id === 5) path += "L" + r1(x(p.a)) + " " + r1(yv(hv[0])) + "L" + r1(x(p.b)) + " " + r1(yv(hv[1]));
          else {
            var mid = (hv[0] + hv[1]) / 2;
            path += "L" + r1(x(p.a)) + " " + r1(yv(mid)) + "L" + r1(x(p.b)) + " " + r1(yv(mid));
            if (p.id === 4) path += "L" + r1(x(gap.b)) + " " + r1(yv(mid));
          }
        });
        var area = path + "L" + r1(x(phases[4].b)) + " " + r1(yv(0)) + "Z";
        svg.appendChild(s("path", { d: area, fill: "var(--engrave)", opacity: 0.1 }));
        phases.forEach(function (p) {
          var hv = TL_HOLD[p.id];
          if (hv[0] !== hv[1] && p.id !== 5) rect(svg, x(p.a), yv(hv[1]), x(p.b) - x(p.a), yv(hv[0]) - yv(hv[1]), { fill: "var(--engrave)", opacity: 0.22 });
        });
        svg.appendChild(s("path", { d: path.replace(/^M[^L]+/, "M" + r1(x(phases[0].a)) + " " + r1(yv(45))), fill: "none", stroke: "var(--engrave)", "stroke-width": 2, "stroke-linejoin": "round" }));
        /* hold labels */
        phases.forEach(function (p) {
          var hv = TL_HOLD[p.id];
          var cx = (x(p.a) + x(p.b)) / 2;
          if (p.id === 5) txt(svg, cx, yv(88), "逐步降至 0%", { anchor: "middle", size: 12, fill: "var(--ink-2)", halo: true });
          else txt(svg, cx, yv(Math.max(hv[0], hv[1])) - 6, p.hold, { anchor: "middle", size: 12, weight: 600, fill: "var(--ink)", halo: true });
        });
        /* months */
        ln(svg, m.l, pBot, w - m.r, pBot, { stroke: "var(--ink-3)", width: 1, cap: "butt" });
        var months = ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01", "2027-03-01"];
        months.forEach(function (mm) {
          var dn = dayNo(mm),
            xx = x(dn);
          ln(svg, xx, pBot, xx, pBot + 5, { stroke: "var(--ink-3)", width: 1, cap: "butt" });
          var mo = +mm.split("-")[1];
          txt(svg, xx + 3, pBot + 16, (mo === 1 ? "2027/" : "") + mo + "月", { mono: true });
        });
        txt(svg, m.l + 3, pBot + 16, "10月", { mono: true });
        /* events on their own baseline */
        ln(svg, m.l, evY, w - m.r, evY, { stroke: "var(--rule)", width: 1, cap: "butt" });
        var rows = [[], [], [], []];
        evs.forEach(function (v) {
          var on = isSel("ev", v);
          var ex = x(v.dn + 0.5);
          var g = s("g", { "aria-label": evDate(v) + " " + v.e.label });
          if (v.end) {
            g.appendChild(s("rect", { x: r1(x(v.dn)), y: evY - 4, width: r1(x(v.end + 1) - x(v.dn)), height: 8, rx: 4, fill: "var(--engrave)" }));
            ex = (x(v.dn) + x(v.end + 1)) / 2;
          } else g.appendChild(s("circle", { cx: r1(ex), cy: evY, r: on ? 5.5 : 4.5, fill: v.e.approx ? "var(--plate)" : "var(--engrave)", stroke: "var(--engrave)", "stroke-width": 1.8 }));
          var lw = estW(v.e.short, 12) + 8;
          var lx0 = clamp(ex - lw / 2, 2, w - 2 - lw);
          var row = -1;
          for (var k = 0; k < rows.length && row < 0; k++) {
            var free = rows[k].every(function (iv) {
              return lx0 + lw <= iv[0] || lx0 >= iv[1];
            });
            if (free) row = k;
          }
          if (row < 0) row = rows.length - 1;
          rows[row].push([lx0, lx0 + lw]);
          var ty = evY + 20 + row * 16;
          if (row > 0) ln(g, ex, evY + 6, ex, ty - 11, { stroke: "var(--rule)", width: 1, cap: "butt" });
          txt(g, lx0 + lw / 2, ty, v.e.short, { anchor: "middle", size: 12, weight: on ? 700 : 400, fill: on ? "var(--ink)" : "var(--ink-2)" });
          g.appendChild(s("rect", { x: r1(Math.min(ex - 8, lx0)), y: evY - 9, width: r1(Math.max(lw, 16)), height: ty - evY + 13, fill: "transparent" }));
          svg.appendChild(g);
          bind(g, { kind: "ev", v: v });
        });
        txt(svg, 0, evY + 4, "事件", { size: 11, fill: "var(--ink-3)" });
        /* today */
        if (inRange) {
          var tx = x(today + 0.5);
          ln(svg, tx, pTop - 4, tx, evY + 6, { stroke: "var(--foil)", width: 2, cap: "butt" });
          var tl = "今天 " + md(today);
          var tw = estW(tl, 12) + 14;
          var bx = clamp(tx - tw / 2, m.l, w - m.r - tw);
          rect(svg, bx, pTop - 4, tw, 18, { fill: "var(--foil)", rx: 9 });
          txt(svg, bx + tw / 2, pTop + 9, tl, { anchor: "middle", size: 12, weight: 700, fill: "var(--plate)" });
        }
        txt(svg, w - m.r, hh - 4, "● 確定日期　○ 約略日期　斜線＝春節休市", { anchor: "end", size: 11, fill: "var(--ink-3)" });
      }

      function draw(svg, w, hh) {
        svg.setAttribute("aria-label", "計畫時間軸：10/19 到 3/10 的五個階段、目標持股與 " + evs.length + " 個關鍵事件");
        if (w < 560) drawList(svg, w);
        else drawWide(svg, w, hh);
      }
      update();
    },
  });
})();
