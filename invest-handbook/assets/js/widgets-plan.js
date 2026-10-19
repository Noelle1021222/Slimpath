/* 讀通投資 — instruments tied to the 20-stock plan and to Taiwan positioning:
   margin (融資維持率), quadrant (期現四象限), ladder (買進區／停損／目標價),
   allocation (分組權重), sizing (零股部位). Requires widgets.js + data-plan.js. */
(function () {
  "use strict";
  var HB = window.HB;
  var W = HB.W;
  var fmt = W.fmt;
  var h = W.h;
  var s = W.s;

  /* ======================================================================
     margin — 融資：自備成數、股價變動 → 維持率、淨值、追繳
     data-own (本金, default 1,000,000) data-ratio (融資成數 %, 60 上市 / 50 上櫃)
     data-move (initial price change %, default 0)
     ====================================================================== */
  HB.defineWidget("margin", {
    title: "融資維持率模擬器",
    init: function (body, cfg) {
      var own = cfg.own || 1000000;
      var state = { ratio: cfg.ratio || 60, move: cfg.move || 0 };

      var ratioSeg = W.seg({
        label: "融資成數（可借的比例）",
        options: [
          [60, "上市 6 成"],
          [50, "上櫃 5 成"],
        ],
        value: state.ratio,
        onChange: function (v) {
          state.ratio = v;
          update();
        },
      });
      var ownIn = W.number({ label: "自己出的本金", suffix: "元", value: own, step: 10000, min: 10000, onInput: update });
      var moveSl = W.slider({
        label: "股價變動",
        min: -50,
        max: 60,
        step: 1,
        value: state.move,
        fmt: function (v) {
          return fmt.pct(v / 100, 0, true);
        },
        onInput: function (v) {
          state.move = v;
          update();
        },
      });
      body.appendChild(h("div", { class: "w-controls" }, [ownIn.el, ratioSeg.el, moveSl.el]));

      var ro = W.readout([
        { key: "pos", k: "買進的股票市值" },
        { key: "loan", k: "向券商借的錢（融資金額）" },
        { key: "mr", k: "維持率" },
        { key: "eq", k: "你的淨值（本金報酬）" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);

      var ch = W.chart(body, function (w) {
        return w < 480 ? 230 : 260;
      }, draw);

      function calc(move) {
        var o = ownIn.get();
        var r = state.ratio / 100;
        var pos0 = o / (1 - r);
        var loan = pos0 * r;
        var pos = pos0 * (1 + move / 100);
        var eq = pos - loan;
        return { own: o, pos0: pos0, loan: loan, pos: pos, eq: eq, mr: pos / loan, ret: eq / o - 1, lev: 1 / (1 - r) };
      }
      function callMove() {
        var r = state.ratio / 100;
        return (1.3 * r - 1) * 100; /* price change where 維持率 hits 130% */
      }
      function doubleMove() {
        var r = state.ratio / 100;
        return (2 * (1 - r) + r - 1) * 100; /* equity doubles */
      }

      function update() {
        var c = calc(state.move);
        ro.update({
          pos: { v: fmt.wan(c.pos), s: "期初 " + fmt.wan(c.pos0) + "（" + fmt.num(c.lev, 1) + " 倍槓桿）" },
          loan: { v: fmt.wan(c.loan), s: "股價漲跌都不會變" },
          mr: { v: fmt.num(c.mr * 100, 1) + "%", s: "市值 ÷ 融資金額", tone: c.mr <= 1.3 + 1e-9 ? "down" : "" },
          eq: { v: fmt.wan(c.eq), s: "本金 " + fmt.pct(c.ret, 1, true) + "（不用融資只會 " + fmt.pct(state.move / 100, 0, true) + "）", tone: c.ret > 0 ? "up" : c.ret < 0 ? "down" : "" },
        });
        var cm = callMove(),
          dm = doubleMove();
        if (c.eq <= 0) vd.set("bad", "<b>本金已經賠光。</b>股票市值低於借款，這種情況通常在維持率跌破 130% 收到追繳、又沒補錢時就會被券商處分（斷頭），不會等到歸零。");
        else if (c.mr < 1.3 - 1e-9)
          vd.set(
            "bad",
            "<b>維持率 " + fmt.num(c.mr * 100, 1) + "%，低於 130%：收到追繳通知。</b>要在期限內補錢（或賣股還款），否則券商可以把股票賣掉還款，也就是「斷頭」。這時本金已經 " + fmt.pct(c.ret, 0, true) + "。"
          );
        else if (c.mr <= 1.3 + 1e-9) vd.set("bad", "<b>維持率剛好 130%：碰到追繳線。</b>再跌一點就會收到追繳通知。這時本金已經 " + fmt.pct(c.ret, 0, true) + "，100 萬只剩 " + fmt.wan(c.eq) + "。");
        else if (c.mr < 1.45) vd.set("alert", "<b>距離追繳線很近。</b>股價只要跌到期初的 " + fmt.pct(cm / 100, 1, true) + "，維持率就會碰到 130%。");
        else if (state.move >= dm) vd.set("good", "<b>本金翻倍了。</b>在 " + state.ratio + "% 融資成數下，股價只要漲約 " + fmt.pct(dm / 100, 0, true) + " 就能讓本金翻倍；但同一把槓桿，跌約 " + fmt.pct(-cm / 100, 0) + " 就會被追繳。");
        else vd.set("warn", "槓桿是雙向的：股價每動 1%，本金大約動 " + fmt.num(c.lev, 1) + "%。追繳線在股價 " + fmt.pct(cm / 100, 1, true) + "，翻倍線在 " + fmt.pct(dm / 100, 0, true) + "。");
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var m = { l: 46, r: 14, t: 14, b: 34 };
        var x = W.scale(-50, 60, m.l, w - m.r);
        var y = W.scale(-1.6, 1.6, hh - m.b, m.t);
        svg.setAttribute("aria-label", "本金報酬率隨股價變動：融資與不融資比較");
        W.gridY(svg, y, [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], m.l, w - m.r, function (v) {
          return fmt.pct(v, 0, true);
        });
        W.labelsX(svg, x, [-50, -25, 0, 25, 50], hh - m.b + 18, function (v) {
          return fmt.pct(v / 100, 0, true);
        });
        var cm = callMove();
        /* margin-call zone */
        svg.appendChild(s("rect", { x: m.l, y: m.t, width: Math.max(0, x(cm) - m.l), height: hh - m.t - m.b, fill: "var(--sig-red)", opacity: 0.08 }));
        svg.appendChild(s("line", { x1: x(cm), x2: x(cm), y1: m.t, y2: hh - m.b, stroke: "var(--sig-red)", "stroke-width": 1, "stroke-dasharray": "4 4" }));
        svg.appendChild(s("text", { x: x(cm) - 6, y: m.t + 14, "text-anchor": "end", fill: "var(--sig-red)", text: "追繳線 " + fmt.pct(cm / 100, 0, true) }));
        svg.appendChild(s("line", { x1: x(0), x2: x(0), y1: m.t, y2: hh - m.b, class: "axis" }));
        var pts1 = [],
          pts2 = [];
        for (var v = -50; v <= 60; v += 1) {
          var c = calc(v);
          pts1.push([x(v), y(Math.max(-1.6, Math.min(1.6, c.ret)))]);
          pts2.push([x(v), y(v / 100)]);
        }
        svg.appendChild(s("path", { d: W.linePath(pts2), fill: "none", stroke: "var(--ink-3)", "stroke-width": 2, "stroke-linecap": "round" }));
        svg.appendChild(s("path", { d: W.linePath(pts1), fill: "none", stroke: "var(--cat-1)", "stroke-width": 2, "stroke-linecap": "round" }));
        var cur = calc(state.move);
        var cy = y(Math.max(-1.6, Math.min(1.6, cur.ret)));
        svg.appendChild(s("line", { x1: x(state.move), x2: x(state.move), y1: m.t, y2: hh - m.b, stroke: "var(--ink)", "stroke-width": 1, opacity: 0.35 }));
        svg.appendChild(s("circle", { cx: x(state.move), cy: cy, r: 5, fill: "var(--cat-1)", stroke: "var(--plate)", "stroke-width": 2 }));
        /* direct labels at right end */
        var e1 = calc(60);
        svg.appendChild(s("text", { x: w - m.r - 2, y: y(Math.min(1.6, e1.ret)) + 16, "text-anchor": "end", text: "用融資（" + fmt.num(e1.lev, 1) + " 倍）" }));
        svg.appendChild(s("text", { x: w - m.r - 2, y: y(0.6) + 18, "text-anchor": "end", fill: "var(--ink-3)", text: "不用融資" }));
      }
      update();
    },
  });

  /* ======================================================================
     quadrant — 期現四象限＋價格優先
     data-spot ("buy"|"sell") data-fut ("long"|"short") data-price ("up"|"down")
     ====================================================================== */
  HB.defineWidget("quadrant", {
    title: "外資期現四象限判讀器",
    init: function (body, cfg) {
      var st = { spot: cfg.spot || "buy", fut: cfg.fut || "long", price: cfg.price || "up" };
      var spot = W.seg({ label: "外資現貨（集中市場）", options: [["buy", "買超"], ["sell", "賣超"]], value: st.spot, onChange: function (v) { st.spot = v; update(); } });
      var fut = W.seg({ label: "外資台指期淨部位變化", options: [["long", "減空／加多"], ["short", "加空"]], value: st.fut, onChange: function (v) { st.fut = v; update(); } });
      var price = W.seg({ label: "加權指數當天表現", options: [["up", "上漲"], ["down", "下跌"]], value: st.price, onChange: function (v) { st.price = v; update(); } });
      body.appendChild(h("div", { class: "w-controls" }, [spot.el, fut.el, price.el]));

      var Q = {
        A: { light: "g", name: "Bullish Confirmation", zh: "多方確認", text: "現貨買、期貨也往多方調整，兩個市場說同一件事。" },
        B: { light: "o", name: "Long Cash + Hedge", zh: "買現貨＋期貨避險", text: "現貨在買，但同時在期貨加空單保護，像是買了股票又買保險：看多得不夠放心。" },
        C: { light: "y", name: "Risk Improving but Not Bullish", zh: "風險改善但還不是多頭", text: "現貨還在賣，但期貨空單在減少，賣壓可能進入尾聲，只是還沒有轉成買進。" },
        D: { light: "r", name: "Risk-Off Confirmation", zh: "風險趨避確認", text: "現貨賣、期貨加空，兩邊一起往空方站。" },
      };
      var grid = h("div", { class: "w-chart" });
      body.appendChild(grid);
      var vd = W.verdict();
      body.appendChild(vd.el);

      function key() {
        if (st.spot === "buy") return st.fut === "long" ? "A" : "B";
        return st.fut === "long" ? "C" : "D";
      }

      function drawGrid() {
        grid.innerHTML = "";
        var k = key();
        var w = 520,
          hh = 300,
          m = { l: 92, t: 40 };
        var cw = (w - m.l - 8) / 2,
          chh = (hh - m.t - 10) / 2;
        var svg = s("svg", { viewBox: "0 0 " + w + " " + hh, role: "img", "aria-label": "期現四象限，目前位於 " + k + " 象限" });
        svg.appendChild(s("text", { x: m.l + cw / 2, y: 24, "text-anchor": "middle", class: "mono", text: "期貨 減空／加多" }));
        svg.appendChild(s("text", { x: m.l + cw * 1.5, y: 24, "text-anchor": "middle", class: "mono", text: "期貨 加空" }));
        svg.appendChild(s("text", { x: 10, y: m.t + chh / 2 + 4, class: "mono", text: "現貨 買超" }));
        svg.appendChild(s("text", { x: 10, y: m.t + chh * 1.5 + 4, class: "mono", text: "現貨 賣超" }));
        var cells = [
          ["A", 0, 0],
          ["B", 1, 0],
          ["C", 0, 1],
          ["D", 1, 1],
        ];
        var sigColor = { g: "var(--sig-green)", y: "var(--sig-yellow)", o: "var(--sig-orange)", r: "var(--sig-red)" };
        cells.forEach(function (c) {
          var q = Q[c[0]];
          var on = c[0] === k;
          var x0 = m.l + c[1] * cw,
            y0 = m.t + c[2] * chh;
          svg.appendChild(s("rect", { x: x0 + 2, y: y0 + 2, width: cw - 4, height: chh - 4, rx: 2, fill: on ? "var(--paper)" : "var(--paper-2)", stroke: on ? "var(--ink)" : "var(--rule)", "stroke-width": on ? 2 : 1 }));
          svg.appendChild(s("circle", { cx: x0 + 22, cy: y0 + 26, r: 7, fill: sigColor[q.light], opacity: on ? 1 : 0.45 }));
          svg.appendChild(s("text", { x: x0 + 36, y: y0 + 31, "font-size": 18, "font-weight": 700, fill: on ? "var(--ink)" : "var(--ink-3)", text: c[0] }));
          svg.appendChild(s("text", { x: x0 + 16, y: y0 + 62, "font-size": 14, "font-weight": 700, fill: on ? "var(--ink)" : "var(--ink-3)", text: q.zh }));
          svg.appendChild(s("text", { x: x0 + 16, y: y0 + 84, class: "mono", fill: "var(--ink-3)", text: q.name }));
        });
        grid.appendChild(svg);
      }

      function update() {
        var k = key();
        var q = Q[k];
        drawGrid();
        var tone = { g: "good", y: "warn", o: "alert", r: "bad" }[q.light];
        var html = "<b>" + k + "｜" + q.zh + "（" + q.name + "）</b>　" + q.text;
        if ((k === "A" || k === "B") && st.price === "down") {
          html += "<br><b>但指數下跌：價格正在拒絕籌碼利多。</b>依 GCFIE「價格優先於籌碼」，籌碼再好看也要提高警戒，不能寫「法人買超，因此偏多」。";
          tone = "alert";
        } else if ((k === "C" || k === "D") && st.price === "up") {
          html += "<br><b>但指數上漲：利空沒有被價格接受。</b>賣壓可能已被價格吸收，觀察隔天能否延續，這是尋找反轉的線索，而不是立刻翻多。";
          if (k === "D") tone = "warn";
        } else {
          html += "<br>價格方向和籌碼一致，這個象限的訊號得到當天價格的確認。";
        }
        vd.set(tone, html, q.light);
      }
      update();
    },
  });

  /* ======================================================================
     ladder — 一檔股票的買進區、停損、目標價，以及假設現價的處境
     data-code (default "2330")
     ====================================================================== */
  HB.defineWidget("ladder", {
    title: "價格階梯：買進區、停損與目標價",
    init: function (body, cfg) {
      var stocks = HB.plan.stocks;
      var byCode = {};
      stocks.forEach(function (st) {
        byCode[st.code] = st;
      });
      var cur = byCode[String(cfg.code || "2330")] || stocks[0];
      var groups = HB.plan.groups
        .filter(function (g) {
          return g.id !== "cash";
        })
        .map(function (g) {
          return {
            label: g.name,
            options: stocks
              .filter(function (st) {
                return st.group === g.id;
              })
              .map(function (st) {
                return [st.code, st.name + " " + st.code];
              }),
          };
        });
      var pick = W.select({
        label: "選一檔計畫中的股票",
        groups: groups,
        value: cur.code,
        onChange: function (v) {
          cur = byCode[v];
          resetPrice();
          update();
        },
      });
      var priceSl = W.slider({
        label: "假設現在的股價",
        min: 0,
        max: 1,
        step: 1,
        value: 0,
        fmt: function (v) {
          return fmt.num(v, decimals());
        },
        onInput: update,
      });
      body.appendChild(h("div", { class: "w-controls" }, [pick.el, priceSl.el]));
      var ro = W.readout([
        { key: "zone", k: "相對參考價的位置" },
        { key: "stop", k: "到停損的距離" },
        { key: "t1", k: "到目標 1" },
        { key: "rr", k: "風險報酬比（到目標1）" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);
      var ch = W.chart(body, function (w) {
        return w < 480 ? 170 : 150;
      }, draw);
      var info = h("p", { class: "widget-note" });
      body.appendChild(info);

      function decimals() {
        return cur.ref < 100 ? 1 : 0;
      }
      function stepFor() {
        return cur.ref < 100 ? 0.1 : cur.ref < 1000 ? 1 : 5;
      }
      function lo() {
        return W.round(cur.stop * 0.9, decimals());
      }
      function hi() {
        return W.round(cur.t2 * 1.05, decimals());
      }
      function resetPrice() {
        priceSl.setRange(lo(), hi(), stepFor());
        priceSl.set(cur.ref);
      }

      function status(p) {
        if (p <= cur.stop) return { tone: "bad", t: "<b>收盤跌破停損 " + fmt.num(cur.stop, decimals()) + "。</b>計畫的規則是「停損看收盤價、隔天執行」，而且跌破停損的股票不攤平，改用候補股替換。" };
        if (p < cur.buy[0]) return { tone: "alert", t: "<b>低於買進區、還沒到停損。</b>計畫沒有要你在這裡加碼；它代表走勢比預期弱，盯緊停損。" };
        if (p <= cur.buy[1]) return { tone: "good", t: "<b>在分批買進區（" + fmt.num(cur.buy[0], decimals()) + "–" + fmt.num(cur.buy[1], decimals()) + "）。</b>依計畫分 2–3 筆掛單，不要一次買滿。" };
        if (p < cur.t1) return { tone: "warn", t: "<b>高於買進區、還沒到目標 1。</b>不追價：等拉回進區，或依「同比例重算」用新的參考價重訂買進區與停損。" };
        if (p < cur.t2) return { tone: "good", t: "<b>到達目標 1（" + fmt.num(cur.t1, decimals()) + "）。</b>賣出 1/3，剩下的部位把停損上移到成本價。" };
        return { tone: "good", t: "<b>到達目標 2（" + fmt.num(cur.t2, decimals()) + "）。</b>再賣 1/3；最後 1/3 用 10 日線或「高點回落 15%」做移動停利。" };
      }

      function update() {
        var p = priceSl.get();
        var dRef = p / cur.ref - 1;
        var dStop = cur.stop / p - 1;
        var dT1 = cur.t1 / p - 1;
        var risk = p - cur.stop,
          reward = cur.t1 - p;
        ro.update({
          zone: { v: fmt.pct(dRef, 1, true), s: "參考價 " + fmt.num(cur.ref, decimals()) + (cur.approx ? "（約）" : ""), tone: dRef > 0 ? "up" : dRef < 0 ? "down" : "" },
          stop: { v: p > cur.stop ? fmt.pct(dStop, 1, true) : "已跌破", s: "停損 " + fmt.num(cur.stop, decimals()), tone: "down" },
          t1: { v: p < cur.t1 ? fmt.pct(dT1, 1, true) : "已達成", s: "目標1 " + fmt.num(cur.t1, decimals()) + "　目標2 " + fmt.num(cur.t2, decimals()), tone: "up" },
          rr: { v: risk > 0 && reward > 0 ? "1 : " + fmt.num(reward / risk, 2) : "—", s: "可能賺的 ÷ 可能賠的" },
        });
        var st = status(p);
        vd.set(st.tone, st.t);
        var g = HB.planGroup(cur.group);
        info.textContent = cur.name + " " + cur.code + "｜" + g.name + "｜權重 " + cur.w + "%" + (cur.w0 ? "（原 " + cur.w0 + "%）" : "") + "｜" + cur.note;
        ch.redraw();
      }

      function draw(svg, w, hh) {
        var p = priceSl.get();
        var m = { l: 14, r: 14 };
        var x = W.scale(lo(), hi(), m.l, w - m.r);
        var axisY = hh - 44;
        svg.setAttribute("aria-label", cur.name + " 的價格階梯");
        /* zones */
        svg.appendChild(s("rect", { x: x(lo()), y: axisY - 26, width: x(cur.stop) - x(lo()), height: 26, fill: "var(--sig-red)", opacity: 0.1 }));
        svg.appendChild(s("rect", { x: x(cur.buy[0]), y: axisY - 26, width: x(cur.buy[1]) - x(cur.buy[0]), height: 26, fill: "var(--engrave-soft)" }));
        svg.appendChild(s("rect", { x: x(cur.t1), y: axisY - 26, width: x(hi()) - x(cur.t1), height: 26, fill: "var(--sig-green)", opacity: 0.1 }));
        svg.appendChild(s("line", { x1: m.l, x2: w - m.r, y1: axisY, y2: axisY, stroke: "var(--ink)", "stroke-width": 1 }));
        var marks = [
          { v: cur.stop, t: "停損", c: "var(--sig-red)", row: 0 },
          { v: cur.buy[0], t: "買進區", c: "var(--engrave)", row: 1 },
          { v: cur.ref, t: "參考價", c: "var(--ink-2)", row: 0 },
          { v: cur.t1, t: "目標1", c: "var(--sig-green)", row: 1 },
          { v: cur.t2, t: "目標2", c: "var(--sig-green)", row: 0 },
        ];
        marks.forEach(function (mk) {
          var xx = x(mk.v);
          svg.appendChild(s("line", { x1: xx, x2: xx, y1: axisY - 26, y2: axisY + 6, stroke: mk.c, "stroke-width": 2 }));
          var ty = axisY + 20 + mk.row * 16;
          var anchor = xx < 50 ? "start" : xx > w - 50 ? "end" : "middle";
          svg.appendChild(s("text", { x: xx, y: ty, "text-anchor": anchor, "font-size": 12, fill: "var(--ink-2)", text: mk.t + " " + fmt.num(mk.v, decimals()) }));
        });
        /* current price pin */
        var px = x(p);
        svg.appendChild(s("path", { d: "M" + px + " " + (axisY - 30) + " l-7 -12 h14 z", fill: "var(--ink)" }));
        svg.appendChild(s("text", { x: Math.min(Math.max(px, 40), w - 40), y: axisY - 48, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--ink)", text: "現價 " + fmt.num(p, decimals()) }));
      }

      resetPrice();
      update();
    },
  });

  /* ======================================================================
     allocation — 分組權重甜甜圈；點分組看個股；切換原權重／調整後
     ====================================================================== */
  HB.defineWidget("allocation", {
    title: "20 檔配置：分組與權重",
    init: function (body) {
      var mode = "now";
      var sel = "core";
      var modeSeg = W.seg({ label: "權重版本", options: [["now", "調整後（v2）"], ["orig", "原始版本"]], value: mode, onChange: function (v) { mode = v; update(); } });
      body.appendChild(h("div", { class: "w-controls" }, [modeSeg.el]));
      var wrap = h("div", { style: "display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));align-items:center" });
      body.appendChild(wrap);
      var donutHost = h("div", { class: "w-chart", style: "max-width:300px;margin-inline:auto;width:100%" });
      var list = h("div");
      wrap.appendChild(donutHost);
      wrap.appendChild(list);
      var colors = { core: "var(--cat-1)", growth: "var(--cat-2)", beta: "var(--cat-3)", hedge: "var(--cat-4)", cash: "var(--ink-3)" };

      function weightOf(st) {
        return mode === "orig" && st.w0 ? st.w0 : st.w;
      }
      function groupWeight(g) {
        if (g.id === "cash") return 12;
        return HB.plan.stocks
          .filter(function (st) {
            return st.group === g.id;
          })
          .reduce(function (a, st) {
            return a + weightOf(st);
          }, 0);
      }

      function update() {
        donutHost.innerHTML = "";
        var size = 280,
          c = size / 2,
          R = 120,
          r = 78;
        var svg = s("svg", { viewBox: "0 0 " + size + " " + size, role: "img", "aria-label": "分組權重圓環圖" });
        var a0 = -Math.PI / 2;
        var total = HB.plan.groups.reduce(function (a, g) {
          return a + groupWeight(g);
        }, 0);
        HB.plan.groups.forEach(function (g) {
          var wgt = groupWeight(g);
          var a1 = a0 + (wgt / total) * Math.PI * 2;
          var gap = 0.012;
          var p0 = a0 + gap,
            p1 = a1 - gap;
          var large = p1 - p0 > Math.PI ? 1 : 0;
          var R2 = sel === g.id ? R + 6 : R;
          var d =
            "M" + (c + R2 * Math.cos(p0)) + " " + (c + R2 * Math.sin(p0)) +
            " A" + R2 + " " + R2 + " 0 " + large + " 1 " + (c + R2 * Math.cos(p1)) + " " + (c + R2 * Math.sin(p1)) +
            " L" + (c + r * Math.cos(p1)) + " " + (c + r * Math.sin(p1)) +
            " A" + r + " " + r + " 0 " + large + " 0 " + (c + r * Math.cos(p0)) + " " + (c + r * Math.sin(p0)) + "Z";
          var path = s("path", { d: d, fill: colors[g.id], opacity: sel === g.id ? 1 : 0.55, tabindex: 0, role: "button", "aria-label": g.name + " " + wgt + "%" });
          path.style.cursor = "pointer";
          path.addEventListener("click", function () {
            sel = g.id;
            update();
          });
          path.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              sel = g.id;
              update();
            }
          });
          svg.appendChild(path);
          var mid = (a0 + a1) / 2;
          var lx = c + (R + r) / 2 * Math.cos(mid),
            ly = c + (R + r) / 2 * Math.sin(mid);
          if (wgt >= 7) svg.appendChild(s("text", { x: lx, y: ly + 4, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "#fff", "pointer-events": "none", text: wgt + "%" }));
          a0 = a1;
        });
        var gsel = HB.planGroup(sel);
        svg.appendChild(s("text", { x: c, y: c - 4, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--ink)", text: gsel.name }));
        svg.appendChild(s("text", { x: c, y: c + 18, "text-anchor": "middle", class: "mono", "font-size": 13, fill: "var(--ink-2)", text: groupWeight(gsel) + "%" }));
        donutHost.appendChild(svg);

        list.innerHTML = "";
        var legend = h("div", { class: "w-row", style: "margin-bottom:.8rem" });
        HB.plan.groups.forEach(function (g) {
          var b = h("button", { type: "button", class: "seg-like", "aria-pressed": String(sel === g.id), style: "appearance:none;border:1px solid var(--rule);background:" + (sel === g.id ? "var(--paper)" : "transparent") + ";color:var(--ink);font:inherit;font-size:.78rem;padding:3px 10px;border-radius:999px;cursor:pointer" }, [
            h("span", { class: "key-dot", style: "--c:" + colors[g.id] }),
            g.name + " " + groupWeight(g) + "%",
          ]);
          b.addEventListener("click", function () {
            sel = g.id;
            update();
          });
          legend.appendChild(b);
        });
        list.appendChild(legend);
        list.appendChild(h("p", { class: "widget-note", style: "margin-bottom:.6rem", text: gsel.note + (gsel.rule ? "。同比例重算規則：" + (gsel.rule.buy !== null ? "買在參考價 " + gsel.rule.buy + "% 內、" : "等拉回才買、") + "停損約 " + gsel.rule.stop + "%" : "") }));
        var rows = HB.plan.stocks.filter(function (st) {
          return st.group === sel;
        });
        if (!rows.length) {
          list.appendChild(h("p", { text: "現金 12%：留給加碼與應急。分散不只是買很多檔，也包括保留不用的錢。" }));
          return;
        }
        var max = 12;
        rows.forEach(function (st) {
          var wgt = weightOf(st);
          list.appendChild(
            h("div", { style: "display:grid;grid-template-columns:6.5rem minmax(0,1fr) 3.2rem;gap:8px;align-items:center;padding:3px 0;font-size:.85rem" }, [
              h("span", { text: st.name + " " + st.code }),
              h("span", { style: "height:10px;background:var(--paper-2);border-radius:2px;overflow:hidden" }, [h("span", { style: "display:block;height:100%;border-radius:0 2px 2px 0;width:" + (wgt / max) * 100 + "%;background:" + colors[sel] })]),
              h("span", { class: "mono", style: "text-align:right", text: wgt + "%" + (st.w0 && mode === "now" ? "*" : "") }),
            ])
          );
        });
        if (mode === "now" && rows.some(function (st) { return st.w0; })) list.appendChild(h("p", { class: "widget-note", text: "* 依供應鏈分析調整過的權重（第十一節）。" }));
      }
      update();
    },
  });

  /* ======================================================================
     sizing — 本金 × 權重 → 金額、零股股數、分批掛單、手續費估算
     data-capital (default 1,000,000) data-code (default "8046")
     ====================================================================== */
  HB.defineWidget("sizing", {
    title: "部位計算：權重換算成股數",
    init: function (body, cfg) {
      var stocks = HB.plan.stocks;
      var byCode = {};
      stocks.forEach(function (st) {
        byCode[st.code] = st;
      });
      var cur = byCode[String(cfg.code || "8046")] || stocks[0];
      var cap = W.number({ label: "總資金", suffix: "元", value: cfg.capital || 1000000, step: 10000, min: 10000, onInput: update });
      var pick = W.select({
        label: "股票",
        options: stocks.map(function (st) {
          return [st.code, st.name + " " + st.code + "（" + st.w + "%）"];
        }),
        value: cur.code,
        onChange: function (v) {
          cur = byCode[v];
          wt.set(cur.w);
          px.set(cur.ref);
          update();
        },
      });
      var wt = W.number({ label: "權重", suffix: "%", value: cur.w, step: 0.5, min: 0.5, max: 100, onInput: update });
      var px = W.number({ label: "買進價", suffix: "元", value: cur.ref, step: 0.5, min: 1, onInput: update });
      var tr = W.seg({ label: "分幾筆掛單", options: [[1, "1 筆"], [2, "2 筆"], [3, "3 筆"]], value: 3, onChange: update });
      var disc = W.seg({ label: "手續費折扣", options: [[10, "不打折"], [6, "6 折"], [2.8, "2.8 折"]], value: 6, onChange: update });
      body.appendChild(h("div", { class: "w-controls" }, [cap.el, pick.el, wt.el, px.el, tr.el, disc.el]));
      var ro = W.readout([
        { key: "amt", k: "這檔要投入的金額" },
        { key: "sh", k: "可買股數" },
        { key: "lots", k: "每筆掛單" },
        { key: "fee", k: "買進手續費（估）" },
      ]);
      body.appendChild(ro.el);
      var vd = W.verdict();
      body.appendChild(vd.el);

      function update() {
        var amt = cap.get() * (wt.get() / 100);
        var p = px.get();
        var shares = Math.floor(amt / p);
        var n = tr.get();
        var per = Math.floor(shares / n);
        var rate = 0.001425 * (disc.get() / 10);
        var fee = Math.max(1, Math.floor(shares * p * rate));
        ro.update({
          amt: { v: fmt.num(amt) + " 元", s: wt.get() + "% × " + fmt.wan(cap.get()) },
          sh: { v: fmt.num(shares) + " 股", s: shares >= 1000 ? "約 " + fmt.num(shares / 1000, 1) + " 張" : "不到 1 張，用零股" },
          lots: { v: n > 1 ? fmt.num(per) + " 股 × " + n : fmt.num(shares) + " 股", s: n > 1 ? "餘 " + (shares - per * n) + " 股併入最後一筆" : "一次買進" },
          fee: { v: fmt.num(fee) + " 元", s: "0.1425% × " + disc.get() + " 折（最低收費依券商規定）" },
        });
        if (shares < 1) vd.set("bad", "<b>這筆金額連 1 股都買不到。</b>提高權重或總資金，或換一檔價格較低的股票。");
        else if (shares < 1000) vd.set("warn", "<b>一張要 " + fmt.wan(p * 1000) + " 元，超過這檔的預算，所以用盤中零股。</b>零股以「股」為單位，記得掛限價單；成交量比整股少，價格可能不連續。");
        else vd.set("good", "金額夠買整張。整股以 1,000 股為一張，不足一張的部分可以用零股補。");
      }
      update();
    },
  });
})();
