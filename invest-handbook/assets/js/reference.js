/* 讀通投資 — glossary page: search, filter by part, grouped by chapter. */
(function () {
  "use strict";
  var HB = window.HB;
  var doc = document;
  var h = HB.h;

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[\s／/·・\-–—()（）]/g, "");
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function highlight(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }

  function boot() {
    var host = doc.getElementById("gloss");
    if (!host) return;
    var entries = Object.keys(HB.glossary || {}).map(function (k) {
      return HB.glossary[k];
    });
    var aliasesOf = {};
    Object.keys(HB.glossaryAlias || {}).forEach(function (a) {
      var k = HB.glossaryAlias[a];
      (aliasesOf[k] = aliasesOf[k] || []).push(a);
    });
    var part = "all";
    var q = "";
    var input = doc.getElementById("q");
    var count = doc.getElementById("count");
    var empty = doc.getElementById("empty");

    var filter = doc.getElementById("part-filter");
    var opts = [["all", "全部"]].concat(
      HB.parts.map(function (p) {
        return [String(p.n), p.name];
      })
    );
    var buttons = opts.map(function (o) {
      var b = h("button", { type: "button", text: o[1], "aria-pressed": String(o[0] === part) });
      b.addEventListener("click", function () {
        part = o[0];
        buttons.forEach(function (x, i) {
          x.setAttribute("aria-pressed", String(opts[i][0] === part));
        });
        render();
      });
      filter.appendChild(b);
      return b;
    });

    function render() {
      var nq = norm(q);
      host.innerHTML = "";
      var shown = 0;
      HB.chapters.forEach(function (c) {
        if (part !== "all" && String(c.part) !== part) return;
        var list = entries
          .filter(function (e) {
            return e.ch === c.n;
          })
          .filter(function (e) {
            if (!nq) return true;
            var hay = norm(e.term) + "|" + norm(e.en) + "|" + norm(e.def) + "|" + norm((aliasesOf[e.term] || []).join("|"));
            return hay.indexOf(nq) !== -1;
          });
        if (!list.length) return;
        shown += list.length;
        var dl = h("dl", { class: "gloss-list" });
        list.forEach(function (e) {
          var href = HB.chapterHref(c) + (e.anchor ? "#" + e.anchor : "");
          var dt = h("dt", {}, [h("a", { href: href, html: highlight(e.term, q) }), e.en ? h("span", { class: "en", html: highlight(e.en, q) }) : null]);
          var al = aliasesOf[e.term];
          var dd = h("dd", { html: highlight(e.def, q) + (al && al.length ? '<br><span class="en">也稱：' + esc(al.join("、")) + "</span>" : "") });
          dl.appendChild(h("div", { class: "gloss-item", id: "t-" + e.term }, [dt, dd]));
        });
        host.appendChild(
          h("section", { class: "gloss-ch" }, [
            h("div", { class: "gloss-ch-head" }, [
              h("span", { class: "gn", text: String(c.n).padStart(2, "0") }),
              h("a", { href: HB.chapterHref(c), text: c.short }),
              h("span", { class: "gp", text: "第" + c.part + "部 · " + HB.parts[c.part - 1].name + " · " + list.length + " 個名詞" }),
            ]),
            dl,
          ])
        );
      });
      count.textContent = (q || part !== "all" ? "找到 " : "共 ") + shown + " 個名詞";
      empty.hidden = shown > 0;
    }
    var t;
    input.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        q = input.value.trim();
        render();
      }, 80);
    });
    render();
    if (location.hash) {
      var target = doc.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView({ block: "center" });
    }
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
