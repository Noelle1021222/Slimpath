/* 讀通投資 — interactive instruments.
   Usage in a page:
     <div class="widget" data-widget="margin" data-own="1000000"></div>
   Every widget reads its options from data-* attributes (numbers are parsed),
   renders controls + readouts + an optional chart, and redraws on resize and
   on theme change. Register new ones with HB.defineWidget(name, spec). */
(function () {
  "use strict";
  var HB = (window.HB = window.HB || {});
  var doc = document;
  var SVGNS = "http://www.w3.org/2000/svg";
  var registry = {};
  var uidCount = 0;

  /* ---------- formatting ---------- */
  function round(x, d) {
    var m = Math.pow(10, d || 0);
    return Math.round(x * m) / m;
  }
  var fmt = {
    num: function (x, d) {
      if (!isFinite(x)) return "—";
      return Number(round(x, d || 0)).toLocaleString("zh-TW", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
    },
    /* x is a fraction: 0.123 -> "+12.3%" */
    pct: function (x, d, sign) {
      if (!isFinite(x)) return "—";
      var v = round(x * 100, d === undefined ? 1 : d);
      var s = v.toLocaleString("zh-TW", { minimumFractionDigits: d === undefined ? 1 : d, maximumFractionDigits: d === undefined ? 1 : d });
      if (sign && v > 0) s = "+" + s;
      if (v < 0) s = s.replace("-", "−");
      return s + "%";
    },
    money: function (x, d) {
      if (!isFinite(x)) return "—";
      var s = fmt.num(Math.abs(x), d || 0);
      return (x < 0 ? "−" : "") + s + " 元";
    },
    signed: function (x, d) {
      if (!isFinite(x)) return "—";
      var s = fmt.num(Math.abs(x), d || 0);
      return (x > 0 ? "+" : x < 0 ? "−" : "") + s;
    },
    /* Compact Chinese units for big amounts: 1,250,000 -> 125 萬 */
    wan: function (x, d) {
      if (!isFinite(x)) return "—";
      var a = Math.abs(x);
      var s;
      if (a >= 1e8) s = fmt.num(a / 1e8, d === undefined ? 2 : d) + " 億";
      else if (a >= 1e4) s = fmt.num(a / 1e4, d === undefined ? 1 : d) + " 萬";
      else s = fmt.num(a, 0);
      return (x < 0 ? "−" : "") + s;
    },
  };

  /* ---------- DOM ---------- */
  function h(tag, attrs, kids) {
    return HB.h(tag, attrs, kids);
  }
  function s(tag, attrs) {
    var el = doc.createElementNS(SVGNS, tag);
    for (var k in attrs || {}) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      if (k === "text") el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    return el;
  }
  function uid(p) {
    uidCount += 1;
    return (p || "w") + "-" + uidCount;
  }

  function paintRange(input) {
    var min = parseFloat(input.min) || 0,
      max = parseFloat(input.max) || 100,
      v = parseFloat(input.value);
    input.style.setProperty("--p", (((v - min) / (max - min)) * 100).toFixed(2) + "%");
  }

  /* ---------- controls ---------- */
  function slider(o) {
    var id = uid("rng");
    var out = h("output", { for: id });
    var input = h("input", { type: "range", id: id, min: o.min, max: o.max, step: o.step || 1, value: o.value });
    var f = o.fmt || function (v) {
      return fmt.num(v, 0);
    };
    function sync() {
      out.textContent = f(parseFloat(input.value));
      paintRange(input);
    }
    input.addEventListener("input", function () {
      sync();
      if (o.onInput) o.onInput(parseFloat(input.value));
    });
    sync();
    var el = h("div", { class: "w-field" }, [h("label", { for: id }, [h("span", { text: o.label }), out]), input]);
    return {
      el: el,
      input: input,
      get: function () {
        return parseFloat(input.value);
      },
      set: function (v) {
        input.value = v;
        sync();
      },
      setRange: function (min, max, step) {
        input.min = min;
        input.max = max;
        if (step) input.step = step;
        sync();
      },
    };
  }

  function number(o) {
    var id = uid("num");
    var input = h("input", { type: "number", id: id, value: o.value, step: o.step || "any", min: o.min, max: o.max, inputmode: "decimal" });
    input.addEventListener("input", function () {
      var v = parseFloat(input.value);
      if (isFinite(v) && o.onInput) o.onInput(v);
    });
    var el = h("div", { class: "w-field" }, [h("label", { for: id }, [h("span", { text: o.label }), o.suffix ? h("span", { class: "w-val", text: o.suffix }) : null]), input]);
    return {
      el: el,
      input: input,
      get: function () {
        var v = parseFloat(input.value);
        return isFinite(v) ? v : o.value;
      },
      set: function (v) {
        input.value = v;
      },
    };
  }

  function seg(o) {
    var value = o.value;
    var wrap = h("div", { class: "seg", role: "group", "aria-label": o.label || "" });
    var buttons = o.options.map(function (opt) {
      var b = h("button", { type: "button", text: opt[1], "aria-pressed": String(opt[0] === value) });
      b.addEventListener("click", function () {
        set(opt[0]);
        if (o.onChange) o.onChange(value);
      });
      wrap.appendChild(b);
      return b;
    });
    function set(v) {
      value = v;
      buttons.forEach(function (b, i) {
        b.setAttribute("aria-pressed", String(o.options[i][0] === v));
      });
    }
    var el = o.label ? h("div", { class: "w-field" }, [h("span", { class: "w-label" }, [h("span", { text: o.label })]), wrap]) : wrap;
    return {
      el: el,
      get: function () {
        return value;
      },
      set: set,
    };
  }

  function select(o) {
    var id = uid("sel");
    var sel = h("select", { id: id });
    (o.groups || [{ options: o.options }]).forEach(function (g) {
      var parent = sel;
      if (g.label) {
        parent = h("optgroup", { label: g.label });
        sel.appendChild(parent);
      }
      g.options.forEach(function (opt) {
        parent.appendChild(h("option", { value: opt[0], text: opt[1] }));
      });
    });
    sel.value = o.value;
    sel.addEventListener("change", function () {
      if (o.onChange) o.onChange(sel.value);
    });
    var el = h("div", { class: "w-field" }, [h("label", { for: id }, [h("span", { text: o.label })]), sel]);
    return {
      el: el,
      get: function () {
        return sel.value;
      },
      set: function (v) {
        sel.value = v;
      },
    };
  }

  /* Read-out tiles: items = [{key, k}] ; update({key: {v, s, tone}}) */
  function readout(items) {
    var cells = {};
    var el = h(
      "div",
      { class: "w-readout", "aria-live": "polite" },
      items.map(function (it) {
        var v = h("span", { class: "v" });
        var sub = h("span", { class: "s" });
        cells[it.key] = { v: v, s: sub };
        return h("div", { class: "w-stat" }, [h("span", { class: "k", text: it.k }), v, sub]);
      })
    );
    return {
      el: el,
      update: function (map) {
        for (var k in map) {
          if (!cells[k]) continue;
          var m = map[k];
          cells[k].v.textContent = m.v;
          cells[k].v.className = "v" + (m.tone ? " " + m.tone : "");
          cells[k].s.textContent = m.s || "";
        }
      },
    };
  }

  function verdict() {
    var light = h("span", { class: "sig w" });
    var text = h("div");
    var el = h("div", { class: "w-verdict", role: "status" }, [light, text]);
    return {
      el: el,
      set: function (tone, html, sigClass) {
        el.setAttribute("data-tone", tone || "");
        light.className = "sig " + (sigClass || { good: "g", warn: "y", alert: "o", bad: "r" }[tone] || "w");
        text.innerHTML = html;
      },
    };
  }

  /* ---------- charts ---------- */
  function scale(d0, d1, r0, r1) {
    var f = function (v) {
      return r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
    };
    f.invert = function (p) {
      return d0 + ((p - r0) / (r1 - r0 || 1)) * (d1 - d0);
    };
    return f;
  }
  function ticks(min, max, count) {
    var span = max - min;
    if (!(span > 0)) return [min];
    var step = Math.pow(10, Math.floor(Math.log10(span / (count || 5))));
    var err = (span / (count || 5)) / step;
    if (err >= 7.5) step *= 10;
    else if (err >= 3.5) step *= 5;
    else if (err >= 1.5) step *= 2;
    var out = [];
    for (var v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(round(v, 10));
    return out;
  }
  function linePath(pts) {
    return pts
      .map(function (p, i) {
        return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
      })
      .join("");
  }

  /* chart(container, height, draw) — draw(svg, width, height) is called on
     every resize/theme change with a cleared <svg>. */
  function chart(host, height, draw) {
    var wrap = h("div", { class: "w-chart" });
    host.appendChild(wrap);
    var svg = s("svg", { role: "img" });
    wrap.appendChild(svg);
    var lastW = 0;
    function render(force) {
      var w = Math.max(260, Math.round(wrap.clientWidth || 600));
      if (!force && w === lastW) return;
      lastW = w;
      var hgt = typeof height === "function" ? height(w) : height;
      svg.setAttribute("viewBox", "0 0 " + w + " " + hgt);
      svg.setAttribute("width", w);
      svg.setAttribute("height", hgt);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      draw(svg, w, hgt);
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        render(false);
      }).observe(wrap);
    }
    doc.addEventListener("hb:theme", function () {
      render(true);
    });
    render(true);
    return {
      el: wrap,
      svg: svg,
      redraw: function () {
        render(true);
      },
    };
  }

  /* Gridlines + y labels. sc = y scale, x0..x1 = plot extent */
  function gridY(svg, sc, vals, x0, x1, f) {
    var g = s("g", { class: "grid" });
    vals.forEach(function (v) {
      var y = sc(v);
      g.appendChild(s("line", { x1: x0, x2: x1, y1: y, y2: y }));
      var t = s("text", { x: x0 - 6, y: y + 4, "text-anchor": "end", class: "mono", text: f ? f(v) : v });
      g.appendChild(t);
    });
    svg.appendChild(g);
    return g;
  }
  function labelsX(svg, sc, vals, y, f) {
    var g = s("g", { class: "tick" });
    vals.forEach(function (v) {
      g.appendChild(s("text", { x: sc(v), y: y, "text-anchor": "middle", class: "mono", text: f ? f(v) : v }));
    });
    svg.appendChild(g);
    return g;
  }

  /* CSS token -> colour string (for canvas-like needs); SVG uses var() directly */
  function token(name) {
    return getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
  }

  HB.W = {
    fmt: fmt,
    h: h,
    s: s,
    uid: uid,
    slider: slider,
    number: number,
    seg: seg,
    select: select,
    readout: readout,
    verdict: verdict,
    chart: chart,
    scale: scale,
    ticks: ticks,
    linePath: linePath,
    gridY: gridY,
    labelsX: labelsX,
    token: token,
    round: round,
  };

  /* ---------- registry & boot ---------- */
  HB.defineWidget = function (name, spec) {
    registry[name] = spec;
  };

  function parseData(el) {
    var cfg = {};
    for (var k in el.dataset) {
      var v = el.dataset[k];
      if (v !== "" && !isNaN(v) && /^-?[\d.]+(e-?\d+)?$/i.test(v.trim())) cfg[k] = parseFloat(v);
      else cfg[k] = v;
    }
    return cfg;
  }

  function mount(el) {
    if (el.getAttribute("data-mounted")) return;
    var name = el.getAttribute("data-widget");
    var spec = registry[name];
    el.setAttribute("data-mounted", "true");
    var cfg = parseData(el);
    var title = cfg.title || (spec && spec.title) || name;
    var head = h("div", { class: "widget-head" }, [h("span", { class: "w-tag", text: "互動" }), h("span", { class: "w-title", text: title })]);
    var body = h("div", { class: "widget-body" });
    var fallback = Array.prototype.slice.call(el.childNodes);
    el.innerHTML = "";
    el.appendChild(head);
    el.appendChild(body);
    if (!spec) {
      body.appendChild(h("p", { class: "w-error", text: "這個互動工具（" + name + "）還沒有載入。" }));
      fallback.forEach(function (n) {
        body.appendChild(n);
      });
      return;
    }
    try {
      spec.init(body, cfg, HB.W, el);
      if (cfg.note) body.appendChild(h("p", { class: "widget-note", text: cfg.note }));
    } catch (err) {
      body.innerHTML = "";
      body.appendChild(h("p", { class: "w-error", text: "互動工具載入失敗：" + err.message }));
      if (window.console) console.error(err);
    }
  }

  HB.mountWidgets = function (scope) {
    Array.prototype.forEach.call((scope || doc).querySelectorAll(".widget[data-widget]"), mount);
  };

  function boot() {
    HB.mountWidgets();
  }
  /* Widgets register in later scripts (widgets-*.js); mount after all have loaded. */
  if (doc.readyState === "complete") setTimeout(boot, 0);
  else window.addEventListener("load", boot);
  doc.addEventListener("DOMContentLoaded", function () {
    setTimeout(boot, 0);
  });
})();
