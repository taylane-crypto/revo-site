/* ==========================================================================
   Revo Studio · site.js (v3b)
   Comportamento sem movimento: visualizador de trabalho (dialog nativo),
   cards de serviço (visual e detalhado),
   perguntas (acordeão) e formulário de contato.
   O corredor e as animações ficam em motion.js.
   ========================================================================== */

window.SITE_CONFIG = {
  leadEndpoint: null,   // PREMISSA: destino do lead ainda não definido
  contactEmail: null    // PREMISSA: e-mail do studio ainda não definido
};

window.REVO = { restoringFocus: false };

(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduceMotion = function () { return !root.classList.contains("motion-ok"); };
  root.classList.add("ui"); // o CSS só esconde a versão detalhada dos cards e as respostas quando este script está no ar

  /* ---------- Visualizador de trabalho ---------- */
  (function lightbox() {
    var dlg = $("[data-lb]");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var body = $("[data-lb-body]", dlg);
    var opener = null;
    var closing = false;
    // Botão próprio de pausar/tocar (sem volume), criado aqui para não depender do HTML.
    var playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "rv-btn rv-btn--secondary lb__play";
    playBtn.setAttribute("data-lb-play", "");
    playBtn.hidden = true;
    var playLabel = document.createElement("span");
    playBtn.appendChild(playLabel);
    dlg.appendChild(playBtn); // depois do Fechar: o foco inicial do diálogo continua no Fechar

    // Nenhum vídeo da página usa controles nativos nem som.
    $$("video").forEach(function (v) {
      v.controls = false; v.removeAttribute("controls");
      v.muted = true; v.defaultMuted = true;
      v.disablePictureInPicture = true; v.disableRemotePlayback = true;
    });
    var current = null;

    function syncPlay() {
      if (!playBtn || !current || current.tagName !== "VIDEO") return;
      var paused = current.paused;
      playBtn.setAttribute("aria-label", paused ? "Tocar vídeo" : "Pausar vídeo");
      playBtn.setAttribute("aria-pressed", paused ? "true" : "false");
      if (playLabel) playLabel.textContent = paused ? "Tocar" : "Pausar";
    }

    function play(v) { var pr = v.play(); if (pr && pr.catch) pr.catch(syncPlay); }

    function build(t) {
      var d = t.dataset, w = +d.w || 4, h = +d.h || 5, el, wrap;
      var tall = h / w > 1.9;
      if (d.kind === "video") {
        el = document.createElement("video");
        el.src = d.full;
        if (d.poster) el.poster = d.poster;
        // Sem controles nativos: o player do celular expõe volume e tela cheia. Os vídeos não têm som.
        el.controls = false; el.loop = true;
        el.muted = true; el.defaultMuted = true; el.setAttribute("muted", "");
        el.playsInline = true; el.setAttribute("playsinline", ""); el.setAttribute("webkit-playsinline", "");
        el.disablePictureInPicture = true; el.setAttribute("disablepictureinpicture", "");
        el.disableRemotePlayback = true; el.setAttribute("disableremoteplayback", "");
        el.setAttribute("x-webkit-airplay", "deny");
        el.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
        el.setAttribute("aria-label", "Vídeo");
        el.addEventListener("play", syncPlay);
        el.addEventListener("pause", syncPlay);
        el.addEventListener("volumechange", function () { if (!el.muted) el.muted = true; });
        wrap = el;
      } else {
        var thumb = $("img", t);
        el = document.createElement("img");
        el.alt = (thumb && thumb.alt) || "Trabalho ampliado";
        el.decoding = "async";
        el.src = d.full;
        wrap = document.createElement("picture");
        if (d.avif) {
          var s = document.createElement("source");
          s.type = "image/avif"; s.srcset = d.avif;
          wrap.appendChild(s);
        }
        wrap.appendChild(el);
      }
      el.width = w; el.height = h;
      el.className = "lb__media" + (tall ? " lb__media--tall" : "");
      body.textContent = "";
      body.appendChild(wrap);
      current = el;
      if (playBtn) playBtn.hidden = d.kind !== "video";
      if (d.kind === "video") {
        syncPlay();
        if (!reduceMotion()) play(el); // movimento normal: abre tocando; reduzido: abre pausado
      }
      return el;
    }

    function open(t) {
      if (dlg.open) return;
      opener = t;
      var from = t.getBoundingClientRect();
      var el = build(t);
      dlg.showModal();
      body.scrollTop = 0;
      if (reduceMotion() || !el.animate || !from.width) return;
      var to = el.getBoundingClientRect();
      if (!to.width) return;
      el.style.transformOrigin = "0 0";
      el.animate([
        { transform: "translate(" + (from.left - to.left) + "px," + (from.top - to.top) + "px) scale(" + (from.width / to.width) + "," + (from.height / to.height) + ")", opacity: 0.5 },
        { transform: "none", opacity: 1 }
      ], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
    }

    function close() {
      if (!dlg.open || closing) return;
      closing = true;
      dlg.classList.add("is-closing");
      setTimeout(function () {
        dlg.close();
        dlg.classList.remove("is-closing");
        if (current && current.tagName === "VIDEO") current.pause();
        current = null;
        body.textContent = "";
        if (playBtn) playBtn.hidden = true;
        closing = false;
        var o = opener; opener = null;
        if (o && o.tabIndex >= 0 && document.contains(o)) {
          window.REVO.restoringFocus = true;
          o.focus({ preventScroll: true });
          window.REVO.restoringFocus = false;
        }
      }, reduceMotion() ? 0 : 160);
    }

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-open]");
      if (t) { e.preventDefault(); open(t); }
    });
    if (playBtn) playBtn.addEventListener("click", function () {
      if (!current || current.tagName !== "VIDEO") return;
      if (current.paused) play(current); else current.pause();
    });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); }); // Esc
    dlg.addEventListener("click", function (e) {
      if (e.target === body || e.target === dlg || e.target.closest("[data-lb-close]")) close();
    });
  })();

  /* ---------- Cards de serviço: o card visual é um botão que mostra a versão detalhada ---------- */
  (function services() {
    $$("[data-svc]").forEach(function (card) {
      var btn = $("[data-svc-open]", card);
      var head = btn.parentNode;
      var detail = $("[data-svc-detail]", card);
      var set = function (open, focus) {
        card.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        head.inert = open;
        detail.inert = !open;
        if (focus) (open ? detail : btn).focus({ preventScroll: true });
      };
      set(false, false);
      btn.addEventListener("click", function () { set(true, true); });
      $("[data-svc-close]", card).addEventListener("click", function () { set(false, true); });
      detail.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.stopPropagation(); set(false, true); }
      });
    });
  })();

  /* ---------- Perguntas: acordeão, uma aberta por vez ---------- */
  (function faq() {
    var triggers = $$("[data-faq]");
    var set = function (t, open) {
      t.setAttribute("aria-expanded", open ? "true" : "false");
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.classList.toggle("is-open", open);
    };
    triggers.forEach(function (t) {
      t.addEventListener("click", function () {
        var open = t.getAttribute("aria-expanded") !== "true";
        triggers.forEach(function (o) { if (o !== t) set(o, false); });
        set(t, open);
      });
    });
  })();

  /* ---------- Formulário de contato ---------- */
  (function contact() {
    var form = document.querySelector("[data-contact]");
    if (!form) return;
    var alertBox = form.querySelector("[data-form-alert]");
    var el = form.elements;
    var MSG_EMAIL_CORP = "Use seu e-mail corporativo.";
    var FREE_MAIL = ["gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.br", "outlook.com", "outlook.com.br", "live.com", "msn.com", "yahoo.com", "yahoo.com.br", "ymail.com", "rocketmail.com", "icloud.com", "me.com", "mac.com", "aol.com", "bol.com.br", "uol.com.br", "terra.com.br", "ig.com.br", "globo.com", "globomail.com", "r7.com", "zipmail.com.br", "protonmail.com", "proton.me", "gmx.com", "mail.com", "yandex.com", "zoho.com", "tutanota.com"];

    // Só dígitos do telefone, sem o +55 quando ele vier colado
    function phoneDigits(v) {
      var d = String(v || "").replace(/\D/g, "");
      if (d.length > 11 && d.indexOf("55") === 0) d = d.slice(2);
      return d.slice(0, 11);
    }
    function phoneMask(d) {
      if (!d) return "";
      if (d.length <= 2) return "(" + d;
      var ddd = "(" + d.slice(0, 2) + ") ", r = d.slice(2);
      if (r.length <= 4) return ddd + r;
      var cut = d.length === 11 ? 5 : 4;
      return ddd + r.slice(0, cut) + "-" + r.slice(cut);
    }
    function isFreeMail(v) {
      var dom = v.trim().toLowerCase().split("@").pop();
      return FREE_MAIL.some(function (f) { return dom === f || dom.slice(-(f.length + 1)) === "." + f; });
    }

    // Cada validador devolve true (ok), false (erro padrão do campo) ou o texto de um erro específico
    var fields = [
      [el.nome, function (v) { return v.trim().length >= 2; }],
      [el.sobrenome, function (v) { return v.trim().length >= 2; }],
      [el.email, function (v) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return false;
        return isFreeMail(v) ? MSG_EMAIL_CORP : true;
      }],
      [el.whatsapp, function (v) {
        var d = phoneDigits(v);
        return (d.length === 10 || d.length === 11) && Number(d.slice(0, 2)) >= 11;
      }],
      [el.mensagem, function (v) { return v.trim().length >= 3; }]
    ];

    function setErr(input, bad, msg) {
      var field = input.closest(".rv-field");
      var err = field.querySelector("[data-err]");
      field.classList.toggle("is-error", bad);
      if (bad) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      if (!err) return;
      if (err.getAttribute("data-default") === null) err.setAttribute("data-default", err.textContent);
      err.textContent = (bad && msg) || err.getAttribute("data-default");
      err.hidden = !bad;
    }

    // Máscara do WhatsApp enquanto digita, mantendo o cursor no mesmo dígito
    el.whatsapp.addEventListener("input", function (e) {
      var t = e.target, v = t.value;
      if (e.inputType && e.inputType.indexOf("delete") === 0 && phoneDigits(v) === phoneDigits(t.getAttribute("data-prev"))) { t.setAttribute("data-prev", v); return; }
      var pos = t.selectionStart == null ? v.length : t.selectionStart;
      var before = v.slice(0, pos).replace(/\D/g, "").length;
      var raw = v.replace(/\D/g, "");
      if (raw.length > 11 && raw.indexOf("55") === 0) before = Math.max(0, before - 2);
      var out = phoneMask(phoneDigits(v));
      t.value = out;
      t.setAttribute("data-prev", out);
      var i = 0, n = 0;
      while (i < out.length && n < before) { if (/\d/.test(out[i])) n++; i++; }
      if (document.activeElement === t) t.setSelectionRange(i, i);
    });

    form.addEventListener("input", function (e) {
      if (e.target.getAttribute("aria-invalid") === "true") setErr(e.target, false);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = null;
      fields.forEach(function (f) {
        var res = f[1](f[0].value || "");
        var bad = res !== true;
        setErr(f[0], bad, typeof res === "string" ? res : "");
        if (bad && !first) first = f[0];
      });
      if (first) {
        alertBox.textContent = "";
        alertBox.textContent = "Revise os campos marcados.";
        first.focus();
        return;
      }
      alertBox.textContent = "";
      send();
    });

    function payload() {
      return {
        nome: el.nome.value.trim(),
        sobrenome: el.sobrenome.value.trim(),
        email: el.email.value.trim(),
        whatsapp: "+55" + phoneDigits(el.whatsapp.value),
        mensagem: el.mensagem.value.trim(),
        origem: location.href
      };
    }

    function send() {
      var b = form.querySelector('button[type="submit"]');
      var label = b.querySelector("span");
      b.style.minWidth = b.offsetWidth + "px";
      b.disabled = true; b.setAttribute("aria-busy", "true");
      label.textContent = "Enviando...";
      var reset = function () { b.disabled = false; b.removeAttribute("aria-busy"); label.textContent = "Enviar mensagem"; };
      var ok = function () {
        var done = document.createElement("div");
        done.className = "rv-contact contact__form form__done";
        done.setAttribute("role", "status");
        done.tabIndex = -1;
        done.innerHTML = "<h3>Mensagem recebida.</h3><p>O time do Revo vai responder no e-mail que você informou.</p>";
        form.replaceWith(done);
        done.focus();
      };
      var fail = function () { reset(); alertBox.textContent = "Algo deu errado. Tente de novo em alguns instantes."; alertBox.classList.remove("rv-sr"); alertBox.classList.add("rv-field__hint"); };
      var url = (window.SITE_CONFIG || {}).leadEndpoint;
      if (!url) { setTimeout(ok, 600); return; } // PREMISSA: sem destino definido, o envio é tratado localmente
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); ok(); })
        .catch(fail);
    }
  })();
})();
