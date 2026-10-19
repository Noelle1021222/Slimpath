/* 讀通投資 — basic instruments. Requires widgets.js (HB.W). All copy zh-TW.

   compound    複利成長          data-principal (元, 100000)  data-monthly (元, 0)
                                 data-rate (年 %, 7)  data-years (1–40, 20)
   recovery    回本數學          data-loss (%, 30)
   tradecost   台股交易成本      data-price (元, 1000)  data-shares (股, 1000)
                                 data-discount (折: 10 | 6 | 2.8, 6)  data-kind (stock | etf | daytrade)
                                 data-minfee (元: 20 | 1, 20)
   pointpct    點數與百分比      data-level (前一日收盤, 48000 示意)  data-points (-1656)
   candle      K 棒解剖          data-open (100) data-high (108) data-low (96) data-close (105)
   ma          均線（示意走勢）  data-days (60–250, 120)  data-show ("10,20,60"; any of 5,10,20,60)
   pe          本益比            data-eps (150) data-pe (16) data-pe1 (26) data-growth (%, 30) data-pe2 (20)
                                 data-part (1 | 2, 1)
   bond        債券蹺蹺板        data-coupon (%, 4)  data-years (2 | 10 | 30, 10)  data-yield (%, 4)
   yieldcurve  殖利率曲線        data-shape (normal | flat | inverted | bear-steepen | bull-steepen)
   discount    折現與成長股      data-rate (%, 4)  data-shock (0.5 | 1 | 2, 1)
   fxreturn    匯率與外資報酬    data-stock (%, 10)  data-fx (新台幣升值為正 %, -3)

   Every widget also takes data-title and data-note (data-note replaces the
   widget's default footnote). Colours come only from CSS tokens. */
(function () {
  "use strict";
  var HB = window.HB;
  if (!HB || !HB.W || !HB.defineWidget) return;
  var W = HB.W;
  var fmt = W.fmt;
  var h = W.h;
  var s = W.s;
  var doc = document;

  /* ======================================================================
     shared helpers
     ====================================================================== */
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }
  function fin(v, d) {
    v = typeof v === "number" ? v : parseFloat(v);
    return isFinite(v) ? v : d;
  }
  function opt(cfg, key, def, lo, hi) {
    return clamp(fin(cfg[key], def), lo, hi);
  }
  function snap(v, step) {
    return W.round(Math.round(v / step) * step, 6);
  }
  function nearest(v, list) {
    var b = list[0];
    list.forEach(function (x) {
      if (Math.abs(x - v) < Math.abs(b - v)) b = x;
    });
    return b;
  }
  /* number without trailing ".0" */
  function tn(v, d) {
    return fmt.num(v, Math.abs(v - Math.round(v)) < 1e-9 ? 0 : d === undefined ? 1 : d);
  }
  function yuan(x, d) {
    var t = fmt.wan(x, d);
    return /[萬億]$/.test(t) ? t.replace(" ", " ") + "元" : t + " 元";
  }
  function wanShort(x, d) {
    var a = Math.abs(x),
      sg = x < 0 ? "−" : "";
    if (a >= 1e8) return sg + tn(a / 1e8, d === undefined ? 2 : d) + "億";
    if (a >= 1e4) return sg + tn(a / 1e4, d === undefined ? 1 : d) + "萬";
    return sg + fmt.num(a, 0);
  }
  function wanTick(v) {
    return v === 0 ? "0" : wanShort(v, 2);
  }
  function pp(x, d) {
    return fmt.signed(x, d === undefined ? 1 : d) + " 個百分點";
  }
  function pctNum(v, d) {
    return fmt.num(v, d === undefined ? 2 : d) + "%";
  }
  function defaultNote(body, cfg, text) {
    if (!cfg.note && text) body.appendChild(h("p", { class: "widget-note", text: text }));
  }
  /* rough text width for layout (CJK = 1em, Latin/digits ≈ .6em) */
  function tw(str, px) {
    var w = 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      w += c >= 0x2e80 ? px : c === 32 ? px * 0.32 : px * 0.6;
    }
    return w;
  }
  function T(svg, x, y, str, a) {
    a = a || {};
    a.x = x;
    a.y = y;
    a.text = str;
    return svg.appendChild(s("text", a));
  }
  function L(svg, x1, y1, x2, y2, a) {
    a = a || {};
    a.x1 = x1;
    a.y1 = y1;
    a.x2 = x2;
    a.y2 = y2;
    if (!a.stroke) a.stroke = "var(--ink-3)";
    return svg.appendChild(s("line", a));
  }
  function P(svg, d, a) {
    a = a || {};
    a.d = d;
    if (!a.fill) a.fill = "none";
    return svg.appendChild(s("path", a));
  }
  function stroke(color, wdt, extra) {
    var a = { stroke: color, "stroke-width": wdt || 2, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" };
    for (var k in extra || {}) a[k] = extra[k];
    return a;
  }
  function dot(svg, x, y, color, r) {
    return svg.appendChild(s("circle", { cx: x, cy: y, r: r || 4.5, fill: color, stroke: "var(--plate)", "stroke-width": 2 }));
  }
  /* nice axis domain with evenly spaced ticks */
  function nice(lo, hi, count) {
    if (!(hi > lo)) hi = lo + 1;
    var t = W.ticks(lo, hi, count || 5);
    if (t.length < 2) return { lo: lo, hi: hi, ticks: [lo, hi] };
    var st = t[1] - t[0];
    var a = t[0] > lo + st * 1e-9 ? W.round(t[0] - st, 10) : t[0];
    var b = t[t.length - 1] < hi - st * 1e-9 ? W.round(t[t.length - 1] + st, 10) : t[t.length - 1];
    var out = [];
    for (var v = a; v <= b + st * 1e-6; v += st) out.push(W.round(v, 10));
    return { lo: a, hi: b, ticks: out, step: st };
  }
  /* push labels apart vertically: items [{y}] -> each gets .ly */
  function spread(items, gap, lo, hi) {
    items.sort(function (a, b) {
      return a.y - b.y;
    });
    var n = items.length,
      i;
    for (i = 0; i < n; i++) items[i].ly = Math.max(items[i].y, i ? items[i - 1].ly + gap : lo);
    if (n && items[n - 1].ly > hi) {
      items[n - 1].ly = hi;
      for (i = n - 2; i >= 0; i--) items[i].ly = Math.min(items[i].ly, items[i + 1].ly - gap);
    }
    return items;
  }
  /* horizontal bar from baseline x0 to x1 with a rounded data end */
  function hbar(x0, x1, yc, th, r) {
    var len = Math.abs(x1 - x0);
    if (len < 0.5) return "M" + x0 + " " + (yc - th / 2) + "h0.5v" + th + "h-0.5Z";
    var d = x1 >= x0 ? 1 : -1;
    r = Math.min(r, len, th / 2);
    var t = yc - th / 2,
      b = yc + th / 2;
    return "M" + x0 + " " + t + "H" + (x1 - d * r) + "Q" + x1 + " " + t + " " + x1 + " " + (t + r) + "V" + (b - r) + "Q" + x1 + " " + b + " " + (x1 - d * r) + " " + b + "H" + x0 + "Z";
  }
  /* vertical bar from baseline y0 to y1 with a rounded data end */
  function vbar(xc, y0, y1, th, r) {
    var len = Math.abs(y1 - y0);
    var l = xc - th / 2,
      rt = xc + th / 2;
    if (len < 0.5) return "M" + l + " " + y0 + "h" + th + "v-0.5h" + -th + "Z";
    var d = y1 <= y0 ? -1 : 1;
    r = Math.min(r, len, th / 2);
    return "M" + l + " " + y0 + "V" + (y1 - d * r) + "Q" + l + " " + y1 + " " + (l + r) + " " + y1 + "H" + (rt - r) + "Q" + rt + " " + y1 + " " + rt + " " + (y1 - d * r) + "V" + y0 + "Z";
  }
  function isIntl() {
    return doc.documentElement.getAttribute("data-quote") === "intl";
  }

  /* tooltip bubble anchored to a point in chart coordinates */
  function makeTip(ch) {
    var tip = h("div", { class: "w-tip", "aria-hidden": "true" });
    tip.style.display = "none";
    ch.el.appendChild(tip);
    return {
      show: function (x, y, text) {
        var svg = ch.svg;
        var vb = svg.viewBox && svg.viewBox.baseVal;
        var r = svg.getBoundingClientRect();
        var k = vb && vb.width && r.width ? r.width / vb.width : 1;
        tip.textContent = text;
        tip.style.display = "block";
        var half = tip.offsetWidth / 2;
        var cw = ch.el.clientWidth;
        tip.style.left = clamp(x * k, half + 2, Math.max(half + 2, cw - half - 2)) + "px";
        tip.style.top = Math.max(0, y * k) + "px";
      },
      hide: function () {
        tip.style.display = "none";
      },
    };
  }

  /* pointer handling on a chart: hover (mouse), press/drag (mouse + touch).
     Touch acts on horizontal drags and taps only, so vertical page scrolling
     over a chart never changes a value. */
  function bindPointer(ch, o) {
    var el = ch.svg;
    var pressed = false;
    var touchMoved = false;
    el.style.touchAction = "pan-y";
    if (o.cursor) el.style.cursor = o.cursor;
    function pt(e) {
      var r = el.getBoundingClientRect();
      var vb = el.viewBox && el.viewBox.baseVal;
      var k = vb && vb.width && r.width ? vb.width / r.width : 1;
      return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, touch: e.pointerType === "touch" };
    }
    function act(e) {
      (o.press || o.hover)(pt(e));
    }
    el.addEventListener("pointerdown", function (e) {
      pressed = true;
      touchMoved = false;
      if (e.pointerType !== "touch") {
        try {
          el.setPointerCapture(e.pointerId);
        } catch (err) {}
        act(e);
      }
    });
    el.addEventListener("pointermove", function (e) {
      if (pressed) {
        touchMoved = true;
        act(e);
      } else if (e.pointerType !== "touch" && o.hover) o.hover(pt(e));
    });
    el.addEventListener("pointerup", function (e) {
      if (pressed && e.pointerType === "touch" && !touchMoved) act(e);
      pressed = false;
    });
    el.addEventListener("pointercancel", function () {
      pressed = false;
      if (o.leave) o.leave();
    });
    el.addEventListener("pointerleave", function (e) {
      if (!pressed && e.pointerType !== "touch" && o.leave) o.leave();
    });
  }

  /* small legend row inside an svg: items [{label, color, kind:"line"|"dash"|"area"|"dot"}] */
  function legend(svg, x, y, items, maxX) {
    var cx = x,
      cy = y;
    items.forEach(function (it) {
      var wdt = 18 + tw(it.label, 12) + 14;
      if (maxX && cx > x && cx + wdt > maxX) {
        cx = x;
        cy += 18;
      }
      if (it.kind === "area") {
        svg.appendChild(s("rect", { x: cx, y: cy - 9, width: 12, height: 10, fill: it.color, opacity: 0.22, rx: 1.5 }));
        L(svg, cx, cy - 9, cx + 12, cy - 9, stroke(it.color, 2));
      } else if (it.kind === "dot") {
        svg.appendChild(s("circle", { cx: cx + 6, cy: cy - 4, r: 4, fill: it.color }));
      } else {
        L(svg, cx, cy - 4, cx + 13, cy - 4, stroke(it.color, 2, it.kind === "dash" ? { "stroke-dasharray": "3 3" } : null));
      }
      T(svg, cx + 18, y === cy ? cy : cy, it.label, { fill: "var(--ink-2)" });
      cx += wdt;
    });
    return cy;
  }

  /* ======================================================================
     compound — 複利成長
     ====================================================================== */
  HB.defineWidget("compound", {
    title: "複利成長：時間是最重要的原料",
    init: function (body, cfg) {
      var pIn = W.number({ label: "一開始投入的本金", suffix: "元", value: opt(cfg, "principal", 100000, 0, 1e11), step: 10000, min: 0, onInput: update });
      var mIn = W.number({ label: "每月再投入", suffix: "元", value: opt(cfg, "monthly", 0, 0, 1e9), step: 1000, min: 0, onInput: update });
      var rSl = W.slider({
        label: "年報酬率",
        min: 0,
        max: 15,
        step: 0.5,
        value: snap(opt(cfg, "rate", 7, 0, 15), 0.5),
        fmt: function (v) {
          return tn(v, 1) + "%";
        },
        onInput: update,
      });
      var nSl = W.slider({
        label: "投資年數",
        min: 1,
        max: 40,
        step: 1,
        value: Math.round(opt(cfg, "years", 20, 1, 40)),
        fmt: function (v) {
          return v + " 年";
        },
        onInput: update,
      });
      body.appendChild(h("div", { class: "w-controls" }, [pIn.el, mIn.el, rSl.el, nSl.el]));
      var ro = W.readout([
        { key: "end", k: "期末金額" },
        { key: "paid", k: "投入本金合計" },
        { key: "gain", k: "累積報酬" },
        { key: "dbl", k: "72 法則：約幾年翻倍" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var hov = null;
      var geo = null;
      var ch = W.chart(
        body,
        function (w) {
          return w < 480 ? 236 : 276;
        },
        draw
      );
      var tip = makeTip(ch);
      bindPointer(ch, {
        cursor: "crosshair",
        hover: function (p) {
          if (!geo) return;
          var md = model();
          var t = Math.round(clamp(geo.x.invert(p.x), 0, md.n));
          if (t === hov) return;
          hov = t;
          ch.redraw();
          var v = V(md, t),
            c = C(md, t);
          tip.show(geo.x(t), geo.y(v) - 6, (t === 0 ? "一開始" : "第 " + t + " 年") + "｜總額 " + wanShort(v) + "｜本金 " + wanShort(c) + "｜報酬 " + wanShort(v - c));
        },
        leave: function () {
          hov = null;
          tip.hide();
          ch.redraw();
        },
      });
      defaultNote(body, cfg, "假設報酬率每年固定、複利再投入，未計稅與費用；實際報酬每年不同。每月投入視為月底存入、按月複利（月報酬率換算自年報酬率）。");

      function model() {
        var r = clamp(fin(rSl.get(), 7), 0, 15) / 100;
        return {
          P: Math.max(0, pIn.get()),
          m: Math.max(0, mIn.get()),
          r: r,
          i: Math.pow(1 + r, 1 / 12) - 1,
          n: clamp(Math.round(fin(nSl.get(), 20)), 1, 40),
        };
      }
      function V(md, t) {
        var k = 12 * t;
        var fm = md.i > 0 ? (md.m * (Math.pow(1 + md.i, k) - 1)) / md.i : md.m * k;
        return md.P * Math.pow(1 + md.r, t) + fm;
      }
      function C(md, t) {
        return md.P + md.m * 12 * t;
      }

      function update() {
        var md = model();
        var fv = V(md, md.n),
          paid = C(md, md.n),
          gain = fv - paid;
        var rate = md.r * 100;
        ro.update({
          end: { v: yuan(fv), s: md.n + " 年後｜精確值 " + fmt.num(fv) + " 元" },
          paid: { v: yuan(paid), s: md.m > 0 ? "本金 " + yuan(md.P) + "＋每月 " + fmt.num(md.m) + " 元 × " + md.n * 12 + " 個月" : "只有一開始的本金，之後沒再投入" },
          gain: { v: (gain > 0 ? "+" : "") + yuan(gain), s: paid > 0 ? "期末是投入的 " + fmt.num(fv / paid, 2) + " 倍" : "—", tone: gain > 0.5 ? "up" : "" },
          dbl: {
            v: rate > 0 ? "約 " + fmt.num(72 / rate, 1) + " 年" : "不會翻倍",
            s: rate > 0 ? "72 ÷ " + tn(rate, 1) + "；精確算法 " + fmt.num(Math.log(2) / Math.log(1 + md.r), 1) + " 年" : "報酬率 0% 時，錢只會原地不動",
          },
        });
        if (!(paid > 0)) vd.set("", "先輸入本金或每月投入的金額。");
        else if (rate === 0) vd.set("", "<b>報酬率 0%：期末金額就等於你投入的錢。</b>沒有報酬，就沒有東西可以「滾」。把年報酬率往右拉，看曲線怎麼彎上去。");
        else {
          var gShare = gain / fv;
          var half = Math.floor(md.n / 2);
          var gHalf = V(md, half) - C(md, half);
          var lead = "<b>期末 " + yuan(fv) + " 裡，" + (gShare >= 0.5 ? "複利報酬占 " + fmt.pct(gShare, 0) + "，已經比你投入的本金還多。" : "你投入的本金占 " + fmt.pct(1 - gShare, 0) + "，複利報酬占 " + fmt.pct(gShare, 0) + "。") + "</b>";
          var tail = md.n >= 4 && gain > 0 ? "前 " + half + " 年累積的報酬只占全部的 " + fmt.pct(gHalf / gain, 0) + "，其餘都在後 " + (md.n - half) + " 年滾出來：複利的力量集中在後段，所以越早開始、越不中斷越好。" : "年數太短，複利還來不及發揮；把年數拉長看看。";
          vd.set(gShare >= 0.5 ? "good" : "", lead + tail);
        }
        ch.redraw();
      }

      function draw(svg, w, H) {
        var md = model(),
          n = md.n,
          narrow = w < 480;
        var fv = V(md, n),
          paid = C(md, n);
        var m = { l: 46, r: 58, t: 34, b: 28 };
        var dom = nice(0, Math.max(fv, 10), narrow ? 4 : 5);
        var x = W.scale(0, n, m.l, w - m.r),
          y = W.scale(0, dom.hi, H - m.b, m.t);
        geo = { x: x, y: y };
        svg.setAttribute("aria-label", "複利成長圖：" + n + " 年後總額 " + wanShort(fv) + " 元，其中投入本金 " + wanShort(paid) + " 元、複利報酬 " + wanShort(fv - paid) + " 元");
        W.gridY(svg, y, dom.ticks, m.l, w - m.r, wanTick);
        var xt = W.ticks(0, n, narrow ? 4 : 6).filter(function (v) {
          return v === Math.round(v);
        });
        W.labelsX(svg, x, xt, H - m.b + 18, function (v) {
          return v === 0 ? "0" : v + " 年";
        });
        var st = n <= 8 ? 1 / 12 : n <= 20 ? 0.25 : 0.5;
        var ts = [];
        for (var t = 0; t < n - 1e-9; t += st) ts.push(t);
        ts.push(n);
        var top = ts.map(function (t) {
          return [x(t), y(V(md, t))];
        });
        var bot = ts.map(function (t) {
          return [x(t), y(C(md, t))];
        });
        var y0 = y(0);
        P(svg, W.linePath(bot) + "L" + x(n) + " " + y0 + "L" + x(0) + " " + y0 + "Z", { fill: "var(--ink-3)", opacity: 0.16 });
        P(svg, W.linePath(top) + W.linePath(bot.slice().reverse()).replace(/^M/, "L") + "Z", { fill: "var(--cat-1)", opacity: 0.13 });
        L(svg, m.l, y0, w - m.r, y0, { class: "axis" });
        P(svg, W.linePath(bot), stroke("var(--ink-3)", 2));
        P(svg, W.linePath(top), stroke("var(--cat-1)", 2));
        legend(svg, m.l, 15, [
          { label: "投入本金", color: "var(--ink-3)", kind: "area" },
          { label: "複利報酬", color: "var(--cat-1)", kind: "area" },
        ]);
        /* end labels (two lines: name + value) */
        var items = spread(
          [
            { y: y(fv), name: "總額", val: wanShort(fv), strong: true },
            { y: y(paid), name: "本金", val: wanShort(paid) },
          ],
          30,
          m.t + 4,
          H - m.b - 14
        );
        items.forEach(function (it) {
          var lx = w - m.r + 8;
          T(svg, lx, it.ly - 3, it.name, { "font-size": 11, fill: "var(--ink-3)" });
          T(svg, lx, it.ly + 11, it.val, { class: "mono", style: "font-size:12px;fill:var(--ink)" + (it.strong ? ";font-weight:600" : "") });
        });
        dot(svg, x(n), y(fv), "var(--cat-1)", 4);
        if (hov !== null && hov <= n) {
          var hx = x(hov);
          L(svg, hx, m.t, hx, y0, { stroke: "var(--ink)", "stroke-width": 1, opacity: 0.3 });
          dot(svg, hx, y(C(md, hov)), "var(--ink-3)", 4);
          dot(svg, hx, y(V(md, hov)), "var(--cat-1)", 4.5);
        }
      }
      update();
    },
  });

  /* ======================================================================
     recovery — 回本數學
     ====================================================================== */
  HB.defineWidget("recovery", {
    title: "回本數學：跌 50%，要漲 100%",
    init: function (body, cfg) {
      var lossSl = W.slider({
        label: "虧損幅度",
        min: 1,
        max: 90,
        step: 1,
        value: Math.round(opt(cfg, "loss", 30, 1, 90)),
        fmt: function (v) {
          return "−" + v + "%";
        },
        onInput: update,
      });
      body.appendChild(h("div", { class: "w-controls" }, [lossSl.el]));
      var ro = W.readout([
        { key: "left", k: "剩下的本金" },
        { key: "need", k: "回本需要的漲幅" },
        { key: "eg", k: "例：100 萬剩多少" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var geo = null;
      var ch = W.chart(
        body,
        function (w) {
          return w < 480 ? 250 : 280;
        },
        draw
      );
      var tip = makeTip(ch);
      bindPointer(ch, {
        cursor: "pointer",
        hover: function (p) {
          if (!geo) return;
          var l = Math.round(clamp(geo.x.invert(p.x), 1, 90));
          var g = l / (100 - l);
          tip.show(geo.x(l), geo.y(Math.min(4, g) * 100) - 8, "虧 " + l + "% → 要漲 " + fmt.pct(g, 1) + "（點一下套用）");
        },
        press: function (p) {
          if (!geo) return;
          lossSl.set(Math.round(clamp(geo.x.invert(p.x), 1, 90)));
          tip.hide();
          update();
        },
        leave: function () {
          tip.hide();
        },
      });
      defaultNote(body, cfg, "圖的縱軸只畫到 +400%（虧 80%）；虧得更深，回本需要的漲幅會往上直衝。");

      function L0() {
        return clamp(Math.round(fin(lossSl.get(), 30)), 1, 90) / 100;
      }
      function update() {
        var l = L0();
        var g = 1 / (1 - l) - 1;
        ro.update({
          left: { v: fmt.num(100 * (1 - l), 0) + " 元", s: "每 100 元虧 " + Math.round(l * 100) + "% 之後", tone: "down" },
          need: { v: fmt.pct(g, 1, true), s: "100 ÷ " + fmt.num(100 * (1 - l), 0) + " − 1：剩下的錢要漲這麼多", tone: "up" },
          eg: { v: yuan(1e6 * (1 - l)), s: "要賺回 " + yuan(1e6 * l) + "，得漲 " + fmt.pct(g, 1) },
        });
        var L100 = Math.round(l * 100);
        if (l >= 0.75)
          vd.set(
            "bad",
            "<b>虧 " + L100 + "%，要漲 " + fmt.pct(g, 0) + "（變成原來的 " + fmt.num(1 / (1 - l), 1) + " 倍）才回本。</b>到這個程度幾乎回不來了。這就是計畫一定要設停損的原因：小賠還有機會補回，大賠會讓時間和機會一起消失。"
          );
        else if (l >= 0.5)
          vd.set(
            "bad",
            (L100 === 50 ? "<b>虧一半，要漲 100%（翻倍）才回本。</b>" : "<b>虧 " + L100 + "%，要漲 " + fmt.pct(g, 1) + " 才回本，超過 100%。</b>") +
              "下跌一半可能只要一段急跌，漲回一倍卻可能要好幾年。虧損越深，回本需要的漲幅越不成比例。"
          );
        else if (l >= 0.2)
          vd.set(
            "warn",
            "<b>虧 " + L100 + "%，要漲 " + fmt.pct(g, 1) + " 才回本，不是 " + L100 + "%。</b>因為漲的是「剩下的 " + fmt.num(100 * (1 - l), 0) + " 元」，基數變小了。虧損越深，差距越大：虧 50% 要漲 100%。"
          );
        else vd.set("good", "<b>虧 " + L100 + "%，要漲 " + fmt.pct(g, 1) + " 回本，差距還小。</b>小虧時，回本的漲幅和虧損差不多；這也是停損要設得早、設得小的原因。");
        ch.redraw();
      }

      function draw(svg, w, H) {
        var l = L0(),
          narrow = w < 480;
        var g = (1 / (1 - l) - 1) * 100;
        var m = { l: 48, r: 16, t: 16, b: 30 };
        var x = W.scale(0, 90, m.l, w - m.r),
          y = W.scale(0, 400, H - m.b, m.t);
        geo = { x: x, y: y };
        svg.setAttribute("aria-label", "回本需要的漲幅曲線：虧損 " + Math.round(l * 100) + "% 時要漲 " + fmt.num(g, 1) + "%，虛線是直覺以為的跌多少漲多少");
        W.gridY(svg, y, [0, 100, 200, 300, 400], m.l, w - m.r, function (v) {
          return v === 0 ? "0%" : "+" + v + "%";
        });
        W.labelsX(svg, x, narrow ? [0, 30, 60, 90] : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90], H - m.b + 18, function (v) {
          return v === 0 ? "0" : "−" + v + "%";
        });
        /* intuition diagonal */
        P(svg, "M" + x(0) + " " + y(0) + "L" + x(90) + " " + y(90), stroke("var(--ink-3)", 1.5, { "stroke-dasharray": "5 5" }));
        T(svg, x(90) - 2, y(90) - 9, "直覺以為（跌多少漲多少）", { "text-anchor": "end", fill: "var(--ink-3)" });
        /* real curve, clipped at 400% */
        var pts = [];
        for (var v = 0; v <= 80.0001; v += 0.5) pts.push([x(v), y((v / (100 - v)) * 100)]);
        P(svg, W.linePath(pts), stroke("var(--up)", 2));
        T(svg, x(80) - 8, y(400) + 4, "虧 90% 要漲 900% ↑", { "text-anchor": "end", "font-size": 11, fill: "var(--ink-3)" });
        var lx = x(narrow ? 66 : 70),
          lyv = narrow ? 66 / 34 : 70 / 30;
        T(svg, lx - 10, y(lyv * 100) + 4, "實際需要的漲幅", { "text-anchor": "end", "font-weight": 700, fill: "var(--ink)" });
        /* current point, gap to intuition */
        var cx = x(l * 100),
          cy = y(Math.min(400, g)),
          dy = y(l * 100);
        L(svg, cx, dy, cx, cy, { stroke: "var(--ink-2)", "stroke-width": 1 });
        svg.appendChild(s("circle", { cx: cx, cy: dy, r: 3.5, fill: "var(--plate)", stroke: "var(--ink-3)", "stroke-width": 1.5 }));
        dot(svg, cx, cy, "var(--up)", 5);
        var right = cx < w - m.r - 96;
        var anchor = right ? "start" : "end";
        var tx = right ? cx + 10 : cx - 10;
        T(svg, tx, cy + (g > 400 ? 16 : 4), "要漲 " + fmt.pct(g / 100, 1, true), { "text-anchor": anchor, "font-weight": 700, "font-size": 13, fill: "var(--ink)" });
        if (dy - cy > 40) T(svg, tx, (dy + cy) / 2 + 4, "比直覺多 " + fmt.num(g - l * 100, 1) + " 個百分點", { "text-anchor": anchor, "font-size": 11, fill: "var(--ink-2)" });
      }
      update();
    },
  });

  /* ======================================================================
     tradecost — 台股交易成本
     ====================================================================== */
  HB.defineWidget("tradecost", {
    title: "台股交易成本與損益兩平",
    init: function (body, cfg) {
      var FEE = 0.001425;
      var TAX = { stock: 0.003, etf: 0.001, daytrade: 0.0015 };
      var KIND = { stock: "股票", etf: "ETF", daytrade: "現股當沖" };
      var kind0 = TAX[cfg.kind] ? cfg.kind : "stock";
      var pxIn = W.number({ label: "成交價格", suffix: "元", value: opt(cfg, "price", 1000, 0.01, 1e6), step: 0.5, min: 0.01, onInput: update });
      var qIn = W.number({ label: "股數（1 張＝1,000 股）", suffix: "股", value: Math.round(opt(cfg, "shares", 1000, 1, 1e8)), step: 1, min: 1, onInput: update });
      var disc = W.seg({
        label: "手續費折扣",
        options: [
          [10, "不打折"],
          [6, "6 折"],
          [2.8, "2.8 折"],
        ],
        value: nearest(fin(cfg.discount, 6), [10, 6, 2.8]),
        onChange: update,
      });
      var kindSeg = W.seg({
        label: "類別（決定證交稅）",
        options: [
          ["stock", "股票"],
          ["etf", "ETF"],
          ["daytrade", "現股當沖"],
        ],
        value: kind0,
        onChange: update,
      });
      var minSeg = W.seg({
        label: "最低手續費",
        options: [
          [20, "整股常見 20 元"],
          [1, "零股常見 1 元"],
        ],
        value: nearest(fin(cfg.minfee, 20), [20, 1]),
        onChange: update,
      });
      body.appendChild(h("div", { class: "w-controls" }, [pxIn.el, qIn.el, disc.el, kindSeg.el, minSeg.el]));
      var ro = W.readout([
        { key: "fb", k: "買進手續費" },
        { key: "fs", k: "賣出手續費" },
        { key: "tax", k: "證交稅（只在賣出收）" },
        { key: "tot", k: "來回總成本" },
        { key: "be", k: "損益兩平賣價" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(
        body,
        function (w) {
          return w < 520 ? 150 : 104;
        },
        draw
      );
      defaultNote(body, cfg, "費率以券商與證交所公告為準；部分券商零股最低手續費不同。手續費與證交稅都是「元以下捨去」。");

      function tick(p, k) {
        if (k === "etf") return p < 50 ? 0.01 : 0.05;
        return p < 10 ? 0.01 : p < 50 ? 0.05 : p < 100 ? 0.1 : p < 500 ? 0.5 : p < 1000 ? 1 : 5;
      }
      function calc() {
        var p = Math.max(0.01, pxIn.get());
        var q = Math.max(1, Math.round(qIn.get()));
        var k = kindSeg.get();
        var f = FEE * (disc.get() / 10);
        var t = TAX[k] || TAX.stock;
        var minFee = minSeg.get();
        var amt = p * q;
        function fee(a) {
          return a > 0 ? Math.max(minFee, Math.floor(a * f + 1e-9)) : 0;
        }
        var fb = fee(amt),
          fs = fee(amt),
          tax = Math.floor(amt * t + 1e-9);
        var cost = amt + fb;
        /* continuous break-even, then round up to the cent (floors only lower the real costs) */
        var s1 = cost / (q * (1 - f - t));
        var be = s1 * q * f >= minFee ? s1 : (cost + minFee) / (q * (1 - t));
        be = Math.ceil(be * 100 - 1e-6) / 100;
        /* first price on the exchange's tick grid at or above break-even */
        var sp = p,
          steps = 0;
        while (sp < be - 1e-9 && steps < 400) {
          var tk = tick(sp, k);
          sp = W.round(Math.floor(sp / tk + 1e-9) * tk + tk, 2);
          steps++;
        }
        return { p: p, q: q, k: k, f: f, t: t, minFee: minFee, amt: amt, fb: fb, fs: fs, tax: tax, tot: fb + fs + tax, be: be, sp: sp, steps: steps, minHit: amt * f < minFee };
      }
      function update() {
        var c = calc();
        var feeTxt = function (fee) {
          return c.minHit ? "按費率只要 " + fmt.num(Math.floor(c.amt * c.f), 0) + " 元，未達最低收 " + c.minFee + " 元" : "成交金額 × 0.1425% × " + tn(disc.get(), 1) + " 折";
        };
        ro.update({
          fb: { v: fmt.num(c.fb) + " 元", s: feeTxt() },
          fs: { v: fmt.num(c.fs) + " 元", s: "假設用同樣價格賣出" },
          tax: { v: fmt.num(c.tax) + " 元", s: "賣出金額 × " + tn(c.t * 100, 2) + "%" + (c.k === "daytrade" ? "（當沖減半）" : c.k === "etf" ? "（ETF）" : "") },
          tot: { v: fmt.num(c.tot) + " 元", s: "占成交金額 " + fmt.pct(c.tot / c.amt, 2) + "（" + fmt.num(c.amt) + " 元）" },
          be: {
            v: fmt.num(c.be, 2) + " 元",
            s: "要漲 " + fmt.pct(c.be / c.p - 1, 2, true) + (c.steps ? "；依升降單位要賣到 " + tn(c.sp, 2) + " 元（" + c.steps + " 檔）" : ""),
            tone: "up",
          },
        });
        var pct = c.tot / c.amt;
        var taxShare = c.tax / c.tot;
        var parts = [];
        if (c.minHit) {
          parts.push("<b>成交金額只有 " + fmt.num(c.amt) + " 元，手續費被最低收費墊高。</b>按費率買進只要 " + fmt.num(Math.floor(c.amt * c.f)) + " 元，卻收 " + c.minFee + " 元，來回成本變成 " + fmt.pct(pct, 2) + "，股價要漲這麼多才打平。");
          if (c.minFee === 20 && c.q < 1000) parts.push("零股交易很多券商最低收 1 元，可以切換看看差多少。");
        } else {
          parts.push("<b>來回成本約 " + fmt.pct(pct, 2) + "：</b>買、賣手續費各 " + fmt.pct(c.f, 4) + "，加上賣出的證交稅 " + tn(c.t * 100, 2) + "%。證交稅占了總成本的 " + fmt.pct(taxShare, 0) + "，而且不打折，所以折扣只能省到手續費。");
          if (c.k === "stock") parts.push("計畫寫的「來回手續費加證交稅約 0.4–0.6%」，就是從 2.8 折到不打折的範圍。");
          if (c.k === "daytrade") parts.push("現股當沖的證交稅減半為 0.15%，但當沖要在當天了結，成本低不代表風險低。");
          if (c.k === "etf") parts.push("股票型 ETF 的證交稅是 0.1%，比個股的 0.3% 低。");
        }
        vd.set(pct > 0.01 ? "alert" : pct > 0.006 ? "warn" : "good", parts.join(""));
        ch.redraw();
      }
      function draw(svg, w, H) {
        var c = calc(),
          narrow = w < 520;
        svg.setAttribute("aria-label", "來回總成本 " + c.tot + " 元的組成：買進手續費 " + c.fb + " 元、賣出手續費 " + c.fs + " 元、證交稅 " + c.tax + " 元");
        T(svg, 0, 13, "來回總成本 " + fmt.num(c.tot) + " 元由這三筆組成", { fill: "var(--ink-2)" });
        var segs = [
          { k: "買進手續費", v: c.fb, c: "var(--cat-1)" },
          { k: "賣出手續費", v: c.fs, c: "var(--cat-3)" },
          { k: "證交稅", v: c.tax, c: "var(--cat-2)" },
        ];
        var tot = c.tot || 1,
          x0 = 0,
          bw = w - 2,
          gap = 2;
        var live = segs.filter(function (g) {
          return g.v > 0;
        });
        var avail = bw - gap * Math.max(0, live.length - 1);
        live.forEach(function (g, i) {
          var ww = Math.max(2, (g.v / tot) * avail);
          svg.appendChild(s("rect", { x: x0, y: 24, width: ww, height: 22, rx: 2, fill: g.c }));
          x0 += ww + gap;
        });
        var lx = 0,
          ly = 70;
        segs.forEach(function (g) {
          var label = g.k + " " + fmt.num(g.v) + " 元（" + fmt.pct(g.v / tot, 0) + "）";
          var wd = 16 + tw(label, 12) + 18;
          if (narrow) {
            if (lx > 0) {
              lx = 0;
              ly += 22;
            }
          } else if (lx + wd > w) {
            lx = 0;
            ly += 22;
          }
          svg.appendChild(s("rect", { x: lx, y: ly - 10, width: 10, height: 10, rx: 2, fill: g.c }));
          T(svg, lx + 16, ly, g.k + " ", { fill: "var(--ink-2)" });
          T(svg, lx + 16 + tw(g.k + " ", 12), ly, fmt.num(g.v) + " 元（" + fmt.pct(g.v / tot, 0) + "）", { class: "mono", style: "font-size:12px;fill:var(--ink)" });
          lx += wd;
        });
      }
      update();
    },
  });

  /* ======================================================================
     pointpct — 點數與百分比
     ====================================================================== */
  HB.defineWidget("pointpct", {
    title: "點數與百分比：同樣跌 1,656 點，意義不同",
    init: function (body, cfg) {
      var Y23 = 17930.81,
        Y24 = 23035.1,
        Y25 = 28963.6;
      var lvIn = W.number({ label: "前一日收盤（加權指數）", suffix: "點", value: opt(cfg, "level", 48000, 1, 1e7), step: 100, min: 1, onInput: update });
      var ptIn = W.number({ label: "漲跌點數（下跌輸入負數）", suffix: "點", value: opt(cfg, "points", -1656, -1e7, 1e7), step: 10, onInput: update });
      body.appendChild(h("div", { class: "w-controls" }, [lvIn.el, ptIn.el]));
      var ro = W.readout([
        { key: "pct", k: "漲跌幅" },
        { key: "y23", k: "同樣百分比，在 2023 年底" },
        { key: "y24", k: "同樣百分比，在 2024 年底" },
        { key: "same", k: "同樣點數，在 2024 年底" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, 210, draw);
      defaultNote(body, cfg, "年底收盤：2023 年 17,930.81 點、2024 年 23,035.10 點、2025 年 28,963.60 點（取自計畫文件）；「目前」是你輸入的前一日收盤（預設 48,000 點為示意）。");

      function vals() {
        var lv = Math.max(1, lvIn.get());
        var pts = ptIn.get();
        return { lv: lv, pts: pts, pct: pts / lv };
      }
      function update() {
        var v = vals();
        var tone = v.pct > 0 ? "up" : v.pct < 0 ? "down" : "";
        ro.update({
          pct: { v: fmt.pct(v.pct, 2, true), s: fmt.signed(v.pts) + " 點 ÷ " + fmt.num(v.lv) + " 點", tone: tone },
          y23: { v: fmt.signed(v.pct * Y23) + " 點", s: "17,930.81 點 × " + fmt.pct(v.pct, 2, true), tone: tone },
          y24: { v: fmt.signed(v.pct * Y24) + " 點", s: "23,035.10 點 × " + fmt.pct(v.pct, 2, true), tone: tone },
          same: { v: fmt.pct(v.pts / Y24, 2, true), s: fmt.signed(v.pts) + " 點 ÷ 23,035.10 點", tone: tone },
        });
        if (v.pts === 0) {
          vd.set("", "點數是 0：輸入一個漲跌點數，例如 −1,656。");
        } else {
          var word = v.pts < 0 ? "跌" : "漲";
          var big = Math.abs(v.pct) >= 0.03;
          vd.set(
            big ? "alert" : "",
            "<b>指數越高，同樣的百分比代表越多點；比較急跌要看百分比，不是點數。</b>這次" + word + " " + fmt.num(Math.abs(v.pts)) + " 點是 " + fmt.pct(v.pct, 2, true) + "；同樣的幅度放在 2023 年底只是 " + fmt.signed(v.pct * Y23) + " 點。反過來說，同樣 " + fmt.num(Math.abs(v.pts)) + " 點在 2024 年底的 23,035 點會是 " + fmt.pct(v.pts / Y24, 2, true) + "。" + (big ? "單日" + word + "超過 3%，已經是很大的波動。" : "")
          );
        }
        ch.redraw();
      }
      function draw(svg, w, H) {
        var v = vals(),
          narrow = w < 480;
        var rows = [
          { k: "2023 年底", lv: Y23 },
          { k: "2024 年底", lv: Y24 },
          { k: "2025 年底", lv: Y25 },
          { k: "目前", lv: v.lv, cur: true },
        ];
        var m = { l: narrow ? 74 : 92, r: 72, t: 30, b: 4 };
        var maxPts = 1;
        rows.forEach(function (r) {
          r.p = v.pct * r.lv;
          maxPts = Math.max(maxPts, Math.abs(r.p));
        });
        var x = W.scale(0, maxPts, m.l, w - m.r);
        var rowH = (H - m.t - m.b) / rows.length;
        svg.setAttribute("aria-label", "同樣 " + fmt.pct(v.pct, 2, true) + " 在四個指數水準換算成的點數");
        T(svg, 0, 14, "同樣 " + fmt.pct(v.pct, 2, true) + "，換算成點數：", { fill: "var(--ink-2)" });
        L(svg, m.l, m.t - 4, m.l, H - m.b, { class: "axis" });
        var col = v.pct >= 0 ? "var(--up)" : "var(--down)";
        rows.forEach(function (r, i) {
          var yc = m.t + rowH * (i + 0.5);
          T(svg, m.l - 10, yc - 2, r.k, { "text-anchor": "end", fill: r.cur ? "var(--ink)" : "var(--ink-2)", "font-weight": r.cur ? 700 : 400 });
          T(svg, m.l - 10, yc + 12, fmt.num(r.lv, 0) + " 點", { "text-anchor": "end", class: "mono" });
          P(svg, hbar(m.l, x(Math.abs(r.p)), yc, 18, 4), { fill: col, opacity: r.cur ? 1 : 0.55 });
          T(svg, x(Math.abs(r.p)) + 7, yc + 4, fmt.signed(r.p) + " 點", { class: "mono", style: "font-size:12px;fill:var(--ink)" + (r.cur ? ";font-weight:600" : "") });
        });
      }
      update();
    },
  });

  /* ======================================================================
     candle — K 棒解剖
     ====================================================================== */
  HB.defineWidget("candle", {
    title: "K 棒解剖：一根 K 棒的四個價格",
    init: function (body, cfg) {
      var st = {
        o: snap(opt(cfg, "open", 100, 50, 150), 0.5),
        hi: snap(opt(cfg, "high", 108, 50, 150), 0.5),
        lo: snap(opt(cfg, "low", 96, 50, 150), 0.5),
        c: snap(opt(cfg, "close", 105, 50, 150), 0.5),
      };
      st.hi = Math.max(st.hi, st.o, st.c);
      st.lo = Math.min(st.lo, st.o, st.c);
      var sl = {};
      function pf(v) {
        return tn(v, 1);
      }
      function mk(key, label) {
        return W.slider({
          label: label,
          min: 50,
          max: 150,
          step: 0.5,
          value: st[key],
          fmt: pf,
          onInput: function (v) {
            st[key] = clamp(fin(v, st[key]), 50, 150);
            fix(key);
            update();
          },
        });
      }
      sl.o = mk("o", "開盤價");
      sl.hi = mk("hi", "最高價");
      sl.lo = mk("lo", "最低價");
      sl.c = mk("c", "收盤價");
      body.appendChild(h("div", { class: "w-controls" }, [sl.o.el, sl.hi.el, sl.lo.el, sl.c.el]));
      var ro = W.readout([
        { key: "chg", k: "漲跌（收盤 − 開盤）" },
        { key: "body", k: "實體長度" },
        { key: "up", k: "上影線" },
        { key: "dn", k: "下影線" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(
        body,
        function (w) {
          return w < 480 ? 290 : 310;
        },
        draw
      );
      defaultNote(body, cfg, "台股慣例：收盤高於開盤是紅K、低於開盤是黑K（多半畫成綠色），比的是同一天的開盤價，不是昨天的收盤價。單根 K 棒只描述一天，判讀要搭配位置與成交量。");
      doc.addEventListener("hb:theme", update);

      function fix(k) {
        if (k === "hi") {
          st.o = Math.min(st.o, st.hi);
          st.c = Math.min(st.c, st.hi);
          st.lo = Math.min(st.lo, st.o, st.c);
        } else if (k === "lo") {
          st.o = Math.max(st.o, st.lo);
          st.c = Math.max(st.c, st.lo);
          st.hi = Math.max(st.hi, st.o, st.c);
        } else {
          st.hi = Math.max(st.hi, st.o, st.c);
          st.lo = Math.min(st.lo, st.o, st.c);
        }
        ["o", "hi", "lo", "c"].forEach(function (q) {
          if (q !== k) sl[q].set(st[q]);
        });
      }
      function parts() {
        var top = Math.max(st.o, st.c),
          bot = Math.min(st.o, st.c);
        return { range: st.hi - st.lo, body: top - bot, up: st.hi - top, dn: bot - st.lo, dir: st.c > st.o ? 1 : st.c < st.o ? -1 : 0, top: top, bot: bot };
      }
      function names() {
        var intl = isIntl();
        return { up: intl ? "陽線（台灣稱紅K）" : "紅K", dn: intl ? "陰線（台灣稱黑K）" : "黑K", longUp: intl ? "長陽線（台灣稱長紅K）" : "長紅K", longDn: intl ? "長陰線（台灣稱長黑K）" : "長黑K" };
      }
      function update() {
        var p = parts(),
          nm = names();
        var rangeTxt = function (x) {
          return p.range > 0 ? "占全天振幅 " + fmt.pct(x / p.range, 0) : "全天沒有振幅";
        };
        ro.update({
          chg: { v: fmt.signed(st.c - st.o, 1) + "（" + fmt.pct((st.c - st.o) / st.o, 1, true) + "）", s: p.dir > 0 ? nm.up + "：收盤高於開盤" : p.dir < 0 ? nm.dn + "：收盤低於開盤" : "收盤＝開盤", tone: p.dir > 0 ? "up" : p.dir < 0 ? "down" : "" },
          body: { v: tn(p.body, 1), s: rangeTxt(p.body) + "（振幅 " + tn(p.range, 1) + "）" },
          up: { v: tn(p.up, 1), s: p.body > 0 && p.up > 0 ? "是實體的 " + fmt.num(p.up / p.body, 1) + " 倍" : "最高價 − 實體上緣" },
          dn: { v: tn(p.dn, 1), s: p.body > 0 && p.dn > 0 ? "是實體的 " + fmt.num(p.dn / p.body, 1) + " 倍" : "實體下緣 − 最低價" },
        });
        var bodyPct = p.range > 0 ? fmt.pct(p.body / p.range, 0) : "0%";
        if (p.range <= 0) vd.set("", "<b>一字線：</b>開盤、最高、最低、收盤都一樣，整天價格沒動（台股常見於漲停或跌停一開盤就鎖住）。");
        else if (p.body <= 0.1 * p.range) {
          var extra = p.up >= 0.6 * p.range ? "上影線特別長，高檔賣壓明顯（墓碑十字）。" : p.dn >= 0.6 * p.range ? "下影線特別長，低檔有買盤（蜻蜓十字）。" : "";
          vd.set("warn", "<b>十字線：</b>開盤和收盤幾乎一樣，實體只占振幅 " + bodyPct + "。多空拉鋸、勢均力敵。" + extra + "出現在一段大漲或大跌之後，常被當成趨勢可能轉折的提醒，但要等後面的 K 棒確認。");
        } else if (p.body >= 0.6 * p.range) {
          if (p.dir > 0) vd.set("good", "<b>" + nm.longUp + "：</b>收盤比開盤高 " + tn(p.body, 1) + "，實體占振幅 " + bodyPct + "。買方從開盤一路主導到收盤，力道強。");
          else vd.set("bad", "<b>" + nm.longDn + "：</b>收盤比開盤低 " + tn(p.body, 1) + "，實體占振幅 " + bodyPct + "。賣方一路主導到收盤，力道強。");
        } else if (p.up >= 2 * p.body && p.dn >= 2 * p.body) {
          vd.set("warn", "<b>上下影線都長（紡錘線）：</b>盤中上沖下洗，最後收在中間附近。多空激烈拉鋸，方向還不明確。");
        } else if (p.up >= 2 * p.body) {
          vd.set("alert", "<b>長上影線：上方賣壓。</b>盤中一度漲到 " + tn(st.hi, 1) + "，收盤卻被壓回 " + tn(st.c, 1) + "，上影線是實體的 " + fmt.num(p.up / p.body, 1) + " 倍。代表高檔有人在賣，買方追不上去。");
        } else if (p.dn >= 2 * p.body) {
          vd.set("good", "<b>長下影線：下方有買盤承接。</b>盤中一度跌到 " + tn(st.lo, 1) + "，收盤拉回 " + tn(st.c, 1) + "，下影線是實體的 " + fmt.num(p.dn / p.body, 1) + " 倍。代表低檔有人願意買。");
        } else {
          vd.set("", "<b>一般" + (p.dir > 0 ? nm.up : nm.dn) + "：</b>收盤" + (p.dir > 0 ? "高" : "低") + "於開盤 " + tn(p.body, 1) + "，實體占振幅 " + bodyPct + "，影線不算特別長，沒有明顯的訊號。試著把最高價拉高、收盤拉回開盤附近，看看「長上影線」。");
        }
        ch.redraw();
      }
      function draw(svg, w, H) {
        var p = parts(),
          narrow = w < 480;
        var pad = Math.max(p.range * 0.1, 0.8);
        var m = { t: 18, b: 18 };
        var y = W.scale(st.lo - pad, st.hi + pad, H - m.b, m.t);
        var cx = Math.round(w * (narrow ? 0.47 : 0.5));
        var bw = clamp(Math.round(w * 0.16), 42, 78);
        var col = p.dir > 0 ? "var(--up)" : p.dir < 0 ? "var(--down)" : "var(--ink-2)";
        svg.setAttribute("aria-label", "K 棒：開盤 " + st.o + "、最高 " + st.hi + "、最低 " + st.lo + "、收盤 " + st.c);
        /* faint price guides */
        [st.hi, p.top, p.bot, st.lo].forEach(function (v) {
          L(svg, cx - bw / 2 - 18, y(v), cx + bw / 2 + 4, y(v), { stroke: "var(--rule-2)", "stroke-width": 1 });
        });
        /* wick + body */
        L(svg, cx, y(st.hi), cx, y(st.lo), { stroke: col, "stroke-width": 2, "stroke-linecap": "round" });
        if (p.body > 0) svg.appendChild(s("rect", { x: cx - bw / 2, y: y(p.top), width: bw, height: Math.max(2, y(p.bot) - y(p.top)), fill: col, rx: 1.5 }));
        else L(svg, cx - bw / 2, y(st.o), cx + bw / 2, y(st.o), { stroke: col, "stroke-width": 2.5, "stroke-linecap": "round" });

        /* left: price labels with leader lines */
        var lx = cx - bw / 2 - 26;
        var left = [{ y: y(st.hi), t: "最高價", v: st.hi, ax: p.up > 0 ? cx - 4 : cx - bw / 2 - 3 }];
        if (p.body > 0) {
          left.push({ y: y(st.c), t: "收盤價", v: st.c, ax: cx - bw / 2 - 3 });
          left.push({ y: y(st.o), t: "開盤價", v: st.o, ax: cx - bw / 2 - 3 });
        } else left.push({ y: y(st.o), t: "開盤＝收盤", v: st.o, ax: cx - bw / 2 - 3 });
        left.push({ y: y(st.lo), t: "最低價", v: st.lo, ax: p.dn > 0 ? cx - 4 : cx - bw / 2 - 3 });
        left.forEach(function (it, i) {
          it.ord = i;
        });
        spread(left, 19, 10, H - 6);
        left.forEach(function (it) {
          var pts = [[lx + 4, it.ly], [Math.min(it.ax, lx + 14), it.ly], [it.ax, it.y]];
          if (Math.abs(it.ly - it.y) < 0.5) pts = [[lx + 4, it.y], [it.ax, it.y]];
          P(svg, W.linePath(pts), { stroke: "var(--ink-3)", "stroke-width": 1, fill: "none" });
          svg.appendChild(s("circle", { cx: it.ax, cy: it.y, r: 2, fill: "var(--ink-3)" }));
          var val = tn(it.v, 1);
          T(svg, lx, it.ly + 4, val, { "text-anchor": "end", class: "mono", style: "font-size:12px;fill:var(--ink);font-weight:600" });
          T(svg, lx - tw(val, 12) - 6, it.ly + 4, it.t, { "text-anchor": "end", fill: "var(--ink-2)", "font-size": narrow ? 12 : 13 });
        });
        /* right: brackets for upper shadow / body / lower shadow */
        var bx = cx + bw / 2 + 16;
        var segs = [
          { a: st.hi, b: p.top, t: "上影線", v: p.up },
          { a: p.top, b: p.bot, t: "實體", v: p.body, strong: true },
          { a: p.bot, b: st.lo, t: "下影線", v: p.dn },
        ];
        segs.forEach(function (g) {
          var ya = y(g.a),
            yb = y(g.b);
          g.y = (ya + yb) / 2;
          if (yb - ya >= 6) {
            P(svg, "M" + (bx - 4) + " " + (ya + 1.5) + "H" + bx + "V" + (yb - 1.5) + "H" + (bx - 4), { stroke: "var(--ink-3)", "stroke-width": 1, fill: "none" });
          } else {
            L(svg, bx - 4, g.y, bx, g.y, { stroke: "var(--ink-3)", "stroke-width": 1 });
          }
        });
        spread(segs, 19, 10, H - 6);
        segs.forEach(function (g) {
          if (Math.abs(g.ly - g.y) > 0.5) P(svg, "M" + bx + " " + g.y + "L" + (bx + 8) + " " + g.ly, { stroke: "var(--ink-3)", "stroke-width": 1, fill: "none" });
          T(svg, bx + 10, g.ly + 4, g.t + " ", { fill: g.strong ? "var(--ink)" : "var(--ink-2)", "font-weight": g.strong ? 700 : 400, "font-size": narrow ? 12 : 13 });
          T(svg, bx + 10 + tw(g.t + " ", narrow ? 12 : 13), g.ly + 4, tn(g.v, 1), { class: "mono", style: "font-size:12px;fill:var(--ink)" });
        });
      }
      update();
    },
  });

  /* ======================================================================
     ma — 均線（示意走勢）
     ====================================================================== */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* Illustrative closes: warm-up (60 days) + `days` visible days. Shape:
     up-trend → top → slide → sharp drop below the 20-day line → rebound that
     stalls just under a falling 20-day line. Deterministic (seed 7). */
  function maSeries(days) {
    var v0 = 60,
      N = days + v0,
      rnd = mulberry32(7);
    var topI = Math.min(v0 + days * 0.55, N - 1 - 34),
      upI = Math.min(v0 + days * 0.4, topI - 6);
    var A = [
      [0, 84],
      [v0, 92],
      [upI, 117],
      [topI, 121],
      [N - 1 - 22, 113.5],
      [N - 1 - 11, 100],
      [N - 1 - 4, 103.6],
      [N - 1, 101.9],
    ];
    var out = [],
      noise = 0;
    for (var i = 0; i < N; i++) {
      var k = 0;
      while (k < A.length - 2 && i > A[k + 1][0]) k++;
      var a = A[k],
        b = A[k + 1];
      var u = clamp((i - a[0]) / (b[0] - a[0]), 0, 1);
      var e = (1 - Math.cos(Math.PI * u)) / 2;
      var base = a[1] + (b[1] - a[1]) * e;
      var z = Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
      noise = 0.55 * noise + 0.011 * z;
      out.push(W.round(base * Math.exp(noise * Math.min(1, (N - 1 - i) / 6)), 2));
    }
    return { close: out, v0: v0 };
  }
  HB.defineWidget("ma", {
    title: "均線：站上、跌破與反彈遇壓（示意走勢）",
    init: function (body, cfg) {
      var days = Math.round(opt(cfg, "days", 120, 60, 250));
      var data = maSeries(days);
      var cl = data.close,
        v0 = data.v0,
        N = cl.length;
      var SPEC = [
        { n: 5, name: "5日", long: "5 日線", c: "var(--cat-4)" },
        { n: 10, name: "10日", long: "10 日線", c: "var(--cat-1)" },
        { n: 20, name: "月線", long: "月線（20 日）", c: "var(--cat-2)" },
        { n: 60, name: "季線", long: "季線（60 日）", c: "var(--cat-3)" },
      ];
      var MA = {};
      SPEC.forEach(function (sp) {
        var arr = [],
          sum = 0;
        for (var i = 0; i < N; i++) {
          sum += cl[i];
          if (i >= sp.n) sum -= cl[i - sp.n];
          arr.push(i >= sp.n - 1 ? sum / sp.n : NaN);
        }
        MA[sp.n] = arr;
      });
      var show = {};
      String(cfg.show === undefined ? "10,20,60" : cfg.show)
        .split(/[,\s]+/)
        .forEach(function (t) {
          var n = parseInt(t, 10);
          if (MA[n]) show[n] = true;
        });
      var chips = h("div", { class: "seg", role: "group", "aria-label": "顯示哪些均線" });
      SPEC.forEach(function (sp) {
        var b = h("button", { type: "button", "aria-pressed": String(!!show[sp.n]) }, [h("span", { class: "key-dot", style: "--c:" + sp.c + ";border-radius:50%" }), sp.long]);
        b.addEventListener("click", function () {
          show[sp.n] = !show[sp.n];
          b.setAttribute("aria-pressed", String(!!show[sp.n]));
          ch.redraw();
        });
        chips.appendChild(b);
      });
      body.appendChild(h("div", { class: "w-controls" }, [h("div", { class: "w-field" }, [h("span", { class: "w-label" }, [h("span", { text: "顯示均線（可複選）" }), h("span", { class: "w-val", text: "點圖看任一天" })]), chips])]));
      var ro = W.readout([
        { key: "close", k: "收盤" },
        { key: "m10", k: "對 10 日線" },
        { key: "m20", k: "對月線（20 日）" },
        { key: "m60", k: "對季線（60 日）" },
        { key: "dir", k: "均線方向（近 5 天）" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var sel = null;
      var geo = null;
      var ch = W.chart(
        body,
        function (w) {
          return w < 480 ? 256 : 300;
        },
        draw
      );
      bindPointer(ch, {
        cursor: "crosshair",
        hover: pick,
        press: pick,
        leave: function () {
          if (sel !== null) {
            sel = null;
            refresh();
          }
        },
      });
      defaultNote(body, cfg, "示意走勢，非真實股價。均線＝最近 N 天收盤價的平均，可以看成這段期間買進者的平均成本；月線約 20 個交易日、季線約 60 個交易日。");

      function pick(p) {
        if (!geo) return;
        var d = Math.round(clamp(geo.x.invert(p.x), 1, days));
        var i = v0 + d - 1;
        if (i === sel) return;
        sel = i === N - 1 ? null : i;
        refresh();
      }
      function slope(n, i) {
        var a = MA[n][i],
          b = MA[n][i - 5];
        var r = a / b - 1;
        return { r: r, dir: r > 0.002 ? "上彎" : r < -0.002 ? "下彎" : "走平" };
      }
      function refresh() {
        var i = sel === null ? N - 1 : sel;
        var c = cl[i];
        var d = i - v0 + 1;
        function rel(n, name) {
          var mv = MA[n][i];
          var r = c / mv - 1;
          return { v: fmt.pct(r, 1, true), s: (r >= 0 ? "站上" : "跌破") + name + "（" + fmt.num(mv, 1) + "）", tone: r > 0 ? "up" : r < 0 ? "down" : "" };
        }
        var s10 = slope(10, i),
          s20 = slope(20, i),
          s60 = slope(60, i);
        ro.update({
          close: { v: fmt.num(c, 1), s: "第 " + d + " 天" + (sel === null ? "（最後一天）" : "") },
          m10: rel(10, " 10 日線"),
          m20: rel(20, "月線"),
          m60: rel(60, "季線"),
          dir: { v: "月線" + s20.dir, s: "10 日線" + s10.dir + "、季線" + s60.dir },
        });
        var r20 = c / MA[20][i] - 1,
          r60 = c / MA[60][i] - 1;
        var up20 = s20.dir === "上彎",
          dn20 = s20.dir === "下彎";
        var t, tone;
        if (r20 >= 0 && !dn20) {
          tone = "good";
          t = "<b>站上月線、月線" + s20.dir + "：</b>短期趨勢向上。拉回到月線附近時，常有買盤在這裡出現（支撐）。";
        } else if (r20 >= 0) {
          tone = "warn";
          t = "<b>站上月線，但月線還在下彎：</b>這是反彈，還不算轉強。要等月線走平、翻揚，趨勢才比較確定。";
        } else if (!dn20) {
          tone = "warn";
          t = "<b>跌破月線，但月線還" + s20.dir + "：</b>可能只是漲多拉回，觀察能不能很快站回月線。";
        } else if (r20 > -0.035) {
          tone = "alert";
          t = "<b>反彈遇壓、均線下彎：</b>股價反彈到下彎的月線下方 " + fmt.pct(-r20, 1) + " 就停住。月線下彎代表最近 20 天買進的人平均是虧損的，股價接近他們的成本時，容易出現「解套就賣」的賣壓。";
        } else {
          tone = "bad";
          t = "<b>跌破月線、月線下彎：</b>收盤在月線下方 " + fmt.pct(-r20, 1) + "，短期趨勢向下。";
        }
        t += "股價在季線" + (r60 >= 0 ? "之上" : "之下") + " " + fmt.pct(Math.abs(r60), 1) + "，季線" + s60.dir + (r60 < 0 && s60.dir !== "上彎" ? "：中期也轉弱。" : r60 < 0 ? "：中期趨勢還沒被破壞，但已經跌破。" : "。");
        vd.set(tone, t);
        ch.redraw();
      }
      function draw(svg, w, H) {
        var narrow = w < 480;
        var m = { l: 40, r: 50, t: 26, b: 26 };
        var lo = Infinity,
          hi = -Infinity;
        for (var i = v0; i < N; i++) {
          lo = Math.min(lo, cl[i]);
          hi = Math.max(hi, cl[i]);
          SPEC.forEach(function (sp) {
            if (show[sp.n] && isFinite(MA[sp.n][i])) {
              lo = Math.min(lo, MA[sp.n][i]);
              hi = Math.max(hi, MA[sp.n][i]);
            }
          });
        }
        var dom = nice(lo - 1, hi + 1, narrow ? 4 : 5);
        var x = W.scale(1, days, m.l, w - m.r),
          y = W.scale(dom.lo, dom.hi, H - m.b, m.t);
        geo = { x: x, y: y };
        svg.setAttribute("aria-label", "示意股價走勢與均線：上漲、做頭、跌破月線，反彈到下彎的月線附近停住");
        W.gridY(svg, y, dom.ticks, m.l, w - m.r, function (v) {
          return tn(v, 1);
        });
        var xt = W.ticks(1, days, narrow ? 3 : 5).filter(function (v) {
          return v >= 1;
        });
        W.labelsX(svg, x, xt, H - m.b + 18, function (v) {
          return "第 " + v + " 天";
        });
        T(svg, m.l, 14, "示意走勢，非真實股價", { "font-size": 11, fill: "var(--ink-3)" });
        function path(arr) {
          var pts = [];
          for (var i = v0; i < N; i++) if (isFinite(arr[i])) pts.push([x(i - v0 + 1), y(arr[i])]);
          return W.linePath(pts);
        }
        var ends = [];
        SPEC.slice()
          .reverse()
          .forEach(function (sp) {
            if (!show[sp.n]) return;
            P(svg, path(MA[sp.n]), stroke(sp.c, 2));
            ends.push({ y: y(MA[sp.n][N - 1]), t: sp.name, c: sp.c });
          });
        P(svg, path(cl), stroke("var(--ink)", 1.6));
        ends.push({ y: y(cl[N - 1]), t: "收盤", c: "var(--ink)", strong: true });
        /* annotations: first close under the 20-day line after the top, and the stall */
        var top = v0;
        for (i = v0; i < N; i++) if (cl[i] > cl[top]) top = i;
        var cross = -1;
        for (i = top; i < N; i++)
          if (cl[i] < MA[20][i]) {
            cross = i;
            break;
          }
        if (cross > 0 && show[20]) {
          var ax = x(cross - v0 + 1),
            ay = y(cl[cross]);
          svg.appendChild(s("circle", { cx: ax, cy: ay, r: 6, fill: "none", stroke: "var(--ink)", "stroke-width": 1.5 }));
          L(svg, ax, ay + 7, ax, ay + 26, { stroke: "var(--ink-3)", "stroke-width": 1 });
          T(svg, ax, ay + 39, "跌破月線", { "text-anchor": "middle", "font-size": 12, fill: "var(--ink)", "font-weight": 700 });
        }
        var last = N - 1;
        if (show[20] && cl[last] < MA[20][last] && slope(20, last).dir === "下彎") {
          var ly = Math.min(y(MA[20][last]), y(cl[last])) - 30;
          var lxp = x(days - 7);
          L(svg, lxp, ly + 4, lxp, ly + 22, { stroke: "var(--ink-3)", "stroke-width": 1 });
          T(svg, lxp + 4, ly - 2, "反彈遇壓", { "text-anchor": "end", "font-size": 12, fill: "var(--ink)", "font-weight": 700 });
        }
        /* end labels with a colour key, spread to avoid collisions */
        spread(ends, 15, m.t, H - m.b);
        ends.forEach(function (e) {
          var ex = w - m.r + 4;
          if (Math.abs(e.ly - e.y) > 0.5) P(svg, "M" + (w - m.r + 1) + " " + e.y + "L" + (ex + 4) + " " + e.ly, { stroke: "var(--rule)", "stroke-width": 1, fill: "none" });
          L(svg, ex + 4, e.ly, ex + 12, e.ly, stroke(e.c, 2));
          T(svg, ex + 15, e.ly + 4, e.t, { "font-size": 11, fill: e.strong ? "var(--ink)" : "var(--ink-2)", "font-weight": e.strong ? 700 : 400 });
        });
        /* crosshair */
        var ci = sel === null ? N - 1 : sel;
        var cxp = x(ci - v0 + 1);
        L(svg, cxp, m.t, cxp, H - m.b, { stroke: "var(--ink)", "stroke-width": 1, opacity: sel === null ? 0.18 : 0.4 });
        SPEC.forEach(function (sp) {
          if (show[sp.n]) dot(svg, cxp, y(MA[sp.n][ci]), sp.c, 3.5);
        });
        dot(svg, cxp, y(cl[ci]), "var(--ink)", 4.5);
      }
      refresh();
    },
  });

  /* ======================================================================
     pe — 本益比
     ====================================================================== */
  HB.defineWidget("pe", {
    title: "本益比：股價＝EPS × 本益比",
    init: function (body, cfg) {
      var eps0 = opt(cfg, "eps", 150, 0.01, 1e5);
      var part = String(cfg.part) === "2" ? 2 : 1;
      var partSeg = W.seg({
        label: "看哪一部分",
        options: [
          [1, "① 股價＝EPS × 本益比"],
          [2, "② 明年：EPS 成長 vs 本益比"],
        ],
        value: part,
        onChange: function (v) {
          part = v;
          p1.hidden = part !== 1;
          p2.hidden = part !== 2;
          ch1.redraw();
          ch2.redraw();
        },
      });
      body.appendChild(partSeg.el);
      var p1 = h("div", { style: "display:grid;gap:1rem;min-width:0" });
      var p2 = h("div", { style: "display:grid;gap:1rem;min-width:0" });
      body.appendChild(p1);
      body.appendChild(p2);

      /* part 1 */
      var epsIn = W.number({ label: "EPS（每股盈餘）", suffix: "元", value: eps0, step: 1, min: 0.01, onInput: update1 });
      var peSl = W.slider({ label: "本益比", min: 5, max: 60, step: 0.5, value: snap(opt(cfg, "pe", 16, 5, 60), 0.5), fmt: function (v) { return tn(v, 1) + " 倍"; }, onInput: update1 });
      p1.appendChild(h("div", { class: "w-controls" }, [epsIn.el, peSl.el]));
      var ro1 = W.readout([
        { key: "px", k: "股價" },
        { key: "ey", k: "盈餘殖利率（EPS ÷ 股價）" },
        { key: "yrs", k: "獲利不變時，幾年賺回股價" },
      ]);
      p1.appendChild(ro1.el);
      var vd1 = W.verdict();
      p1.appendChild(vd1.el);
      var ch1 = W.chart(p1, function (w) { return w < 480 ? 240 : 260; }, draw1);

      /* part 2 */
      var pe1Sl = W.slider({ label: "今年本益比", min: 5, max: 60, step: 0.5, value: snap(opt(cfg, "pe1", 26, 5, 60), 0.5), fmt: function (v) { return tn(v, 1) + " 倍"; }, onInput: update2 });
      var gSl = W.slider({ label: "明年 EPS 成長", min: -30, max: 80, step: 1, value: Math.round(opt(cfg, "growth", 30, -30, 80)), fmt: function (v) { return fmt.pct(v / 100, 0, true); }, onInput: update2 });
      var pe2Sl = W.slider({ label: "明年本益比", min: 5, max: 60, step: 0.5, value: snap(opt(cfg, "pe2", 20, 5, 60), 0.5), fmt: function (v) { return tn(v, 1) + " 倍"; }, onInput: update2 });
      p2.appendChild(h("div", { class: "w-controls" }, [pe1Sl.el, gSl.el, pe2Sl.el]));
      var ro2 = W.readout([
        { key: "chg", k: "明年股價變動" },
        { key: "eps", k: "EPS 的貢獻" },
        { key: "pe", k: "本益比變化" },
        { key: "be", k: "股價不跌的最低本益比" },
      ]);
      p2.appendChild(ro2.el);
      var vd2 = W.verdict();
      p2.appendChild(vd2.el);
      var ch2 = W.chart(p2, function (w) { return w < 480 ? 230 : 250; }, draw2);
      p1.hidden = part !== 1;
      p2.hidden = part !== 2;
      defaultNote(body, cfg, "本益比（P/E）＝股價 ÷ 每股盈餘（EPS）。這裡用「預估 EPS」示範，數字為教學用；實際本益比會因採用過去或預估 EPS 而不同。");

      function eps() {
        return Math.max(0.01, epsIn.get());
      }
      function update1() {
        var e = eps(),
          pe = clamp(peSl.get(), 5, 60),
          px = e * pe;
        ro1.update({
          px: { v: fmt.num(px, px < 100 ? 1 : 0) + " 元", s: fmt.num(e, e < 10 ? 2 : 0) + " 元 × " + tn(pe, 1) + " 倍" },
          ey: { v: fmt.pct(1 / pe, 2), s: "用股價「買到」的獲利率" },
          yrs: { v: tn(pe, 1) + " 年", s: "本益比的另一種讀法" },
        });
        var lvl =
          pe < 10
            ? "本益比偏低：可能被低估，也可能是市場預期獲利會衰退（景氣循環股在獲利高峰時常見）。"
            : pe <= 20
            ? "很多獲利穩定的大型股落在這個區間。"
            : pe <= 35
            ? "市場預期較高的成長；成長若不如預期，本益比容易被壓縮（切到②看看）。"
            : "非常高的期待：獲利要持續高速成長才撐得住這個價格。";
        var plan = Math.abs(e - 150) < 1e-9 && Math.abs(pe - 16) < 1e-9 ? "計畫以台積電 2027 年 EPS 約 150 元、約 16 倍本益比估算，股價約 2,400 元（參考價 2,420 元）。" : "";
        vd1.set(pe > 35 ? "warn" : "", "<b>本益比 " + tn(pe, 1) + " 倍＝市場願意用 " + tn(pe, 1) + " 年的獲利買這家公司。</b>" + lvl + "同一個 EPS，本益比從 16 倍變 26 倍，股價就差了六成多：本益比反映的是市場的期待與信心，不是公司多賺了錢。" + plan);
        ch1.redraw();
      }
      function calc2() {
        var g = clamp(gSl.get(), -30, 80) / 100,
          a = clamp(pe1Sl.get(), 5, 60),
          b = clamp(pe2Sl.get(), 5, 60);
        return { g: g, a: a, b: b, chg: (1 + g) * (b / a) - 1, peChg: b / a - 1, be: a / (1 + g) };
      }
      function update2() {
        var c = calc2(),
          e = eps();
        var p0 = e * c.a,
          p1v = e * (1 + c.g) * c.b;
        ro2.update({
          chg: { v: fmt.pct(c.chg, 1, true), s: "例：" + tn(e, 1) + " × " + tn(c.a, 1) + " 倍 → " + tn(e * (1 + c.g), 1) + " × " + tn(c.b, 1) + " 倍（" + fmt.num(p0) + " → " + fmt.num(p1v) + " 元）", tone: c.chg > 0.0005 ? "up" : c.chg < -0.0005 ? "down" : "" },
          eps: { v: fmt.pct(c.g, 0, true), s: "獲利帶動股價", tone: c.g > 0 ? "up" : c.g < 0 ? "down" : "" },
          pe: { v: fmt.pct(c.peChg, 1, true), s: tn(c.a, 1) + " 倍 → " + tn(c.b, 1) + " 倍", tone: c.peChg > 0 ? "up" : c.peChg < 0 ? "down" : "" },
          be: { v: fmt.num(c.be, 1) + " 倍", s: "明年本益比低於這個數字，股價就會下跌" },
        });
        var chg = fmt.pct(c.chg, 1, true),
          gp = fmt.pct(c.g, 0, true);
        var t, tone;
        if (c.g > 0 && c.b < c.a) {
          if (Math.abs(c.chg) < 0.02) {
            tone = "alert";
            t = "<b>EPS 成長被本益比壓縮抵銷。</b>獲利成長 " + gp + "，但市場願意給的本益比從 " + tn(c.a, 1) + " 倍降到 " + tn(c.b, 1) + " 倍，股價大約原地踏步（" + chg + "）。這是高本益比成長股常見的處境：成長早就先反映在股價裡了。";
          } else if (c.chg < 0) {
            tone = "bad";
            t = "<b>獲利成長 " + gp + "，股價卻 " + chg + "。</b>本益比壓縮得比獲利成長還多：好消息已經被提前買進，成長一放緩，市場就調降願意付的倍數。";
          } else {
            tone = "warn";
            t = "<b>成長贏過本益比壓縮，股價仍 " + chg + "，</b>但比 EPS 的 " + gp + " 少：一部分成長被本益比下修吃掉了。";
          }
        } else if (c.g > 0) {
          tone = "good";
          t = c.b > c.a ? "<b>戴維斯雙擊：EPS 成長 " + gp + "，本益比也上升，股價 " + chg + "。</b>獲利和市場信心一起往上，漲幅大於獲利成長；但這種組合不會永遠持續。" : "<b>本益比不變，股價跟著 EPS 同步成長（" + chg + "）。</b>";
        } else if (c.g < 0 && c.b < c.a) {
          tone = "bad";
          t = "<b>戴維斯雙殺：獲利衰退 " + gp + "，本益比也下降，股價 " + chg + "。</b>兩個因素一起往下，跌幅比獲利衰退更大。";
        } else if (c.g < 0) {
          tone = "warn";
          t = "<b>獲利衰退 " + gp + "，但本益比" + (c.b > c.a ? "上升" : "不變") + "，股價 " + chg + "。</b>市場可能預期明年獲利會回升；景氣循環股常見「獲利谷底時本益比反而最高」。";
        } else {
          tone = c.chg < 0 ? "warn" : "";
          t = "<b>EPS 持平，股價變動全部來自本益比（" + chg + "）。</b>";
        }
        vd2.set(tone, t);
        ch2.redraw();
      }
      function draw1(svg, w, H) {
        var e = eps(),
          pe = clamp(peSl.get(), 5, 60),
          narrow = w < 480;
        var m = { l: 44, r: 18, t: 28, b: 40 };
        var xd = nice(0, Math.max(eps0 * 2, e * 1.15), narrow ? 3 : 5);
        var x = W.scale(0, xd.hi, m.l, w - m.r),
          y = W.scale(0, 60, H - m.b, m.t);
        svg.setAttribute("aria-label", "矩形面積代表股價：寬是 EPS " + tn(e, 2) + " 元、高是本益比 " + tn(pe, 1) + " 倍，面積 " + fmt.num(e * pe) + " 元");
        W.gridY(svg, y, narrow ? [0, 20, 40, 60] : [0, 10, 20, 30, 40, 50, 60], m.l, w - m.r, function (v) {
          return v + "倍";
        });
        var ex = x(e);
        var ticks = xd.ticks.filter(function (v) {
          return Math.abs(x(v) - ex) > 34;
        });
        W.labelsX(svg, x, ticks, H - m.b + 16, function (v) {
          return tn(v, 2);
        });
        T(svg, 0, 12, "本益比（倍）", { "font-size": 11, fill: "var(--ink-3)" });
        T(svg, w - m.r, H - 4, "EPS（元）→", { "text-anchor": "end", "font-size": 11, fill: "var(--ink-3)" });
        var x0 = x(0),
          yTop = y(pe),
          y0 = y(0);
        svg.appendChild(s("rect", { x: x0, y: yTop, width: Math.max(1, ex - x0), height: y0 - yTop, fill: "var(--cat-1)", opacity: 0.14 }));
        svg.appendChild(s("rect", { x: x0, y: yTop, width: Math.max(1, ex - x0), height: y0 - yTop, fill: "none", stroke: "var(--cat-1)", "stroke-width": 2 }));
        L(svg, ex, y0, ex, y0 + 5, { stroke: "var(--ink)", "stroke-width": 1.5 });
        T(svg, clamp(ex, m.l + 30, w - m.r - 30), H - m.b + 16, "EPS " + tn(e, 2), { "text-anchor": "middle", class: "mono", style: "font-size:12px;font-weight:600;fill:var(--ink)" });
        T(svg, x0 + 6, yTop - 7, "本益比 " + tn(pe, 1) + " 倍", { "font-size": 12, "font-weight": 700, fill: "var(--ink)" });
        var label = fmt.num(e * pe, e * pe < 100 ? 1 : 0) + " 元";
        var rw = ex - x0,
          rh = y0 - yTop;
        if (rw >= tw(label, 16) + 20 && rh >= 48) {
          T(svg, x0 + rw / 2, yTop + rh / 2 - 6, "股價（面積）", { "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" });
          T(svg, x0 + rw / 2, yTop + rh / 2 + 14, label, { "text-anchor": "middle", "font-size": 17, "font-weight": 700, fill: "var(--ink)" });
        } else {
          var outRight = ex + 10 + tw("股價 " + label, 13) < w - m.r;
          T(svg, outRight ? ex + 10 : x0 + 6, outRight ? yTop + Math.min(rh / 2, 30) + 4 : yTop - 24, "股價 " + label, { "font-size": 13, "font-weight": 700, fill: "var(--ink)" });
        }
      }
      function draw2(svg, w, H) {
        var c = calc2(),
          narrow = w < 480;
        var m = { l: 40, r: 10, t: 34, b: 38 };
        var e1 = 100 * c.g,
          end = 100 * (1 + c.chg);
        var lv = [
          { k: "今年股價", a: 0, b: 100, kind: "total" },
          { k: "EPS 成長", a: 100, b: 100 + e1, kind: "step" },
          { k: c.peChg < 0 ? "本益比壓縮" : "本益比變化", a: 100 + e1, b: end, kind: "step" },
          { k: "明年股價", a: 0, b: end, kind: "total" },
        ];
        var top = Math.max(100, 100 + e1, end);
        var dom = nice(0, top * 1.08, 4);
        var y = W.scale(0, dom.hi, H - m.b, m.t);
        var slot = (w - m.l - m.r) / 4;
        var cw = Math.min(46, slot * 0.46);
        svg.setAttribute("aria-label", "股價拆解：今年 100，EPS 成長貢獻 " + tn(e1, 1) + "，本益比變化貢獻 " + tn(end - 100 - e1, 1) + "，明年 " + tn(end, 1));
        W.gridY(svg, y, dom.ticks, m.l, w - m.r);
        T(svg, 0, 14, "以今年股價＝100 拆解", { "font-size": 12, fill: "var(--ink-2)" });
        L(svg, m.l, y(0), w - m.r, y(0), { class: "axis" });
        lv.forEach(function (b, i) {
          var xc = m.l + slot * (i + 0.5);
          var ya = y(b.a),
            yb = y(b.b);
          var col = b.kind === "total" ? "var(--ink-3)" : b.b >= b.a ? "var(--up)" : "var(--down)";
          if (b.kind === "total") P(svg, vbar(xc, ya, yb, cw, 4), { fill: col, opacity: 0.85 });
          else svg.appendChild(s("rect", { x: xc - cw / 2, y: Math.min(ya, yb), width: cw, height: Math.max(1.5, Math.abs(yb - ya)), rx: 2, fill: col }));
          if (i < 3) {
            var nx = m.l + slot * (i + 1.5);
            L(svg, xc + cw / 2, yb, nx - cw / 2, yb, { stroke: "var(--ink-3)", "stroke-width": 1, "stroke-dasharray": "3 3" });
          }
          var val = b.kind === "total" ? tn(b.b, 1) : fmt.signed(b.b - b.a, 1);
          T(svg, xc, Math.min(ya, yb) - 7, val, { "text-anchor": "middle", class: "mono", style: "font-size:12px;font-weight:600;fill:var(--ink)" });
          T(svg, xc, H - m.b + 18, b.k, { "text-anchor": "middle", "font-size": narrow ? 11.5 : 12, fill: "var(--ink-2)" });
        });
      }
      update1();
      update2();
    },
  });

  /* ======================================================================
     bond — 債券蹺蹺板
     ====================================================================== */
  function bondPrice(c, n, yPct) {
    var r = yPct / 100,
      p = 0;
    for (var t = 1; t <= n; t++) p += c / Math.pow(1 + r, t);
    return p + 100 / Math.pow(1 + r, n);
  }
  HB.defineWidget("bond", {
    title: "債券蹺蹺板：殖利率上升，價格下跌",
    init: function (body, cfg) {
      var TEN = [2, 10, 30];
      var cSl = W.slider({ label: "票面利率（每年配息 ÷ 面額）", min: 0, max: 8, step: 0.25, value: snap(opt(cfg, "coupon", 4, 0, 8), 0.25), fmt: function (v) { return fmt.num(v, 2) + "%"; }, onInput: update });
      var nSeg = W.seg({
        label: "年期（幾年後還本）",
        options: [
          [2, "2 年"],
          [10, "10 年"],
          [30, "30 年"],
        ],
        value: nearest(fin(cfg.years, 10), TEN),
        onChange: update,
      });
      var ySl = W.slider({ label: "市場殖利率（買方要求的報酬）", min: 0, max: 10, step: 0.05, value: snap(opt(cfg, "yield", 4, 0, 10), 0.05), fmt: function (v) { return fmt.num(v, 2) + "%"; }, onInput: update });
      body.appendChild(h("div", { class: "w-controls" }, [cSl.el, nSeg.el, ySl.el]));
      var ro = W.readout([
        { key: "px", k: "債券價格（每 100 元面額）" },
        { key: "par", k: "相對面額" },
        { key: "dur", k: "修正存續期間" },
        { key: "shock", k: "殖利率再升 1 個百分點" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var geo = null;
      var ch = W.chart(
        body,
        function (w) {
          return w < 480 ? 250 : 280;
        },
        draw
      );
      var tip = makeTip(ch);
      bindPointer(ch, {
        cursor: "pointer",
        hover: function (p) {
          if (!geo) return;
          var yy = snap(clamp(geo.x.invert(p.x), 0, 10), 0.05);
          var c = cur();
          tip.show(geo.x(yy), geo.y(bondPrice(c.c, c.n, yy)) - 8, "殖利率 " + fmt.num(yy, 2) + "% → 價格 " + fmt.num(bondPrice(c.c, c.n, yy), 2) + "（點一下套用）");
        },
        press: function (p) {
          if (!geo) return;
          ySl.set(snap(clamp(geo.x.invert(p.x), 0, 10), 0.05));
          tip.hide();
          update();
        },
        leave: function () {
          tip.hide();
        },
      });
      defaultNote(body, cfg, "每年付息一次、到期還 100 元面額的簡化計算；價格不含應計利息。實際公債多為半年付息，數字會略有不同。");

      function cur() {
        return { c: clamp(fin(cSl.get(), 4), 0, 8), n: nSeg.get(), y: clamp(fin(ySl.get(), 4), 0, 10) };
      }
      function stats(c, n, y) {
        var p = bondPrice(c, n, y);
        var dur = (bondPrice(c, n, y - 0.01) - bondPrice(c, n, y + 0.01)) / (2 * p * 0.0001);
        return { p: p, dur: dur, shock: bondPrice(c, n, y + 1) / p - 1 };
      }
      function update() {
        var c = cur(),
          st = stats(c.c, c.n, c.y);
        var diff = st.p - 100;
        var kind = Math.abs(diff) < 0.005 ? "平價" : diff < 0 ? "折價" : "溢價";
        ro.update({
          px: { v: fmt.num(st.p, 2), s: c.n + " 年期、票面 " + fmt.num(c.c, 2) + "%、殖利率 " + fmt.num(c.y, 2) + "%" },
          par: { v: kind === "平價" ? "平價" : kind + " " + fmt.num(Math.abs(diff), 2), s: kind === "平價" ? "殖利率＝票面利率" : (diff < 0 ? "比面額便宜 " : "比面額貴 ") + fmt.pct(Math.abs(diff) / 100, 1) },
          dur: { v: fmt.num(st.dur, 2), s: "殖利率每動 1 個百分點，價格約反向動 " + fmt.num(st.dur, 1) + "%" },
          shock: { v: fmt.pct(st.shock, 1, true), s: "到 " + fmt.num(c.y + 1, 2) + "% 時重新計價：" + fmt.num(st.p, 2) + " → " + fmt.num(st.p * (1 + st.shock), 2), tone: "down" },
        });
        var lead;
        if (kind === "折價") lead = "<b>殖利率 " + fmt.num(c.y, 2) + "% 高於票面 " + fmt.num(c.c, 2) + "%：折價。</b>新買家要求的報酬比這張債每年配的息還高，只有用低於面額的價格買，到期多拿回的差價才能補足。";
        else if (kind === "溢價") lead = "<b>殖利率 " + fmt.num(c.y, 2) + "% 低於票面 " + fmt.num(c.c, 2) + "%：溢價。</b>這張債配的息比現在市場要求的高，大家搶著買，價格被推到面額以上。";
        else lead = "<b>殖利率等於票面利率：價格剛好是面額 100。</b>三條曲線都通過這一點。";
        var sh = TEN.map(function (n) {
          return n + " 年約 " + fmt.pct(stats(c.c, n, c.y).shock, 1, true);
        });
        vd.set("", lead + "年期越長越敏感：殖利率再升 1 個百分點，" + sh.join("、") + "。長天期債券的錢要等更久才拿得到，所以利率一動，價格擺得最大。");
        ch.redraw();
      }
      function draw(svg, w, H) {
        var c = cur(),
          narrow = w < 480;
        var m = { l: 44, r: 46, t: 18, b: 30 };
        var hiP = 100,
          loP = 100;
        TEN.forEach(function (n) {
          hiP = Math.max(hiP, bondPrice(c.c, n, 0));
          loP = Math.min(loP, bondPrice(c.c, n, 10));
        });
        var dom = nice(Math.max(0, loP - 4), hiP + 4, narrow ? 4 : 5);
        var x = W.scale(0, 10, m.l, w - m.r),
          y = W.scale(dom.lo, dom.hi, H - m.b, m.t);
        geo = { x: x, y: y };
        svg.setAttribute("aria-label", "價格與殖利率曲線：殖利率越高價格越低；" + c.n + " 年期債券在殖利率 " + fmt.num(c.y, 2) + "% 時價格 " + fmt.num(bondPrice(c.c, c.n, c.y), 2));
        W.gridY(svg, y, dom.ticks, m.l, w - m.r, function (v) {
          return tn(v, 1);
        });
        W.labelsX(svg, x, narrow ? [0, 2, 4, 6, 8, 10] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], H - m.b + 18, function (v) {
          return v + "%";
        });
        /* par line + coupon divider */
        L(svg, m.l, y(100), w - m.r, y(100), { stroke: "var(--ink-2)", "stroke-width": 1, "stroke-dasharray": "4 4" });
        T(svg, w - m.r - 4, y(100) - 6, "面額 100", { "text-anchor": "end", "font-size": 11, fill: "var(--ink-2)" });
        var xc = x(c.c);
        L(svg, xc, m.t, xc, H - m.b, { stroke: "var(--rule)", "stroke-width": 1 });
        var by = H - m.b - 7;
        var lab = "票面 " + fmt.num(c.c, 2) + "%";
        var lw = tw(lab, 11);
        T(svg, clamp(xc, m.l + lw / 2 + 2, w - m.r - lw / 2 - 2), by, lab, { "text-anchor": "middle", "font-size": 11, fill: "var(--ink-3)" });
        if (xc - m.l > lw / 2 + 52) T(svg, xc - lw / 2 - 8, by, "← 溢價", { "text-anchor": "end", "font-size": 11, fill: "var(--ink-3)" });
        if (w - m.r - xc > lw / 2 + 52) T(svg, xc + lw / 2 + 8, by, "折價 →", { "font-size": 11, fill: "var(--ink-3)" });
        /* curves */
        var ends = [];
        TEN.forEach(function (n) {
          var pts = [];
          for (var v = 0; v <= 10.0001; v += 0.1) pts.push([x(v), y(bondPrice(c.c, n, v))]);
          var on = n === c.n;
          P(svg, W.linePath(pts), on ? stroke("var(--cat-1)", 2.5) : stroke("var(--ink-3)", 1.5, { opacity: 0.55 }));
          ends.push({ y: y(bondPrice(c.c, n, 10)), t: n + " 年", on: on });
        });
        spread(ends, 14, m.t, H - m.b);
        ends.forEach(function (e) {
          if (Math.abs(e.ly - e.y) > 0.5) P(svg, "M" + (w - m.r + 1) + " " + e.y + "L" + (w - m.r + 5) + " " + e.ly, { stroke: "var(--rule)", "stroke-width": 1, fill: "none" });
          T(svg, w - m.r + 7, e.ly + 4, e.t, { "font-size": 11.5, fill: e.on ? "var(--ink)" : "var(--ink-3)", "font-weight": e.on ? 700 : 400 });
        });
        /* current point */
        var p = bondPrice(c.c, c.n, c.y);
        var px = x(c.y),
          py = y(p);
        dot(svg, px, py, "var(--cat-1)", 5.5);
        var right = px < w - m.r - 92;
        var ly = py - 12 < m.t + 4 ? py + 22 : py - 12;
        T(svg, right ? px + 9 : px - 9, ly, "價格 " + fmt.num(p, 2), { "text-anchor": right ? "start" : "end", "font-weight": 700, "font-size": 13, fill: "var(--ink)" });
      }
      update();
    },
  });

  /* ======================================================================
     yieldcurve — 殖利率曲線
     ====================================================================== */
  HB.defineWidget("yieldcurve", {
    title: "殖利率曲線：五種形狀",
    init: function (body, cfg) {
      var TEN = ["3 個月", "2 年", "5 年", "10 年", "30 年"];
      var SH = {
        normal: { k: "正常（右上）", now: [3.6, 3.75, 3.95, 4.3, 4.75] },
        flat: { k: "平坦", now: [4.35, 4.25, 4.2, 4.25, 4.35] },
        inverted: { k: "倒掛", now: [5.4, 4.9, 4.4, 4.1, 4.25] },
        "bear-steepen": { k: "熊陡（長端急升）", before: [3.9, 3.6, 3.75, 4.1, 4.6], now: [3.9, 3.6, 3.95, 4.55, 5.1] },
        "bull-steepen": { k: "牛陡（短端急降）", before: [4.4, 4.1, 4.05, 4.25, 4.65], now: [3.6, 3.3, 3.55, 4.0, 4.5] },
      };
      var shape = SH[cfg.shape] ? cfg.shape : "normal";
      var seg = W.seg({
        label: "曲線形狀",
        options: Object.keys(SH).map(function (k) {
          return [k, SH[k].k];
        }),
        value: shape,
        onChange: function (v) {
          shape = v;
          update();
        },
      });
      body.appendChild(h("div", { class: "w-controls" }, [seg.el]));
      var ro = W.readout([
        { key: "y2", k: "2 年期殖利率" },
        { key: "y10", k: "10 年期殖利率" },
        { key: "y30", k: "30 年期殖利率" },
        { key: "sp", k: "10Y − 2Y 利差" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(
        body,
        function (w) {
          return w < 480 ? 240 : 270;
        },
        draw
      );
      defaultNote(body, cfg, "美國公債殖利率，數字為示意，用來比較形狀，不是某一天的實際報價。");
      var TXT = {
        normal: {
          tone: "good",
          t: "<b>正常（右上）：天期越長，殖利率越高。</b>把錢借出去越久，要求的補償越多（期限溢酬），這是景氣正常時最常見的形狀。讀曲線的基本功：短端（3 個月、2 年）主要跟著聯準會的政策利率走；長端（10 年、30 年）反映通膨預期、財政赤字與期限溢酬。",
        },
        flat: {
          tone: "warn",
          t: "<b>平坦：短端和長端差不多。</b>短端被升息推高，長端卻沒跟上，代表市場不認為未來利率會比現在高多少，常出現在升息循環後段，是景氣動能放緩的提醒。",
        },
        inverted: {
          tone: "alert",
          t: "<b>倒掛：短天期殖利率高於長天期（10Y − 2Y 為負）。</b>市場預期未來會降息，通常是因為擔心景氣轉弱。歷史上倒掛常出現在經濟衰退之前，但從倒掛到衰退的時間差很長，不是精準的計時器。",
        },
        "bear-steepen": {
          tone: "alert",
          t: "<b>熊陡：長端殖利率上升得比短端多。</b>如果同時「聯準會升息機率下降」（短端穩住），10 年、30 年卻上升，代表市場擔心的不是聯準會，而是通膨、財政赤字或期限溢酬。GCFIE 第十四節提醒：這不能直接當成科技股的利多，長端利率上升會提高折現率、壓縮成長股估值。",
        },
        "bull-steepen": {
          tone: "warn",
          t: "<b>牛陡：短端殖利率大降，長端降得少。</b>通常是市場預期聯準會降息。對股市是好是壞要看原因：預防性降息偏利多；因為景氣急凍而急降，則是警訊。",
        },
      };
      function update() {
        var d = SH[shape],
          n = d.now,
          b = d.before;
        function cell(i) {
          var o = { v: fmt.num(n[i], 2) + "%" };
          if (b) o.s = "之前 " + fmt.num(b[i], 2) + "%，" + pp(n[i] - b[i], 2);
          else o.s = TEN[i] + "期公債（示意）";
          return o;
        }
        var spr = n[3] - n[1];
        ro.update({
          y2: cell(1),
          y10: cell(3),
          y30: cell(4),
          sp: { v: pp(spr, 2), s: fmt.signed(spr * 100, 0) + " bp" + (b ? "（之前 " + fmt.signed((b[3] - b[1]) * 100, 0) + " bp）" : spr < 0 ? "：負值＝倒掛" : "：正值＝長端較高"), tone: "" },
        });
        vd.set(TXT[shape].tone, TXT[shape].t);
        ch.redraw();
      }
      function draw(svg, w, H) {
        var d = SH[shape],
          narrow = w < 480;
        var m = { l: 40, r: narrow ? 40 : 48, t: 30, b: 30 };
        var x = function (i) {
          return m.l + ((w - m.l - m.r) / 5) * (i + 0.5);
        };
        var y = W.scale(2.75, 5.75, H - m.b, m.t);
        svg.setAttribute("aria-label", "殖利率曲線（示意）：" + d.k + "，3 個月到 30 年的殖利率");
        W.gridY(svg, y, [3, 3.5, 4, 4.5, 5, 5.5], m.l, w - m.r, function (v) {
          return v % 1 ? "" : v + "%";
        });
        TEN.forEach(function (t, i) {
          T(svg, x(i), H - m.b + 18, narrow && i === 0 ? "3個月" : t, { "text-anchor": "middle", class: "mono" });
        });
        T(svg, m.l, 14, "示意｜美國公債殖利率", { "font-size": 11, fill: "var(--ink-3)" });
        function pathOf(arr) {
          return W.linePath(
            arr.map(function (v, i) {
              return [x(i), y(v)];
            })
          );
        }
        var ends = [];
        if (d.before) {
          P(svg, pathOf(d.before), stroke("var(--ink-3)", 1.5, { "stroke-dasharray": "5 4" }));
          d.before.forEach(function (v, i) {
            svg.appendChild(s("circle", { cx: x(i), cy: y(v), r: 3.5, fill: "var(--plate)", stroke: "var(--ink-3)", "stroke-width": 1.5 }));
            var dv = d.now[i] - v;
            if (Math.abs(dv) >= 0.08) {
              var y1 = y(v),
                y2 = y(d.now[i]);
              var dir = y2 > y1 ? 1 : -1;
              var a = y1 + dir * 6,
                bEnd = y2 - dir * 8;
              if ((bEnd - a) * dir > 2) {
                L(svg, x(i), a, x(i), bEnd, { stroke: "var(--ink-2)", "stroke-width": 1.5 });
                P(svg, "M" + (x(i) - 4) + " " + (bEnd - dir * 1) + "L" + x(i) + " " + (bEnd + dir * 5) + "L" + (x(i) + 4) + " " + (bEnd - dir * 1) + "Z", { fill: "var(--ink-2)" });
              }
            }
          });
          ends.push({ y: y(d.before[4]), t: "之前", strong: false });
        }
        P(svg, pathOf(d.now), stroke("var(--cat-1)", 2.5));
        d.now.forEach(function (v, i) {
          dot(svg, x(i), y(v), "var(--cat-1)", 4.5);
          var below = d.before && d.now[i] < d.before[i] - 0.05;
          if (narrow && (i === 0 || i === 2) && d.before) return;
          T(svg, x(i), below ? y(v) + 19 : y(v) - 11, fmt.num(v, 2) + "%", { "text-anchor": "middle", class: "mono", style: "font-size:11px;fill:var(--ink)" });
        });
        if (d.before) {
          ends.push({ y: y(d.now[4]), t: "之後", strong: true });
          spread(ends, 15, m.t, H - m.b);
          ends.forEach(function (e) {
            T(svg, x(4) + 12, e.ly + 4, e.t, { "font-size": 12, "font-weight": e.strong ? 700 : 400, fill: e.strong ? "var(--ink)" : "var(--ink-3)" });
          });
        }
      }
      update();
    },
  });

  /* ======================================================================
     discount — 折現與成長股
     ====================================================================== */
  HB.defineWidget("discount", {
    title: "折現：利率上升，為什麼成長股跌更多",
    init: function (body, cfg) {
      var near = [],
        far = [];
      for (var t = 1; t <= 30; t++) {
        near.push(10);
        far.push(t <= 10 ? 2 * Math.pow(1.2, t - 1) : 2 * Math.pow(1.2, 9) * Math.pow(1.03, t - 10));
      }
      function pv(cf, r) {
        var sum = 0;
        for (var t = 1; t <= cf.length; t++) sum += cf[t - 1] / Math.pow(1 + r / 100, t);
        return sum;
      }
      var rSl = W.slider({ label: "折現率（長期利率＋風險溢酬）", min: 1, max: 10, step: 0.25, value: snap(opt(cfg, "rate", 4, 1, 10), 0.25), fmt: function (v) { return fmt.num(v, 2) + "%"; }, onInput: update });
      var shSeg = W.seg({
        label: "利率衝擊",
        options: [
          [0.5, "+0.5 個百分點"],
          [1, "+1"],
          [2, "+2"],
        ],
        value: nearest(fin(cfg.shock, 1), [0.5, 1, 2]),
        onChange: update,
      });
      body.appendChild(h("div", { class: "w-controls" }, [rSl.el, shSeg.el]));
      var ro = W.readout([
        { key: "near", k: "近現金（穩定股／債）" },
        { key: "far", k: "遠現金（成長股）" },
        { key: "ratio", k: "遠現金的跌幅是近現金的" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(
        body,
        function (w) {
          return w < 480 ? 230 : 250;
        },
        drawPV
      );
      var ch2 = W.chart(
        body,
        function (w) {
          return w < 480 ? 196 : 186;
        },
        drawCF
      );
      defaultNote(body, cfg, "兩個示意資產各有 30 年的現金流：近現金每年 10；遠現金第 1 年只有 2，前 10 年每年成長 20%，之後每年 3%。真實成長股還有大量「30 年以後」的價值，對利率會更敏感。");

      function cur() {
        var r = clamp(fin(rSl.get(), 4), 1, 10),
          sh = shSeg.get();
        var a = pv(near, r),
          b = pv(near, r + sh),
          c = pv(far, r),
          d = pv(far, r + sh);
        return { r: r, sh: sh, n0: a, n1: b, f0: c, f1: d, dn: b / a - 1, df: d / c - 1 };
      }
      function update() {
        var c = cur();
        var rs = "利率 " + fmt.num(c.r, 2) + "% → " + fmt.num(c.r + c.sh, 2) + "%";
        ro.update({
          near: { v: fmt.pct(c.dn, 1, true), s: "現值 " + fmt.num(c.n0, 1) + " → " + fmt.num(c.n1, 1) + "（" + rs + "）", tone: "down" },
          far: { v: fmt.pct(c.df, 1, true), s: "現值 " + fmt.num(c.f0, 1) + " → " + fmt.num(c.f1, 1), tone: "down" },
          ratio: { v: fmt.num(c.df / c.dn, 2) + " 倍", s: "同樣的利率衝擊，遠現金跌得比較多" },
        });
        vd.set(
          "alert",
          "<b>遠現金資產對利率更敏感。</b>利率升 " + tn(c.sh, 1) + " 個百分點，近現金跌 " + fmt.pct(-c.dn, 1) + "、遠現金跌 " + fmt.pct(-c.df, 1) + "。遠現金的價值大多來自很多年以後的錢，而越遠的錢被折現打折得越多。這就是 GCFIE 第十四節的連鎖：長端利率上升 → 折現率上升 → AI／成長股的估值被壓縮，即使公司本身的獲利沒有變。"
        );
        ch.redraw();
        ch2.redraw();
      }
      function drawPV(svg, w, H) {
        var c = cur(),
          narrow = w < 480;
        var m = { l: 40, r: narrow ? 74 : 92, t: 30, b: 30 };
        var lo = Infinity,
          hi = -Infinity;
        var lines = [
          { cf: near, base: c.n0, col: "var(--cat-1)", t: "近現金" },
          { cf: far, base: c.f0, col: "var(--cat-2)", t: "遠現金" },
        ];
        lines.forEach(function (ln) {
          ln.pts = [];
          for (var r = 1; r <= 10.0001; r += 0.25) {
            var v = (pv(ln.cf, r) / ln.base) * 100;
            ln.pts.push([r, v]);
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
          }
        });
        var dom = nice(lo, hi, 4);
        var x = W.scale(1, 10, m.l, w - m.r),
          y = W.scale(dom.lo, dom.hi, H - m.b, m.t);
        svg.setAttribute("aria-label", "兩種資產的現值隨折現率變化（以目前折現率＝100）：遠現金的曲線比較陡");
        T(svg, 0, 14, "現值指數（目前折現率 " + fmt.num(c.r, 2) + "% 時＝100）", { "font-size": 12, fill: "var(--ink-2)" });
        /* shock band */
        var xa = x(c.r),
          xb = x(Math.min(10, c.r + c.sh));
        svg.appendChild(s("rect", { x: xa, y: m.t, width: Math.max(0, xb - xa), height: H - m.b - m.t, fill: "var(--engrave-wash)" }));
        W.gridY(svg, y, dom.ticks, m.l, w - m.r);
        W.labelsX(svg, x, narrow ? [1, 4, 7, 10] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], H - m.b + 18, function (v) {
          return v + "%";
        });
        L(svg, xa, m.t, xa, H - m.b, { stroke: "var(--ink-3)", "stroke-width": 1 });
        var ends = [];
        lines.forEach(function (ln) {
          P(svg, W.linePath(ln.pts.map(function (p) { return [x(p[0]), y(p[1])]; })), stroke(ln.col, 2));
          var last = ln.pts[ln.pts.length - 1];
          ends.push({ y: y(last[1]), t: ln.t, col: ln.col, v: last[1] });
        });
        lines.forEach(function (ln) {
          var r1 = c.r + c.sh;
          if (r1 <= 10) {
            var v1 = (pv(ln.cf, r1) / ln.base) * 100;
            dot(svg, x(r1), y(v1), ln.col, 4.5);
          }
        });
        dot(svg, xa, y(100), "var(--ink)", 4.5);
        T(svg, xa - 6, y(100) - 9, "目前", { "text-anchor": "end", "font-size": 11, fill: "var(--ink-2)" });
        if (c.r + c.sh <= 10) T(svg, xb + 4, m.t + 12, "+" + tn(c.sh, 1), { "font-size": 11, fill: "var(--ink-3)" });
        spread(ends, 30, m.t, H - m.b - 12);
        ends.forEach(function (e) {
          var ex = w - m.r + 6;
          L(svg, ex, e.ly, ex + 10, e.ly, stroke(e.col, 2));
          T(svg, ex + 14, e.ly + 4, e.t, { "font-size": 12, fill: "var(--ink)", "font-weight": 700 });
          T(svg, ex + 14, e.ly + 18, "10% 時 " + tn(e.v, 0), { class: "mono" });
        });
      }
      function drawCF(svg, w, H) {
        var c = cur(),
          narrow = w < 480;
        var m = { l: 0, r: 0, t: 26, b: 22 };
        var rows = [
          { cf: near, col: "var(--cat-1)", t: "近現金：每年 10" },
          { cf: far, col: "var(--cat-2)", t: "遠現金：前小後大" },
        ];
        var maxCF = 0;
        rows.forEach(function (r) {
          r.cf.forEach(function (v) {
            maxCF = Math.max(maxCF, v);
          });
        });
        var rowGap = 18,
          rowH = (H - m.t - m.b - rowGap) / 2 - 14;
        var slot = (w - m.l - m.r) / 30,
          bw = Math.max(2, slot - 2);
        svg.setAttribute("aria-label", "兩種資產每年的現金流（淺色）與折回今天的價值（深色），折現率 " + fmt.num(c.r, 2) + "%");
        var lg = narrow ? "淺色＝當年拿到的錢；深色＝折回今天值多少" : "淺色＝當年拿到的錢　深色＝以 " + fmt.num(c.r, 2) + "% 折回今天值多少";
        T(svg, 0, 13, lg, { "font-size": 12, fill: "var(--ink-2)" });
        rows.forEach(function (r, k) {
          var top = m.t + k * (rowH + 14 + rowGap);
          T(svg, 0, top + 11, r.t, { "font-size": 12, "font-weight": 700, fill: "var(--ink)" });
          var base = top + 14 + rowH;
          var sc = rowH / maxCF;
          r.cf.forEach(function (v, i) {
            var xc = m.l + slot * (i + 0.5);
            var d = v / Math.pow(1 + c.r / 100, i + 1);
            P(svg, vbar(xc, base, base - v * sc, bw, 2), { fill: r.col, opacity: 0.22 });
            P(svg, vbar(xc, base, base - d * sc, bw, 2), { fill: r.col });
          });
          L(svg, 0, base, w, base, { class: "axis" });
        });
        [1, 10, 20, 30].forEach(function (yr) {
          T(svg, m.l + slot * (yr - 0.5), H - 6, yr === 1 ? "第 1 年" : yr + "", { "text-anchor": yr === 1 ? "start" : yr === 30 ? "end" : "middle", class: "mono" });
        });
      }
      update();
    },
  });

  /* ======================================================================
     fxreturn — 匯率與外資報酬
     ====================================================================== */
  HB.defineWidget("fxreturn", {
    title: "匯率：同一支台股，外資和你賺的不一樣",
    init: function (body, cfg) {
      var USD0 = 30;
      var rSl = W.slider({ label: "台股報酬（以台幣計）", min: -30, max: 50, step: 1, value: Math.round(opt(cfg, "stock", 10, -30, 50)), fmt: function (v) { return fmt.pct(v / 100, 0, true); }, onInput: update });
      var fxSl = W.slider({ label: "新台幣對美元（升值為正、貶值為負）", min: -15, max: 15, step: 0.5, value: snap(opt(cfg, "fx", -3, -15, 15), 0.5), fmt: function (v) { return (v > 0 ? "升值 " : v < 0 ? "貶值 " : "") + tn(Math.abs(v), 1) + "%"; }, onInput: update });
      body.appendChild(h("div", { class: "w-controls" }, [rSl.el, fxSl.el]));
      var ro = W.readout([
        { key: "usd", k: "外資以美元計的報酬" },
        { key: "fxc", k: "匯率貢獻" },
        { key: "tw", k: "台灣投資人報酬（台幣計）" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, 176, draw);
      defaultNote(body, cfg, "外資報酬 ＝（1 ＋ 台股報酬）×（1 ＋ 新台幣升值幅度）− 1。匯率以 1 美元＝30 元起算，僅為示意。");

      function cur() {
        var r = clamp(fin(rSl.get(), 10), -30, 50) / 100,
          f = clamp(fin(fxSl.get(), -3), -15, 15) / 100;
        var usd = (1 + r) * (1 + f) - 1;
        return { r: r, f: f, usd: usd, fxc: usd - r };
      }
      function update() {
        var c = cur();
        var rate1 = USD0 / (1 + c.f);
        ro.update({
          usd: { v: fmt.pct(c.usd, 1, true), s: "(1 " + (c.r < 0 ? "− " : "+ ") + fmt.pct(Math.abs(c.r), 0) + ") × (1 " + (c.f < 0 ? "− " : "+ ") + tn(Math.abs(c.f * 100), 1) + "%) − 1", tone: c.usd > 0.00049 ? "up" : c.usd < -0.00049 ? "down" : "" },
          fxc: { v: pp(c.fxc * 100, 1), s: "1 美元：" + fmt.num(USD0, 2) + " → " + fmt.num(rate1, 2) + " 元（示意）", tone: c.fxc > 0.00049 ? "up" : c.fxc < -0.00049 ? "down" : "" },
          tw: { v: fmt.pct(c.r, 1, true), s: "賺賠都用台幣算，匯率不影響", tone: c.r > 0 ? "up" : c.r < 0 ? "down" : "" },
        });
        var t, tone;
        if (Math.abs(c.f) < 1e-9) {
          tone = "";
          t = "<b>匯率不動，外資和台灣投資人的報酬一樣。</b>把新台幣往左（貶值）或往右（升值）拉，看看差別。";
        } else if (c.f > 0) {
          tone = "good";
          t = "<b>新台幣升值 " + tn(c.f * 100, 1) + "%：外資買台股同時賺股價和匯差，</b>美元報酬 " + fmt.pct(c.usd, 1, true) + "，比台灣投資人的 " + fmt.pct(c.r, 1, true) + " 多。外資匯入時要把美元換成台幣，這個買盤本身也會推升台幣，形成「股匯雙漲」。";
        } else {
          tone = c.usd < 0 ? "bad" : "warn";
          t = (c.r > 0 && c.usd < 0 ? "<b>股價漲了 " + fmt.pct(c.r, 1) + "，換成美元卻是虧的（" + fmt.pct(c.usd, 1, true) + "）。</b>" : "<b>新台幣貶值 " + tn(-c.f * 100, 1) + "%，吃掉外資的報酬：</b>美元報酬 " + fmt.pct(c.usd, 1, true) + "，比台幣計的 " + fmt.pct(c.r, 1, true) + " 少。") + "台幣急貶常伴隨外資賣超、把錢匯出（賣台幣換美元），而匯出又讓台幣更弱，兩者互相強化。";
        }
        vd.set(tone, t);
        ch.redraw();
      }
      function draw(svg, w, H) {
        var c = cur();
        var rows = [
          { k: "台股漲跌（台幣計）", v: c.r },
          { k: "＋ 匯率影響", v: c.fxc },
          { k: "＝ 外資實拿（美元計）", v: c.usd, strong: true },
        ];
        var m = { l: 0, r: 0, t: 8, b: 4 };
        var maxA = 0.01;
        rows.forEach(function (r) {
          maxA = Math.max(maxA, Math.abs(r.v));
        });
        var mid = w / 2;
        var half = w / 2 - 62;
        var k = half / maxA;
        var rowH = (H - m.t - m.b) / 3;
        svg.setAttribute("aria-label", "報酬拆解：台股 " + fmt.pct(c.r, 1, true) + "，匯率影響 " + pp(c.fxc * 100, 1) + "，外資美元報酬 " + fmt.pct(c.usd, 1, true));
        L(svg, mid, m.t, mid, H - m.b, { stroke: "var(--ink-3)", "stroke-width": 1 });
        rows.forEach(function (r, i) {
          var top = m.t + rowH * i;
          var yc = top + 32;
          T(svg, mid + (r.v < 0 ? 8 : -8), top + 12, r.k, { "text-anchor": r.v < 0 ? "start" : "end", "font-size": 12, "font-weight": r.strong ? 700 : 400, fill: r.strong ? "var(--ink)" : "var(--ink-2)" });
          var x1 = mid + r.v * k;
          var col = r.v >= 0 ? "var(--up)" : "var(--down)";
          P(svg, hbar(mid, x1, yc, 18, 4), { fill: col, opacity: r.strong ? 1 : 0.6 });
          T(svg, r.v < 0 ? x1 - 7 : x1 + 7, yc + 4, i === 1 ? fmt.signed(r.v * 100, 1) + " pp" : fmt.pct(r.v, 1, true), { "text-anchor": r.v < 0 ? "end" : "start", class: "mono", style: "font-size:12px;fill:var(--ink)" + (r.strong ? ";font-weight:600" : "") });
        });
      }
      update();
    },
  });
})();
