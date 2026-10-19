/* 讀通投資 — cover page: certificate art, document decoder, K-line map, routes. */
(function () {
  "use strict";
  var HB = window.HB;
  var doc = document;
  var h = HB.h;
  var SVGNS = "http://www.w3.org/2000/svg";

  function s(tag, attrs, kids) {
    var el = doc.createElementNS(SVGNS, tag);
    for (var k in attrs || {}) if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) {
      el.appendChild(typeof c === "string" ? doc.createTextNode(c) : c);
    });
    return el;
  }
  function pathFrom(fn, steps, cx, cy) {
    var d = "";
    for (var i = 0; i <= steps; i++) {
      var p = fn(i / steps);
      d += (i ? "L" : "M") + (cx + p[0]).toFixed(2) + " " + (cy + p[1]).toFixed(2);
    }
    return d + "Z";
  }
  function hypo(R, r, d, radius, rot) {
    var k = radius / (R - r + d);
    return function (u) {
      var t = u * Math.PI * 2 * r;
      var x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      var y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      var c = Math.cos(rot || 0),
        sn = Math.sin(rot || 0);
      return [(x * c - y * sn) * k, (x * sn + y * c) * k];
    };
  }
  function waveRing(r0, amp, lobes, phase) {
    return function (u) {
      var t = u * Math.PI * 2;
      var r = r0 + amp * Math.sin(lobes * t + phase);
      return [r * Math.cos(t), r * Math.sin(t)];
    };
  }

  /* ---------- microprint ---------- */
  function microprint() {
    var phrase = "讀通投資 · MARKET FLUENCY HANDBOOK · 面額新臺幣壹拾元 · GCFIE v3.3-GOLD · 20 檔操作計畫 · 2026/10/16 · ";
    var latin = "MARKET FLUENCY HANDBOOK · NT$10 PAR VALUE · GCFIE v3.3-GOLD · 20-STOCK PLAN · 2026/10/16 · ";
    Array.prototype.forEach.call(doc.querySelectorAll(".micro"), function (el) {
      var vertical = el.classList.contains("micro-left") || el.classList.contains("micro-right");
      el.textContent = new Array(14).join(vertical ? latin : phrase);
    });
  }

  /* ---------- rosette ---------- */
  function rosette() {
    var host = doc.getElementById("rosette");
    if (!host) return;
    var C = 210;
    var svg = s("svg", { viewBox: "0 0 420 420", fill: "none", stroke: "currentColor" });
    var outer = s("g", { class: "draw-in", "stroke-width": "0.55", opacity: "0.9" });
    for (var i = 0; i < 7; i++) outer.appendChild(s("path", { d: pathFrom(waveRing(192, 9, 40, (i * Math.PI) / 7), 1600, C, C) }));
    for (var j = 0; j < 5; j++) outer.appendChild(s("path", { d: pathFrom(waveRing(170, 5, 28, (j * Math.PI) / 5), 1200, C, C), opacity: "0.7" }));
    var a = s("g", { class: "ring-a draw-in", "stroke-width": "0.6" });
    a.appendChild(s("path", { d: pathFrom(hypo(11, 7, 6.2, 150, 0), 2400, C, C) }));
    a.appendChild(s("path", { d: pathFrom(hypo(11, 7, 6.2, 150, Math.PI / 11), 2400, C, C), opacity: "0.6" }));
    var b = s("g", { class: "ring-b draw-in", "stroke-width": "0.7" });
    b.appendChild(s("path", { d: pathFrom(hypo(9, 4, 3.4, 98, 0), 1600, C, C) }));
    b.appendChild(s("path", { d: pathFrom(hypo(9, 4, 3.4, 98, Math.PI / 9), 1600, C, C), opacity: "0.55" }));
    var core = s("g", { class: "draw-in", "stroke-width": "0.8" });
    core.appendChild(s("path", { d: pathFrom(hypo(5, 3, 4.4, 44, 0), 900, C, C) }));
    core.appendChild(s("circle", { cx: C, cy: C, r: 3.2, fill: "currentColor", stroke: "none" }));
    svg.appendChild(outer);
    svg.appendChild(a);
    svg.appendChild(b);
    svg.appendChild(core);
    host.appendChild(svg);
    Array.prototype.forEach.call(svg.querySelectorAll(".draw-in path"), function (p) {
      p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 2);
    });
  }

  /* ---------- wave band ---------- */
  function waveband() {
    var host = doc.getElementById("waveband");
    if (!host) return;
    function draw() {
      host.innerHTML = "";
      var w = Math.max(320, host.clientWidth || 800),
        hh = 54;
      var svg = s("svg", { viewBox: "0 0 " + w + " " + hh, fill: "none", stroke: "currentColor", "stroke-width": "0.6", preserveAspectRatio: "none" });
      for (var i = 0; i < 6; i++) {
        var d = "";
        for (var x = 0; x <= w; x += 4) {
          var y = hh / 2 + Math.sin(x / 22 + (i * Math.PI) / 6) * 10 * Math.sin(x / 260 + i * 0.4) + Math.sin(x / 9 + i) * 2.2;
          d += (x ? "L" : "M") + x + " " + y.toFixed(2);
        }
        svg.appendChild(s("path", { d: d, opacity: (0.4 + i * 0.1).toFixed(2) }));
      }
      host.appendChild(svg);
    }
    draw();
    var t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(draw, 150);
    });
  }

  /* ---------- helpers ---------- */
  function done() {
    return HB.done();
  }
  function isReadable(sec, d) {
    return sec.needs.every(function (n) {
      return d.indexOf(n) !== -1;
    });
  }
  function chapterLink(n, d) {
    var c = HB.chapterByNum(n);
    return h("a", { class: "chip", href: HB.chapterHref(c), "data-done": String(d.indexOf(n) !== -1), title: c.title, text: String(n).padStart(2, "0") + " " + c.short });
  }

  /* ---------- decoder ---------- */
  function decoder() {
    var host = doc.getElementById("docs");
    if (!host) return;
    var d = done();
    var seen = HB.store.get("unlockedSeen", {});
    var nowSeen = {};
    host.innerHTML = "";
    HB.docs.forEach(function (docu) {
      var readable = docu.sections.filter(function (sec) {
        return isReadable(sec, d);
      }).length;
      var total = docu.sections.length;
      var bar = h("span", { style: "--w:" + ((readable / total) * 100).toFixed(1) + "%" });
      var card = h("article", { class: "doc-card", "aria-label": docu.name }, [
        h("header", { class: "doc-head" }, [
          h("span", { class: "doc-kind", text: docu.id === "gcfie" ? "規格書 · 每日 07:45" : "操作計畫 · 2026/10/16" }),
          h("h3", { class: "doc-name", text: docu.name }),
          h("p", { class: "doc-sub", text: docu.sub }),
          h("div", { class: "meter" }, [h("div", { class: "meter-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(readable), "aria-label": "可讀段落" }, [bar]), h("span", { class: "meter-num", text: "可讀 " + readable + " / " + total + " 節" })]),
        ]),
      ]);
      var ol = h("ol", { class: "doc-lines" });
      docu.sections.forEach(function (sec, i) {
        var key = docu.id + ":" + i;
        var ok = isReadable(sec, d);
        nowSeen[key] = ok;
        var missing = sec.needs.filter(function (n) {
          return d.indexOf(n) === -1;
        });
        var li = h("li", { class: "doc-line", "data-locked": String(!ok) });
        var need = h("div", { class: "doc-need", hidden: true }, [h("span", { text: ok ? "讀過的章節：" : "需要讀完：" })].concat(
          sec.needs.map(function (n) {
            return chapterLink(n, d);
          })
        ));
        var btn = h("button", { type: "button", "aria-expanded": "false" }, [
          h("span", { class: "ln", text: String(i + 1).padStart(2, "0") }),
          h("span", {}, [h("span", { class: "t", text: sec.t }), ok ? null : h("span", { class: "visually-hidden", text: "（尚未解鎖）" })]),
          h("span", { class: "st", text: ok ? "可讀" : "缺 " + missing.length + " 章" }),
        ]);
        btn.addEventListener("click", function () {
          var open = need.hidden;
          need.hidden = !open;
          btn.setAttribute("aria-expanded", String(open));
        });
        li.appendChild(btn);
        li.appendChild(need);
        ol.appendChild(li);
        /* newly unlocked since the last visit: start redacted, then reveal */
        if (ok && seen[key] === false) {
          li.setAttribute("data-locked", "true");
          setTimeout(function () {
            li.setAttribute("data-locked", "false");
          }, 500 + i * 90);
        }
      });
      card.appendChild(ol);
      host.appendChild(card);
    });
    HB.store.set("unlockedSeen", nowSeen);
  }

  /* ---------- K-line map ---------- */
  function kchart() {
    var host = doc.getElementById("kchart");
    if (!host) return;
    function draw() {
      host.innerHTML = "";
      var d = done();
      var W = Math.max(640, host.clientWidth || 900);
      var H = 250;
      var m = { l: 34, r: 8, t: 18, b: 46 };
      var gap = 18;
      var n = HB.chapters.length;
      var slot = (W - m.l - m.r - gap * (HB.parts.length - 1)) / n;
      var bw = Math.min(14, slot * 0.56);
      var y = function (v) {
        return H - m.b - (v / 6.5) * (H - m.t - m.b);
      };
      var svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "38 章的難度與閱讀時間；已讀完的章節以實心 K 棒表示" });
      [1, 2, 3, 4, 5].forEach(function (v) {
        svg.appendChild(s("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "var(--rule-2)", "stroke-width": 1 }));
        svg.appendChild(s("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", class: "mono" }, [String(v)]));
      });
      svg.appendChild(s("text", { x: 0, y: m.t - 4, class: "mono" }, ["難度"]));
      var x = m.l;
      HB.parts.forEach(function (p, pi) {
        var chs = HB.chapters.filter(function (c) {
          return c.part === p.n;
        });
        var x0 = x;
        chs.forEach(function (c) {
          var cx = x + slot / 2;
          var isDone = d.indexOf(c.n) !== -1;
          var top = y(c.level);
          var wickTop = y(c.level + c.min / 30);
          var a = s("a", { href: HB.chapterHref(c), "aria-label": "第 " + c.n + " 章 " + c.title + (isDone ? "（已讀完）" : "") });
          a.appendChild(s("title", {}, ["第 " + c.n + " 章 · " + c.title + " · 約 " + c.min + " 分鐘"]));
          a.appendChild(s("rect", { x: cx - slot / 2, y: m.t, width: slot, height: H - m.t - m.b, fill: "transparent" }));
          a.appendChild(s("line", { x1: cx, x2: cx, y1: wickTop, y2: top, stroke: isDone ? "var(--up)" : "var(--ink-2)", "stroke-width": 1.2 }));
          a.appendChild(s("rect", { x: cx - bw / 2, y: top, width: bw, height: y(0) - top, rx: 1.5, fill: isDone ? "var(--up)" : "var(--plate)", stroke: isDone ? "var(--up)" : "var(--ink-2)", "stroke-width": 1.2 }));
          svg.appendChild(a);
          x += slot;
        });
        var mid = (x0 + x) / 2;
        svg.appendChild(s("line", { x1: x0 + 2, x2: x - 2, y1: H - m.b + 8, y2: H - m.b + 8, stroke: "var(--ink)", "stroke-width": 1 }));
        svg.appendChild(s("text", { x: mid, y: H - m.b + 26, "text-anchor": "middle", "font-weight": 700, fill: "var(--ink)" }, [p.name]));
        svg.appendChild(s("text", { x: mid, y: H - m.b + 41, "text-anchor": "middle", class: "mono" }, ["第" + p.n + "部"]));
        x += gap;
        if (pi === HB.parts.length - 1) return;
      });
      svg.appendChild(s("line", { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: "var(--ink)", "stroke-width": 1 }));
      host.appendChild(svg);
    }
    draw();
    var legend = h("div", { class: "kchart-legend" }, [
      h("span", {}, [h("i"), "未讀"]),
      h("span", {}, [h("i", { class: "done" }), "已讀完"]),
      h("span", { text: "實體高度＝難度　上影線＝閱讀時間" }),
    ]);
    host.parentNode.insertBefore(legend, host.nextSibling);
    var t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(draw, 150);
    });
    doc.addEventListener("hb:theme", draw);
    HB._redrawK = draw;
  }

  /* ---------- parts list ---------- */
  function parts() {
    var host = doc.getElementById("parts");
    if (!host) return;
    var d = done();
    host.innerHTML = "";
    HB.parts.forEach(function (p) {
      var ol = h("ol");
      HB.chapters
        .filter(function (c) {
          return c.part === p.n;
        })
        .forEach(function (c) {
          ol.appendChild(
            h("li", { "data-done": String(d.indexOf(c.n) !== -1) }, [
              h("a", { href: HB.chapterHref(c) }, [h("span", { class: "pn", text: String(c.n).padStart(2, "0") }), h("span", { class: "pt", text: c.short }), h("span", { class: "pm", text: c.min + "′" })]),
            ])
          );
        });
      host.appendChild(
        h("section", { class: "part", "aria-label": "第" + p.n + "部 " + p.name }, [
          h("div", { class: "part-head" }, [h("span", { class: "part-n", text: String(p.n) }), h("span", { class: "part-name", text: p.name }), h("span", { class: "part-title", text: p.title })]),
          ol,
        ])
      );
    });
  }

  /* ---------- routes ---------- */
  function routes() {
    var host = doc.getElementById("route-grid");
    if (!host) return;
    var d = done();
    function unionNeeds(id) {
      var set = {};
      HB.docs
        .filter(function (x) {
          return x.id === id;
        })[0]
        .sections.forEach(function (sec) {
          sec.needs.forEach(function (n) {
            set[n] = true;
          });
        });
      return Object.keys(set)
        .map(Number)
        .sort(function (a, b) {
          return a - b;
        });
    }
    var all = HB.chapters.map(function (c) {
      return c.n;
    });
    var list = [
      { name: "完整路線", desc: "照順序讀完 38 章。最紮實，適合完全新手：每一章都只用到前面教過的東西。", nums: all },
      { name: "直攻 GCFIE", desc: "只讀解鎖 GCFIE 每一節所需要的章節。適合已經懂股票基本面、想先看懂每日盤前報告的人。", nums: unionNeeds("gcfie") },
      { name: "直攻 20 檔計畫", desc: "只讀看懂操作計畫所需要的章節：交易規則、估值、配置、紀律與 AI 供應鏈。", nums: unionNeeds("plan") },
    ];
    host.innerHTML = "";
    list.forEach(function (r) {
      var mins = r.nums.reduce(function (a, n) {
        return a + HB.chapterByNum(n).min;
      }, 0);
      var left = r.nums.filter(function (n) {
        return d.indexOf(n) === -1;
      });
      var next = left.length ? HB.chapterByNum(left[0]) : null;
      host.appendChild(
        h("article", { class: "route" }, [
          h("h3", { text: r.name }),
          h("span", { class: "r-meta", text: r.nums.length + " 章 · 約 " + Math.round(mins / 6) / 10 + " 小時 · 剩 " + left.length + " 章" }),
          h("p", { text: r.desc }),
          h(
            "div",
            { class: "r-chips" },
            r.nums.map(function (n) {
              var c = HB.chapterByNum(n);
              return h("a", { class: "chip", href: HB.chapterHref(c), title: c.title, "data-done": String(d.indexOf(n) !== -1), text: String(n).padStart(2, "0") });
            })
          ),
          next ? h("a", { class: "btn primary", href: HB.chapterHref(next), text: (left.length === r.nums.length ? "開始：" : "繼續：") + "第 " + next.n + " 章" }) : h("span", { class: "r-meta", text: "這條路線已經讀完。" }),
        ])
      );
    });
  }

  /* ---------- stats ---------- */
  function stats() {
    var terms = Object.keys(HB.glossary || {}).length;
    var el = doc.getElementById("stat-terms");
    if (el) el.textContent = terms ? String(terms) : "—";
    var dn = doc.getElementById("stat-done");
    if (dn) dn.textContent = String(done().length);
    var cta = doc.getElementById("cta-start");
    var d = done();
    var next = HB.chapters.filter(function (c) {
      return d.indexOf(c.n) === -1;
    })[0];
    if (cta && d.length && next) {
      cta.textContent = "繼續：第 " + next.n + " 章";
      cta.href = HB.chapterHref(next);
    }
  }

  function renderAll() {
    stats();
    decoder();
    parts();
    routes();
    if (HB._redrawK) HB._redrawK();
  }

  function boot() {
    microprint();
    rosette();
    waveband();
    kchart();
    renderAll();
    doc.addEventListener("hb:progress", renderAll);
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) renderAll();
    });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
