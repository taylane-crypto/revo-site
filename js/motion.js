/* ==========================================================================
   Revo Studio · motion.js (v3b)
   Só roda com html.motion-ok (JS ativo e sem prefers-reduced-motion).
   1. Hero "fluxo de trabalhos": triplica cada coluna para o laço contínuo em
      CSS e escreve o progresso do scroll em duas variáveis (--p e --e) no
      palco, em requestAnimationFrame. O CSS abre o painel e desfaz a
      inclinação a partir delas. Só transform, translate e opacity.
   2. Declaração: revelação por palavra ligada ao scroll (--dp).
   3. Vídeos: todo cartão de vídeo que está na tela toca (mudo, em laço),
      inclusive as cópias. Pausa fora da viewport e com "Pausar movimento".
   4. Parede Suhai: duplica o conteúdo para o laço em CSS. Processo: as
      etapas acendem em sequência.
   5. Entradas simples por IntersectionObserver.
   Sem bibliotecas, sem canvas, sem setInterval.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  if (!root.classList.contains("motion-ok")) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var REVO = window.REVO || (window.REVO = { restoringFocus: false });
  var hasIO = "IntersectionObserver" in window;

  /* Cópia decorativa de uma peça: fora da leitura e do teclado. O vídeo continua vídeo. */
  function ghost(li) {
    var c = li.cloneNode(true);
    c.setAttribute("aria-hidden", "true");
    c.setAttribute("data-repeat", "");
    var b = $("button", c); if (b) b.tabIndex = -1;
    var sr = $(".rv-sr", c); if (sr) sr.remove();
    var im = $("img", c); if (im) im.alt = "";
    return c;
  }

  /* ====================================================================== */
  /* 1 · Hero                                                               */
  /* ====================================================================== */
  var hall = $("[data-hall]");
  var stage = hall && $("[data-hall-stage]", hall);
  var deck = hall && $("[data-flow-deck]", hall);
  var visible = true;
  var p = 0, tp = 0, px = 0, py = 0, tpx = 0, tpy = 0;
  var running = false;

  function readScroll() {
    var r = hall.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    tp = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  function frame() {
    p += (tp - p) * 0.12;
    px += (tpx - px) * 0.07;
    py += (tpy - py) * 0.07;
    var settled = Math.abs(tp - p) < 0.0004 && Math.abs(tpx - px) < 0.002 && Math.abs(tpy - py) < 0.002;
    if (settled) { p = tp; px = tpx; py = tpy; }
    var e = ease(clamp((p - 0.03) / 0.8, 0, 1));
    var st = stage.style;
    st.setProperty("--p", p.toFixed(4));
    st.setProperty("--e", e.toFixed(4));
    st.setProperty("--px", px.toFixed(3));
    st.setProperty("--py", py.toFixed(3));
    hall.classList.toggle("is-deep", e > 0.3);
    if (settled) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  if (hall && stage && deck) {
    $$("[data-flow-col]", deck).forEach(function (col) {
      var items = $$(".card", col);
      // Três cópias: as peças reais ficam na do meio, já dentro do painel.
      items.forEach(function (li) { col.insertBefore(ghost(li), items[0]); });
      items.forEach(function (li) { col.appendChild(ghost(li)); });
    });
    hall.classList.add("is-built");
    readScroll(); p = tp;
    kick();

    window.addEventListener("scroll", function () { if (visible) { readScroll(); kick(); } }, { passive: true });
    window.addEventListener("resize", function () { readScroll(); kick(); });

    // Ponteiro dá parallax leve ao plano das peças, só com hover fino.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      stage.addEventListener("pointermove", function (ev) {
        tpx = (ev.clientX / window.innerWidth - 0.5) * 2;
        tpy = (ev.clientY / window.innerHeight - 0.5) * 2;
        kick();
      }, { passive: true });
      stage.addEventListener("pointerleave", function () { tpx = 0; tpy = 0; kick(); });
    }

    if (hasIO) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        hall.classList.toggle("is-out", !visible);
        if (visible) readScroll();
        kick();
      }).observe(hall);
    }

    // Teclado: a peça em foco precisa estar inteira na tela. A página rola até o painel aberto,
    // o laço da coluna para (CSS) e a coluna se ajusta na vertical.
    hall.addEventListener("focusin", function (ev) {
      if (REVO.restoringFocus || !ev.target.matches(":focus-visible")) return;
      var span = hall.offsetHeight - window.innerHeight;
      if (ev.target.closest("[data-hall-copy]")) { if (tp > 0.05) window.scrollTo(0, hall.offsetTop); return; }
      var col = ev.target.closest("[data-flow-col]");
      if (!col) return;
      var target = ev.target;
      // Mede em escala real (o plano está inclinado e ampliado) e corrige de novo depois que o painel assenta.
      var fix = function () {
        if (document.activeElement !== target) return;
        var r = target.getBoundingClientRect();
        var k = target.offsetHeight ? r.height / target.offsetHeight : 1;
        var mid = r.top + r.height / 2;
        var lo = 96 + r.height / 2, hi = window.innerHeight - 24 - r.height / 2;
        var goal = lo > hi ? window.innerHeight / 2 : clamp(mid, lo, hi);
        if (Math.abs(goal - mid) < 2) return;
        var cur = parseFloat(col.style.getPropertyValue("--nudge")) || 0;
        col.style.setProperty("--nudge", Math.round(cur + (goal - mid) / (k || 1)) + "px");
      };
      requestAnimationFrame(function () {
        // Com o painel fechado, parte das colunas fica cortada: o foco por teclado abre o painel inteiro.
        if (tp < 0.8) window.scrollTo(0, hall.offsetTop + span * 0.9);
        fix();
        setTimeout(fix, 450);
        setTimeout(fix, 1100);
        setTimeout(fix, 1900);
      });
    });
    hall.addEventListener("focusout", function (ev) {
      var col = ev.target.closest && ev.target.closest("[data-flow-col]");
      if (col) col.style.removeProperty("--nudge");
    });
  }

  /* ====================================================================== */
  /* 2 · Declaração                                                         */
  /* ====================================================================== */
  var decl = $("[data-decl-text]");
  if (decl) {
    var text = decl.textContent.trim();
    var words = text.split(/\s+/);
    var sr = document.createElement("span");
    sr.className = "rv-sr"; sr.textContent = text;
    var vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "w"; s.style.setProperty("--i", i); s.textContent = w;
      vis.appendChild(s);
      if (i < words.length - 1) vis.appendChild(document.createTextNode(" "));
    });
    decl.textContent = "";
    decl.appendChild(sr); decl.appendChild(vis);
    decl.style.setProperty("--n", words.length);
    decl.classList.add("is-split");

    var declTick = false;
    var declUpdate = function () {
      declTick = false;
      var r = decl.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 2) return;
      var dp = clamp((vh * 0.9 - r.top) / (vh * 0.42 + r.height), 0, 1);
      decl.style.setProperty("--dp", dp.toFixed(4));
    };
    window.addEventListener("scroll", function () { if (!declTick) { declTick = true; requestAnimationFrame(declUpdate); } }, { passive: true });
    declUpdate();
  }

  /* ====================================================================== */
  /* 3 · Parede Suhai, processo e vídeos                                     */
  /* ====================================================================== */
  function live(el, margin) {
    el.classList.add("is-live");
    if (hasIO) new IntersectionObserver(function (es) { el.classList.toggle("is-inview", es[0].isIntersecting); }, { rootMargin: margin }).observe(el);
    else el.classList.add("is-inview");
  }

  var wall = $("[data-wall]");
  if (wall) {
    $$("[data-wall-col]", wall).forEach(function (col) {
      $$(".piece", col).forEach(function (piece) { col.appendChild(ghost(piece)); });
    });
    live(wall, "80px");
  }

  /* Processo: as etapas acendem em sequência na primeira vez que aparecem. */
  var proc = $("[data-process]");
  if (proc && hasIO) {
    proc.classList.add("is-live");
    var pio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      pio.disconnect();
      $$(".rv-process__step", proc).forEach(function (st, i) { setTimeout(function () { st.classList.add("is-on"); }, 200 + i * 320); });
    }, { threshold: 0.35 });
    pio.observe(proc);
  }

  /* Vídeos: toca o que está na tela, pausa o resto. Vale para peças reais e cópias. */
  var vids = $$(".card video, .piece video");
  var onscreen = [];
  var syncVideo = function (v) {
    var want = onscreen.indexOf(v) !== -1 && !document.hidden;
    if (want && v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
    else if (!want && !v.paused) v.pause();
  };
  var syncAll = function () { vids.forEach(syncVideo); };
  vids.forEach(function (v) { v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata"; });
  if (hasIO) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var k = onscreen.indexOf(en.target);
        if (en.isIntersecting && k === -1) onscreen.push(en.target);
        else if (!en.isIntersecting && k !== -1) onscreen.splice(k, 1);
        syncVideo(en.target);
      });
    }, { rootMargin: "60px" });
    vids.forEach(function (v) { vio.observe(v); });
  } else {
    onscreen = vids.slice(); syncAll();
  }
  document.addEventListener("visibilitychange", syncAll);

  /* Luz do mouse: só ponteiro fino com hover (o arquivo inteiro já sai com reduced motion).
     Um listener passivo de pointermove guarda a posição; um rAF por movimento escreve --mx/--my
     no .lit da zona sob o ponteiro e no .lit-page. A caixa da zona é lida uma vez por entrada
     e de novo só depois de scroll ou resize. */
  (function light() {
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var SEL = ".flow__panel, .decl__panel, .svc__cover, .wall, .proc__panel, .call__band, .contact__panel";
    var mk = function (tag, cls) { var el = document.createElement(tag); el.className = cls; el.setAttribute("aria-hidden", "true"); return el; };
    var items = $$(SEL).map(function (z) {
      var host = z.querySelector(":scope > .rv-cover") || z;
      var it = { zone: z, lit: mk("span", "lit"), rect: null };
      host.insertBefore(it.lit, host.firstChild);
      z.__lit = it;
      return it;
    });
    var page = mk("div", "lit-page");
    document.body.insertBefore(page, document.body.firstChild);
    root.classList.add("lit-on");

    /* Caixa da zona (com a escala, se a zona estiver transformada). Lida só quando a cache está vazia. */
    var box = function (z) {
      var r = z.getBoundingClientRect();
      return { l: r.left, t: r.top, sx: (z.offsetWidth && r.width / z.offsetWidth) || 1, sy: (z.offsetHeight && r.height / z.offsetHeight) || 1 };
    };
    var px = 0, py = 0, tgt = null, cur = null, queued = false, rehit = false, on = false;
    var frame = function () {
      queued = false;
      if (rehit) { rehit = false; tgt = document.elementFromPoint(px, py); }
      var z = tgt && tgt.closest ? tgt.closest(SEL) : null;
      var it = z ? z.__lit : null;
      if (cur && cur !== it) cur.lit.classList.remove("is-on");
      if (it) {
        if (cur !== it) it.rect = null;
        var r = it.rect || (it.rect = box(it.zone));
        it.lit.style.setProperty("--mx", ((px - r.l) / r.sx).toFixed(1) + "px");
        it.lit.style.setProperty("--my", ((py - r.t) / r.sy).toFixed(1) + "px");
        if (cur !== it) it.lit.classList.add("is-on");
      }
      cur = it;
      page.style.setProperty("--mx", px + "px");
      page.style.setProperty("--my", py + "px");
      if (!on) { on = true; page.classList.add("is-on"); }
    };
    var ask = function () { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      px = e.clientX; py = e.clientY; tgt = e.target; ask();
    }, { passive: true });
    var stale = function () { items.forEach(function (it) { it.rect = null; }); if (on) { rehit = true; ask(); } };
    window.addEventListener("scroll", stale, { passive: true });
    window.addEventListener("resize", stale, { passive: true });
    root.addEventListener("pointerleave", function () {
      if (cur) cur.lit.classList.remove("is-on");
      cur = null; on = false; page.classList.remove("is-on");
    });
  })();

  /* ====================================================================== */
  /* 5 · Entradas                                                           */
  /* ====================================================================== */
  var reveals = $$("[data-reveal]");
  if (hasIO) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  window.__motionReady = true;
})();
