/* 讀通投資 — page shell shared by every page (classic script, works from file://).
   Renders the top bar, contents drawer, side contents, pager and footer from
   curriculum.js, and wires glossary pop-overs, quizzes, checklists, progress. */
(function () {
  "use strict";
  var HB = (window.HB = window.HB || {});
  var doc = document;
  var root = doc.documentElement;

  /* ---------- paths ---------- */
  var script = doc.currentScript;
  var ROOT = "";
  if (script && script.getAttribute("src")) {
    ROOT = script.getAttribute("src").replace(/assets\/js\/handbook\.js.*$/, "");
  }
  HB.root = ROOT;
  HB.chapterHref = function (c) {
    return ROOT + "chapters/" + c.slug + ".html";
  };

  /* ---------- storage (per-reader conveniences; may be unavailable) ---------- */
  HB.store = {
    get: function (k, fallback) {
      try {
        var v = localStorage.getItem("hb." + k);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem("hb." + k, JSON.stringify(v));
      } catch (e) {
        /* storage blocked: the page still works, it just forgets */
      }
    },
  };

  HB.done = function () {
    var d = HB.store.get("done", []);
    return Array.isArray(d) ? d : [];
  };
  HB.isDone = function (n) {
    return HB.done().indexOf(n) !== -1;
  };
  HB.setDone = function (n, on) {
    var d = HB.done().filter(function (x) {
      return x !== n;
    });
    if (on) d.push(n);
    d.sort(function (a, b) {
      return a - b;
    });
    HB.store.set("done", d);
    doc.dispatchEvent(new CustomEvent("hb:progress", { detail: { done: d } }));
  };

  /* ---------- reader preferences ---------- */
  function applyPrefs() {
    var theme = HB.store.get("theme", "system");
    if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
    var quote = HB.store.get("quote", "tw");
    if (quote === "intl") root.setAttribute("data-quote", "intl");
    else root.removeAttribute("data-quote");
    var size = HB.store.get("size", "md");
    if (size === "lg") root.setAttribute("data-size", "lg");
    else root.removeAttribute("data-size");
  }
  applyPrefs();

  /* ---------- tiny DOM helpers ---------- */
  function h(tag, attrs, kids) {
    var el = doc.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === "html") el.innerHTML = v;
        else if (k === "text") el.textContent = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    (kids || []).forEach(function (kid) {
      if (kid === null || kid === undefined) return;
      el.appendChild(typeof kid === "string" ? doc.createTextNode(kid) : kid);
    });
    return el;
  }
  HB.h = h;

  /* ---------- guilloché rosette (the handbook's mark) ---------- */
  HB.rosette = function (opts) {
    opts = opts || {};
    var size = opts.size || 100;
    var c = size / 2;
    var curves = opts.curves || [
      { R: 7, r: 3, d: 4.6, rot: 0 },
      { R: 7, r: 3, d: 4.6, rot: Math.PI / 7 },
    ];
    var steps = opts.steps || 900;
    var paths = curves.map(function (cv) {
      var R = cv.R,
        r = cv.r,
        d = cv.d;
      var max = R - r + d;
      var k = (c * (cv.scale || 0.94)) / max;
      var turns = cv.turns || r;
      var pts = [];
      for (var i = 0; i <= steps; i++) {
        var t = (i / steps) * Math.PI * 2 * turns;
        var x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
        var y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        var cr = Math.cos(cv.rot || 0),
          sr = Math.sin(cv.rot || 0);
        var xr = x * cr - y * sr,
          yr = x * sr + y * cr;
        pts.push((c + xr * k).toFixed(2) + " " + (c + yr * k).toFixed(2));
      }
      return '<path class="' + (cv.cls || "") + '" d="M' + pts.join(" L") + 'Z" fill="none" stroke="currentColor" stroke-width="' + (cv.w || 0.8) + '" stroke-linejoin="round"/>';
    });
    return (
      '<svg viewBox="0 0 ' + size + " " + size + '" aria-hidden="true" focusable="false"' + (opts.cls ? ' class="' + opts.cls + '"' : "") + ">" + paths.join("") + "</svg>"
    );
  };

  var ICON = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  };

  function isDarkNow() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /* ---------- page context ---------- */
  var slug = doc.body.getAttribute("data-chapter");
  var current = slug ? HB.chapterBySlug(slug) : null;
  var pageKind = doc.body.getAttribute("data-page") || (current ? "chapter" : "page");

  /* ---------- top bar + drawer ---------- */
  function buildTopbar() {
    var crumb = h("div", { class: "crumb" });
    if (current) {
      var part = HB.parts[current.part - 1];
      crumb.appendChild(h("span", { class: "crumb-num", text: String(current.n).padStart(2, "0") }));
      crumb.appendChild(h("span", { class: "crumb-title", text: current.short }));
      crumb.setAttribute("title", "第" + part.n + "部 " + part.name + " · " + current.title);
    } else {
      var label = doc.body.getAttribute("data-crumb");
      if (label) crumb.appendChild(h("span", { class: "crumb-title", text: label }));
    }
    var themeBtn = h("button", {
      class: "icon-btn",
      type: "button",
      "aria-label": "切換深淺色",
      html: isDarkNow() ? ICON.sun : ICON.moon,
      onclick: function () {
        var next = isDarkNow() ? "light" : "dark";
        HB.store.set("theme", next);
        applyPrefs();
        themeBtn.innerHTML = isDarkNow() ? ICON.sun : ICON.moon;
        syncSettings();
        doc.dispatchEvent(new CustomEvent("hb:theme"));
      },
    });
    var glossBtn = h("a", { class: "icon-btn", href: ROOT + "glossary.html", "aria-label": "名詞總表", title: "名詞總表", html: ICON.book });
    var menuBtn = h("button", {
      class: "icon-btn",
      type: "button",
      "aria-label": "目錄與設定",
      "aria-expanded": "false",
      "aria-controls": "hb-drawer",
      html: ICON.menu,
      onclick: function () {
        openDrawer(true);
      },
    });
    var bar = h("header", { class: "topbar", role: "banner" }, [
      h("a", { class: "brand", href: ROOT + "index.html", "aria-label": "讀通投資 首頁" }, [
        h("span", { class: "brand-mark", html: HB.rosette({ size: 60, curves: [{ R: 5, r: 3, d: 4.2, w: 1.1 }, { R: 5, r: 3, d: 4.2, rot: Math.PI / 5, w: 1.1 }] }) }),
        h("span", { class: "brand-name", text: "讀通投資" }),
        h("span", { class: "brand-sub", text: "Market Fluency" }),
      ]),
      crumb,
      h("div", { class: "tools" }, [glossBtn, themeBtn, menuBtn]),
      h("div", { class: "readbar", "aria-hidden": "true" }),
    ]);
    doc.body.insertBefore(bar, doc.body.firstChild);
    doc.body.insertBefore(h("a", { class: "skip", href: "#main", text: "跳到內容" }), bar);
    HB._menuBtn = menuBtn;
    HB._themeBtn = themeBtn;
  }

  var drawer;
  var settingsSync = [];
  function syncSettings() {
    settingsSync.forEach(function (f) {
      f();
    });
    if (HB._themeBtn) HB._themeBtn.innerHTML = isDarkNow() ? ICON.sun : ICON.moon;
  }

  function seg(name, options, key, fallback) {
    var wrap = h("div", { class: "seg", role: "group", "aria-label": name });
    var buttons = options.map(function (o) {
      return h("button", {
        type: "button",
        text: o[1],
        "data-v": o[0],
        onclick: function () {
          HB.store.set(key, o[0]);
          applyPrefs();
          syncSettings();
          doc.dispatchEvent(new CustomEvent("hb:theme"));
        },
      });
    });
    buttons.forEach(function (b) {
      wrap.appendChild(b);
    });
    settingsSync.push(function () {
      var v = HB.store.get(key, fallback);
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === v));
      });
    });
    return wrap;
  }

  function buildDrawer() {
    var done = HB.done();
    var list = h("nav", { "aria-label": "全書目錄" });
    list.appendChild(
      h("ol", { class: "toc-list", style: "margin-top:14px" }, [
        h("li", {}, [h("a", { href: ROOT + "index.html", "aria-current": pageKind === "home" ? "page" : null }, [h("span", { class: "toc-n", text: "◎" }), h("span", { text: "封面與學習地圖" }), h("span")])]),
        h("li", {}, [h("a", { href: ROOT + "glossary.html", "aria-current": pageKind === "glossary" ? "page" : null }, [h("span", { class: "toc-n", text: "§" }), h("span", { text: "名詞總表" }), h("span")])]),
        h("li", {}, [h("a", { href: ROOT + "formulas.html", "aria-current": pageKind === "formulas" ? "page" : null }, [h("span", { class: "toc-n", text: "ƒ" }), h("span", { text: "公式卡" }), h("span")])]),
      ])
    );
    HB.parts.forEach(function (p) {
      var ol = h("ol", { class: "toc-list" });
      HB.chapters
        .filter(function (c) {
          return c.part === p.n;
        })
        .forEach(function (c) {
          ol.appendChild(
            h("li", {}, [
              h("a", { href: HB.chapterHref(c), "aria-current": current && current.n === c.n ? "page" : null }, [
                h("span", { class: "toc-n", text: String(c.n).padStart(2, "0") }),
                h("span", { text: c.short }),
                h("span", { class: "toc-done", "data-done": String(done.indexOf(c.n) !== -1), title: done.indexOf(c.n) !== -1 ? "已讀完" : "未讀" }),
              ]),
            ])
          );
        });
      list.appendChild(h("div", { class: "toc-part" }, [h("p", { class: "toc-part-title", text: "第" + p.n + "部 · " + p.name + "　" + p.en }), ol]));
    });

    var settings = h("div", { class: "drawer-settings" }, [
      h("div", { class: "setting" }, [h("span", { text: "外觀" }), seg("外觀", [["system", "跟隨系統"], ["light", "淺色"], ["dark", "深色"]], "theme", "system")]),
      h("div", { class: "setting" }, [h("span", { text: "漲跌顏色" }), seg("漲跌顏色", [["tw", "紅漲綠跌"], ["intl", "綠漲紅跌"]], "quote", "tw")]),
      h("div", { class: "setting" }, [h("span", { text: "字級" }), seg("字級", [["md", "標準"], ["lg", "放大"]], "size", "md")]),
    ]);

    drawer = h("div", { class: "drawer", id: "hb-drawer", "data-open": "false", "aria-hidden": "true" }, [
      h("div", { class: "drawer-panel", role: "dialog", "aria-modal": "true", "aria-label": "目錄與設定" }, [
        h("div", { class: "drawer-head" }, [
          h("h2", { text: "目錄與設定" }),
          h("button", { class: "icon-btn", type: "button", "aria-label": "關閉", html: ICON.close, onclick: function () { openDrawer(false); } }),
        ]),
        settings,
        list,
      ]),
    ]);
    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) openDrawer(false);
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.getAttribute("data-open") === "true") openDrawer(false);
    });
    doc.body.appendChild(drawer);
    syncSettings();
  }

  function openDrawer(open) {
    drawer.setAttribute("data-open", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
    HB._menuBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      var cur = drawer.querySelector('[aria-current="page"]');
      var btn = drawer.querySelector(".drawer-head .icon-btn");
      if (btn) btn.focus();
      if (cur) cur.scrollIntoView({ block: "center" });
    } else {
      HB._menuBtn.focus();
    }
  }

  /* ---------- chapter furniture ---------- */
  function buildSideToc() {
    var chapter = doc.querySelector(".chapter");
    if (!chapter) return;
    var heads = Array.prototype.slice.call(chapter.querySelectorAll(".prose > section > h2"));
    if (!heads.length) return;
    var ol = h("ol");
    var links = heads.map(function (h2, i) {
      var sec = h2.parentElement;
      if (!sec.id) sec.id = "s" + (i + 1);
      var num = h2.querySelector(".sec-num");
      var title = h2.cloneNode(true);
      var n = title.querySelector(".sec-num");
      if (n) n.remove();
      var a = h("a", { href: "#" + sec.id }, [num ? h("span", { class: "st-num", text: num.textContent.trim() }) : null, title.textContent.trim()]);
      ol.appendChild(h("li", {}, [a]));
      return { a: a, sec: sec };
    });
    ["quiz-set", "recap"].forEach(function (cls) {
      var el = chapter.querySelector("." + cls);
      if (!el) return;
      if (!el.id) el.id = cls;
      var a = h("a", { href: "#" + el.id, text: cls === "recap" ? "本章重點" : "自我檢測" });
      ol.appendChild(h("li", {}, [a]));
      links.push({ a: a, sec: el });
    });
    var aside = h("nav", { class: "side-toc", "aria-label": "本章段落" }, [h("p", { class: "side-toc-title", text: "本章段落" }), ol]);
    var grid = chapter.parentElement;
    grid.insertBefore(aside, chapter);

    if ("IntersectionObserver" in window) {
      var active = null;
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              var hit = links.find(function (l) {
                return l.sec === en.target;
              });
              if (hit && hit !== active) {
                if (active) active.a.removeAttribute("aria-current");
                hit.a.setAttribute("aria-current", "true");
                active = hit;
              }
            }
          });
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      links.forEach(function (l) {
        io.observe(l.sec);
      });
    }
  }

  function buildOpenerMeta() {
    if (!current) return;
    var opener = doc.querySelector(".opener");
    if (!opener) return;
    var eyebrow = opener.querySelector(".eyebrow");
    var part = HB.parts[current.part - 1];
    if (eyebrow && !eyebrow.textContent.trim()) eyebrow.textContent = "第" + part.n + "部 · " + part.name + " — " + part.title;
    var num = opener.querySelector(".opener-num");
    if (num && !num.textContent.trim()) num.textContent = String(current.n).padStart(2, "0");
    var meta = opener.querySelector(".opener-meta");
    if (meta && !meta.children.length) {
      var dots = h("span", { class: "level", "aria-label": "難度 " + current.level + " / 5" });
      for (var i = 1; i <= 5; i++) dots.appendChild(h("i", { class: i <= current.level ? "on" : "" }));
      meta.appendChild(h("div", {}, [h("dt", { text: "難度" }), h("dd", {}, [dots])]));
      meta.appendChild(h("div", {}, [h("dt", { text: "閱讀" }), h("dd", { text: "約 " + current.min + " 分鐘" })]));
      var unlocks = [];
      HB.docs.forEach(function (d) {
        d.sections.forEach(function (s) {
          if (s.needs.indexOf(current.n) !== -1) unlocks.push(d.id === "gcfie" ? "GCFIE" : "20檔計畫");
        });
      });
      var uniq = unlocks.filter(function (v, i) {
        return unlocks.indexOf(v) === i;
      });
      if (uniq.length) {
        var count = {};
        unlocks.forEach(function (u) {
          count[u] = (count[u] || 0) + 1;
        });
        meta.appendChild(
          h("div", {}, [
            h("dt", { text: "解鎖" }),
            h(
              "dd",
              { class: "unlocks" },
              uniq.map(function (u) {
                return h("a", { class: "chip", href: ROOT + "index.html#decoder", text: u + " · " + count[u] + " 節" });
              })
            ),
          ])
        );
      }
    }
  }

  function buildDoneRow() {
    if (!current) return;
    var chapter = doc.querySelector(".chapter");
    if (!chapter) return;
    var row = chapter.querySelector(".done-row");
    if (!row) {
      row = h("div", { class: "done-row" });
      chapter.appendChild(row);
    }
    row.innerHTML = "";
    var msg = h("p");
    var btn = h("button", { class: "w-btn", type: "button" });
    function sync() {
      var d = HB.isDone(current.n);
      msg.textContent = d ? "這一章已標記為讀完。封面上的文件解碼器會把它算進去。" : "讀完並做完自我檢測後，標記這一章；封面的文件解碼器會解鎖相關段落。";
      btn.textContent = d ? "取消標記" : "標記為已讀完";
      btn.className = d ? "w-btn ghost" : "w-btn";
    }
    btn.addEventListener("click", function () {
      HB.setDone(current.n, !HB.isDone(current.n));
      sync();
    });
    sync();
    row.appendChild(msg);
    row.appendChild(btn);
  }

  function buildPager() {
    if (!current) return;
    var idx = HB.chapters.indexOf(current);
    var prev = HB.chapters[idx - 1];
    var next = HB.chapters[idx + 1];
    var nav = h("nav", { class: "pager", "aria-label": "上一章與下一章" });
    if (prev)
      nav.appendChild(
        h("a", { class: "prev", href: HB.chapterHref(prev), rel: "prev" }, [
          h("span", { class: "pg-dir", text: "← 上一章" }),
          h("span", { class: "pg-title" }, [h("span", { class: "pg-num", text: String(prev.n).padStart(2, "0") }), prev.short]),
        ])
      );
    else nav.appendChild(h("a", { class: "prev", href: ROOT + "index.html" }, [h("span", { class: "pg-dir", text: "← 回封面" }), h("span", { class: "pg-title", text: "學習地圖" })]));
    if (next)
      nav.appendChild(
        h("a", { class: "next", href: HB.chapterHref(next), rel: "next" }, [
          h("span", { class: "pg-dir", text: "下一章 →" }),
          h("span", { class: "pg-title" }, [h("span", { class: "pg-num", text: String(next.n).padStart(2, "0") }), next.short]),
        ])
      );
    else nav.appendChild(h("a", { class: "next", href: ROOT + "glossary.html" }, [h("span", { class: "pg-dir", text: "附錄 →" }), h("span", { class: "pg-title", text: "名詞總表" })]));
    var chapter = doc.querySelector(".chapter");
    chapter.appendChild(nav);
  }

  function buildFooter() {
    if (doc.querySelector(".site-foot")) return;
    doc.body.appendChild(
      h("footer", { class: "site-foot page" }, [
        h("div", { class: "inner" }, [
          h("p", {
            text: "本手冊是學習用的教材，不是投資建議。書中引用的「GCFIE v3.3-GOLD」與「台股 5 個月操作計畫（2026/10/16）」數字以原文件為準；市場資料、交易規則與費率會變動，下單前請以證交所、期交所、券商與公司公告為準。",
          }),
          h("p", { class: "mono", text: "讀通投資 · Market Fluency Handbook" }),
        ]),
      ])
    );
  }

  /* ---------- reading progress ---------- */
  function wireReadbar() {
    var bar = doc.querySelector(".readbar");
    if (!bar) return;
    var ticking = false;
    function update() {
      ticking = false;
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty("--read", p.toFixed(4));
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ---------- glossary pop-overs ---------- */
  var pop = null;
  var popOwner = null;
  function closePop() {
    if (pop) pop.remove();
    if (popOwner) popOwner.setAttribute("aria-expanded", "false");
    pop = null;
    popOwner = null;
  }
  HB.lookup = function (key) {
    var g = HB.glossary || {};
    if (g[key]) return g[key];
    var aliasOf = HB.glossaryAlias && HB.glossaryAlias[key];
    return aliasOf ? g[aliasOf] : null;
  };
  function showPop(el) {
    var key = el.getAttribute("data-term") || el.textContent.trim();
    if (popOwner === el) {
      closePop();
      return;
    }
    closePop();
    var entry = HB.lookup(key);
    var box = h("div", { class: "term-pop", role: "dialog", "aria-label": key });
    var title = h("h4", {}, [entry ? entry.term : key]);
    if (entry && entry.en) title.appendChild(h("span", { class: "en", text: entry.en }));
    box.appendChild(title);
    box.appendChild(h("p", { text: entry ? entry.def : "這個名詞的解釋還在名詞總表裡整理中。" }));
    if (entry && entry.ch) {
      var c = HB.chapterByNum(entry.ch);
      if (c && (!current || c.n !== current.n))
        box.appendChild(h("a", { class: "tp-link", href: HB.chapterHref(c) + (entry.anchor ? "#" + entry.anchor : ""), text: "第 " + c.n + " 章 · " + c.short + " →" }));
      else if (c && entry.anchor) box.appendChild(h("a", { class: "tp-link", href: "#" + entry.anchor, text: "跳到本章定義 →" }));
    }
    doc.body.appendChild(box);
    var r = el.getBoundingClientRect();
    var bw = box.offsetWidth;
    var left = Math.min(Math.max(12, r.left + window.scrollX + r.width / 2 - bw / 2), window.scrollX + doc.documentElement.clientWidth - bw - 12);
    var top = r.bottom + window.scrollY + 8;
    if (r.bottom + box.offsetHeight + 16 > window.innerHeight && r.top > box.offsetHeight + 80) top = r.top + window.scrollY - box.offsetHeight - 8;
    box.style.left = left + "px";
    box.style.top = top + "px";
    pop = box;
    popOwner = el;
    el.setAttribute("aria-expanded", "true");
  }
  function wireTerms() {
    var terms = doc.querySelectorAll(".term");
    Array.prototype.forEach.call(terms, function (el) {
      if (el.tagName !== "A" && el.tagName !== "BUTTON") {
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
      }
      el.setAttribute("aria-expanded", "false");
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showPop(el);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          showPop(el);
        }
      });
    });
    doc.addEventListener("click", function (e) {
      if (pop && !pop.contains(e.target)) closePop();
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePop();
    });
    window.addEventListener("resize", closePop);
  }

  /* ---------- quizzes ---------- */
  function wireQuizzes() {
    var quizzes = Array.prototype.slice.call(doc.querySelectorAll(".quiz"));
    if (!quizzes.length) return;
    var set = doc.querySelector(".quiz-set");
    var score = null;
    if (set) {
      score = h("p", { class: "quiz-score", "aria-live": "polite" });
      var firstQuiz = set.querySelector(".quiz");
      if (firstQuiz) firstQuiz.parentNode.insertBefore(score, firstQuiz);
      else set.appendChild(score);
    }
    var answered = 0,
      right = 0;
    function report() {
      if (score) score.textContent = "已作答 " + answered + " / " + quizzes.length + "　答對 " + right;
    }
    quizzes.forEach(function (q, qi) {
      var answer = (q.getAttribute("data-answer") || "").trim().toLowerCase();
      var qp = q.querySelector(".q");
      if (qp) qp.setAttribute("data-n", qi + 1);
      var explain = q.querySelector(".explain");
      if (explain) explain.hidden = true;
      var items = Array.prototype.slice.call(q.querySelectorAll(".opts > li"));
      var keys = "abcdef";
      var buttons = items.map(function (li, i) {
        var b = h("button", { type: "button", "data-key": keys[i].toUpperCase() });
        while (li.firstChild) b.appendChild(li.firstChild);
        li.appendChild(b);
        b.addEventListener("click", function () {
          var ok = keys[i] === answer;
          buttons.forEach(function (x, j) {
            x.disabled = true;
            if (keys[j] === answer) x.setAttribute("data-state", "right");
          });
          if (!ok) b.setAttribute("data-state", "wrong");
          if (explain) {
            explain.hidden = false;
            explain.insertBefore(h("strong", { text: ok ? "答對了。" : "正確答案是 " + answer.toUpperCase() + "。" }), explain.firstChild);
          }
          answered++;
          if (ok) right++;
          report();
        });
        return b;
      });
    });
    report();
  }

  /* ---------- persistent checklists ---------- */
  function wireChecklists() {
    Array.prototype.forEach.call(doc.querySelectorAll("ul.checklist[data-key]"), function (ul) {
      var key = "check." + ul.getAttribute("data-key");
      var state = HB.store.get(key, {});
      Array.prototype.forEach.call(ul.children, function (li, i) {
        var id = key.replace(/[^a-z0-9]/gi, "-") + "-" + i;
        var box = h("input", { type: "checkbox", id: id });
        box.checked = !!state[i];
        box.addEventListener("change", function () {
          state[i] = box.checked;
          HB.store.set(key, state);
        });
        var label = h("label", { for: id });
        while (li.firstChild) label.appendChild(li.firstChild);
        li.appendChild(box);
        li.appendChild(label);
      });
    });
  }

  /* ---------- figures ---------- */
  function wireFigures() {
    var figs = Array.prototype.slice.call(doc.querySelectorAll(".chapter .fig"));
    figs.forEach(function (fig, i) {
      var n = fig.querySelector("figcaption .fig-n");
      if (n && !n.textContent.trim() && current) n.textContent = "圖 " + current.n + "." + (i + 1);
      if (fig.querySelector(".fig-scroll") && !fig.querySelector(".fig-hint")) {
        fig.querySelector(".fig-plate").appendChild(h("div", { class: "fig-hint", text: "← 左右滑動看完整圖 →" }));
      }
    });
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.setAttribute("data-anim", "in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    figs.forEach(function (fig) {
      var draws = fig.querySelectorAll("svg .draw");
      if (!draws.length) return;
      var r = fig.getBoundingClientRect();
      if (r.top < window.innerHeight) return; /* already on screen: leave it drawn */
      Array.prototype.forEach.call(draws, function (p) {
        if (p.getTotalLength) p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 1);
      });
      fig.setAttribute("data-anim", "ready");
      io.observe(fig);
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    var main = doc.querySelector("main");
    if (main && !main.id) main.id = "main";
    buildTopbar();
    buildDrawer();
    if (current) {
      buildOpenerMeta();
      buildSideToc();
      buildDoneRow();
      buildPager();
    }
    buildFooter();
    wireReadbar();
    wireTerms();
    wireQuizzes();
    wireChecklists();
    wireFigures();
    doc.dispatchEvent(new CustomEvent("hb:ready"));
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
