/* ==========================================================================
   Revo UI · Biblioteca de componentes (vanilla JS)
   - Cada componente é uma função pura que devolve HTML (string), então
     peças maiores são montadas combinando as menores.
   - Comportamentos são ligados por delegação de eventos (data-rv-*), então
     funcionam em qualquer conteúdo inserido depois.
   - Ícones: Lucide (traço 1.6, cantos arredondados), via RV.ic('nome').
   - Nada aqui chama APIs externas: uploads e envios são
     simulados (RV.simulateUpload, envio do formulário).
   ========================================================================== */
(function () {
  "use strict";

  const RV = (window.RV = {});
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;
  const nextId = (p = "rv") => `${p}-${++uid}`;

  /* ---------- Utilitários ---------- */
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const attrs = (o = {}) => Object.entries(o).filter(([, v]) => v !== false && v != null).map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(" ");
  const cx = (...a) => a.filter(Boolean).join(" ");
  RV.esc = esc;
  RV.cx = cx;
  RV.id = nextId;
  RV.seedId = (n) => { uid = Math.max(uid, n); };
  RV.html = (str) => { const t = document.createElement("template"); t.innerHTML = str.trim(); return t.content.firstElementChild; };
  RV.fmtNum = (n) => Number(n).toLocaleString("pt-BR");
  RV.fmtTime = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    return m ? `${m}min ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
  };
  RV.fmtBytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1).replace(".", ",")} MB`);
  RV.sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion() ? Math.min(ms, 60) : ms));

  /* ---------- Ícones ---------- */
  RV.ic = (name, cls = "") => `<i data-lucide="${name}" class="${cx("rv-icon", cls)}" aria-hidden="true"></i>`;
  let iconQueued = false;
  RV.refreshIcons = () => {
    if (iconQueued) return;
    iconQueued = true;
    requestAnimationFrame(() => {
      iconQueued = false;
      if (window.lucide && document.querySelector("[data-lucide]")) window.lucide.createIcons({ attrs: { "stroke-width": 1.6 } });
    });
  };

  /* ---------- Marca ---------- */
  RV.logo = (h = 22, cls = "") =>
    `<svg class="${cx("rv-logo", cls)}" viewBox="8 32 398 113" height="${h}" fill="currentColor" role="img" aria-label="Revo"><path d="${window.REVO_WORDMARK_PATH || ""}"/></svg>`;

  /* ==========================================================================
     BÁSICOS
     ========================================================================== */

  RV.spinner = (size = "") => `<span class="${cx("rv-spinner", size)}" aria-hidden="true"></span>`;

  /** Botão. variant: primary | secondary | soft | ghost | danger | danger-ghost | glass | aurora */
  RV.button = ({ label = "", variant = "primary", size = "", icon, iconRight, loading, disabled, block, cls = "", tip, type = "button", attrs: extra = {}, state = "" } = {}) => {
    const onlyIcon = icon && !label;
    return `<button ${attrs({ type, class: cx("rv-btn", `rv-btn--${variant}`, size, block && "block", onlyIcon && "icon", loading && "is-loading", state, cls), disabled: disabled || null, "aria-busy": loading ? "true" : null, "data-tip": tip, "aria-label": onlyIcon ? tip : null, ...extra })}>${icon ? RV.ic(icon) : ""}${label ? `<span>${esc(label)}</span>` : ""}${iconRight ? RV.ic(iconRight) : ""}${loading ? RV.spinner() : ""}</button>`;
  };

  RV.iconButton = ({ icon, label, size = "", cls = "", pressed, disabled, tip, kbd, attrs: extra = {} } = {}) =>
    `<button ${attrs({ type: "button", class: cx("rv-icon-btn", size, cls), "aria-label": label, "aria-pressed": pressed == null ? null : String(!!pressed), disabled: disabled || null, "data-tip": tip ?? label, "data-tip-kbd": kbd, ...extra })}>${RV.ic(icon)}</button>`;

  RV.badge = ({ label, tone = "", icon, status, tag, count, cls = "" } = {}) => {
    if (count != null) return `<span class="rv-badge rv-badge--count ${cls}">${esc(count)}</span>`;
    const k = cx("rv-badge", tone && `rv-badge--${tone}`, status && "rv-badge--status", tag && "rv-badge--tag", cls);
    return `<span class="${k}" ${status ? `data-status="${status}"` : ""}>${icon ? RV.ic(icon) : ""}${esc(label)}</span>`;
  };

  RV.kbd = (...keys) => keys.map((k) => `<kbd>${esc(k)}</kbd>`).join("");

  /** Avatar: iniciais, tom, status e versão IA. */
  RV.avatar = ({ name = "", initials, tone, size = "", status, ai, icon = "sparkles", src } = {}) => {
    const ini = initials || name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
    const inner = ai ? RV.ic(icon) : src ? `<img src="${esc(src)}" alt="">` : esc(ini);
    return `<span class="${cx("rv-avatar", size, ai && "rv-avatar--ai")}" ${tone ? `data-tone="${tone}"` : ""} role="img" aria-label="${esc(name)}" ${name ? `data-tip="${esc(name)}"` : ""}>${inner}${status ? `<span class="rv-avatar__status" data-status="${status}"></span>` : ""}</span>`;
  };

  RV.avatarGroup = ({ people = [], max = 4, size = "sm" } = {}) => {
    const shown = people.slice(0, max);
    const rest = people.length - shown.length;
    return `<span class="rv-avatar-group">${shown.map((p) => RV.avatar({ ...p, size })).join("")}${rest > 0 ? `<span class="rv-avatar rv-avatar--more ${size}" data-tip="${esc(people.slice(max).map((p) => p.name).join(", "))}">+${rest}</span>` : ""}</span>`;
  };

  /* ---------- Campos ---------- */
  RV.field = ({ label, hint, error, optional, control, id, cls = "", disabled, counter } = {}) =>
    `<div class="${cx("rv-field", error && "is-error", disabled && "is-disabled", cls)}">
      ${label ? `<label class="rv-field__label" ${id ? `for="${id}"` : ""}><span>${esc(label)}</span>${optional ? `<span class="rv-faint">Opcional</span>` : ""}${counter ? `<span class="rv-faint rv-mono-num" data-rv-counter-for="${id}">${counter}</span>` : ""}</label>` : ""}
      ${control}
      ${error ? `<div class="rv-field__hint" ${id ? `id="${id}-hint"` : ""}>${RV.ic("circle-alert", "sm")}${esc(error)}</div>` : hint ? `<div class="rv-field__hint" ${id ? `id="${id}-hint"` : ""}>${esc(hint)}</div>` : ""}
    </div>`;

  RV.input = ({ id = nextId("in"), type = "text", placeholder = "", value = "", icon, size = "", pill, search, disabled, error, loading, suffix, state = "", clearable, attrs: extra = {} } = {}) =>
    `<div class="${cx("rv-input", size, pill && "rv-input--pill", search && "rv-input--search", error && "is-error", disabled && "is-disabled", state)}">
      ${icon ? RV.ic(icon) : ""}
      <input ${attrs({ id, type, placeholder, value: value || null, disabled: disabled || null, "aria-invalid": error ? "true" : null, "aria-describedby": `${id}-hint`, ...extra })}>
      ${loading ? RV.spinner("sm") : ""}
      ${clearable ? `<button type="button" class="rv-icon-btn sm" data-rv-clear aria-label="Limpar" ${value ? "" : "hidden"}>${RV.ic("x")}</button>` : ""}
      ${suffix ? `<span class="rv-input__suffix">${suffix}</span>` : ""}
    </div>`;

  RV.password = ({ id = nextId("pw"), placeholder = "Mínimo de 8 caracteres", value = "", strength = true, disabled, error, state } = {}) =>
    `${RV.input({ id, type: "password", placeholder, value, icon: "lock", disabled, error, state, attrs: { "data-rv-strength": strength ? "" : null, autocomplete: "new-password" } }).replace(
      "</div>",
      `<button type="button" class="rv-icon-btn sm" data-rv-toggle-pass="${id}" aria-label="Mostrar senha" data-tip="Mostrar senha">${RV.ic("eye")}</button></div>`
    )}${strength ? `<div class="rv-strength" data-rv-strength-for="${id}" data-level="${value ? 3 : 0}"><span></span><span></span><span></span><span></span></div>` : ""}`;

  RV.textarea = ({ id = nextId("ta"), placeholder = "", value = "", rows = 4, disabled, error, max, state = "" } = {}) =>
    `<div class="${cx("rv-input rv-input--textarea", error && "is-error", disabled && "is-disabled", state)}"><textarea ${attrs({ id, placeholder, rows, disabled: disabled || null, maxlength: max, "data-rv-count": max ? "" : null, "aria-invalid": error ? "true" : null })}>${esc(value)}</textarea></div>`;

  /* ---------- Menu e dropdown ---------- */
  RV.menuItem = ({ label, icon, kbd, danger, disabled, selected, value, desc, keepOpen } = {}) =>
    `<button ${attrs({ type: "button", role: selected != null ? "menuitemradio" : "menuitem", class: cx("rv-menu__item", danger && "rv-menu__item--danger", selected && "is-selected"), disabled: disabled || null, "data-value": value ?? label, "aria-checked": selected != null ? String(!!selected) : null, "data-keep-open": keepOpen ? "" : null })}>
      ${icon ? RV.ic(icon) : ""}${desc ? `<span class="rv-menu__desc"><span>${esc(label)}</span><small>${esc(desc)}</small></span>` : `<span class="rv-truncate">${esc(label)}</span>`}
      ${kbd ? `<span style="margin-left:auto;display:inline-flex;gap:3px">${RV.kbd(...[].concat(kbd))}</span>` : ""}
      ${selected != null ? RV.ic("check", "rv-menu__check sm") : ""}
    </button>`;

  RV.menu = (items = [], { cls = "", label } = {}) =>
    `<div class="${cx("rv-menu", cls)}" role="menu" ${label ? `aria-label="${esc(label)}"` : ""}>${items
      .map((it) => (it === "-" ? `<div class="rv-menu__sep" role="separator"></div>` : it.group ? `<div class="rv-menu__label rv-overline">${esc(it.group)}</div>` : RV.menuItem(it)))
      .join("")}</div>`;

  /** Dropdown genérico: trigger (HTML de um botão) + itens. select:true transforma em seleção única. */
  RV.dropdown = ({ trigger, items = [], align = "", up, select, id = nextId("dd"), menuHtml, menuCls = "" } = {}) => {
    const trig = trigger.replace(/^<button/, `<button data-rv-dropdown aria-haspopup="menu" aria-expanded="false" aria-controls="${id}"`);
    const menu = menuHtml ? `<div class="${cx("rv-menu", menuCls)}" role="menu">${menuHtml}</div>` : RV.menu(items, { cls: menuCls });
    return `<div class="rv-dropdown" ${select ? "data-rv-select" : ""}>${trig}${menu.replace('class="rv-menu', `id="${id}" class="rv-menu ${cx(align === "right" && "align-right", up && "up")}`)}</div>`;
  };

  /** Select construído com o dropdown. */
  RV.select = ({ id = nextId("sel"), options = [], value, placeholder = "Selecione", disabled, error, icon, state = "" } = {}) => {
    const cur = options.find((o) => (o.value ?? o.label) === value);
    const trigger = `<button type="button" id="${id}" class="${cx("rv-select", error && "is-error", state)}" ${disabled ? "disabled" : ""}>${icon ? RV.ic(icon) : ""}<span class="${cx("rv-select__value", !cur && "is-placeholder")}">${esc(cur ? cur.label : placeholder)}</span>${RV.ic("chevron-down")}</button>`;
    return `<div style="display:block" class="rv-select-wrap">${RV.dropdown({ trigger, select: true, items: options.map((o) => ({ ...o, selected: (o.value ?? o.label) === value })), menuCls: "rv-menu--fit" })}</div>`.replace('class="rv-dropdown"', 'class="rv-dropdown" style="display:flex;width:100%"');
  };

  /* ---------- Seleção ---------- */
  const checkSvg = `<svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><svg class="ind" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M6 12h12"/></svg>`;
  RV.checkbox = ({ label, desc, checked, indeterminate, disabled, error, name, value, state = "" } = {}) =>
    `<label class="${cx("rv-check", error && "is-error", state)}"><input type="checkbox" ${attrs({ name, value, checked: checked || null, disabled: disabled || null, "data-indeterminate": indeterminate ? "" : null })}><span class="rv-check__box">${checkSvg}</span>${label ? `<span class="rv-check__text"><span>${esc(label)}</span>${desc ? `<small>${esc(desc)}</small>` : ""}</span>` : ""}</label>`;

  RV.radio = ({ label, desc, checked, disabled, name, value, state = "" } = {}) =>
    `<label class="${cx("rv-check rv-check--radio", state)}"><input type="radio" ${attrs({ name, value, checked: checked || null, disabled: disabled || null })}><span class="rv-check__box"></span>${label ? `<span class="rv-check__text"><span>${esc(label)}</span>${desc ? `<small>${esc(desc)}</small>` : ""}</span>` : ""}</label>`;

  RV.switch = ({ label, checked, disabled, name, state = "", attrs: extra = {} } = {}) =>
    `<label class="${cx("rv-switch", state)}"><input type="checkbox" role="switch" ${attrs({ name, checked: checked || null, disabled: disabled || null, ...extra })}><span class="rv-switch__track"></span>${label ? `<span>${esc(label)}</span>` : ""}</label>`;

  RV.slider = ({ id = nextId("sl"), label, min = 0, max = 100, step = 1, value = 50, unit = "", ticks, disabled } = {}) => {
    const p = ((value - min) / (max - min)) * 100;
    return `<div class="rv-slider">
      ${label ? `<div class="rv-slider__head"><label for="${id}">${esc(label)}</label><output for="${id}" data-unit="${esc(unit)}">${value}${unit}</output></div>` : ""}
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" style="--p:${p}%" data-rv-range ${disabled ? "disabled" : ""}>
      ${ticks ? `<div class="rv-slider__ticks">${ticks.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
    </div>`;
  };

  /* ---------- Accordion ---------- */
  RV.accordion = ({ items = [], multiple = false } = {}) =>
    `<div class="rv-accordion" ${multiple ? "data-multiple" : ""}>${items
      .map((it) => {
        const id = nextId("acc");
        return `<div class="rv-accordion__item"><button type="button" class="rv-accordion__trigger" aria-expanded="${!!it.open}" aria-controls="${id}" data-rv-collapse="${id}">${it.icon ? RV.ic(it.icon) : ""}<span>${esc(it.title)}</span>${RV.ic("chevron-down", "rv-chev")}</button><div id="${id}" class="rv-collapse ${it.open ? "is-open" : ""}" role="region"><div><div class="rv-accordion__panel">${it.body}</div></div></div></div>`;
      })
      .join("")}</div>`;

  /* ---------- Feedback ---------- */
  const toneIcon = { info: "info", success: "circle-check", warning: "triangle-alert", danger: "circle-alert" };
  RV.alert = ({ tone = "info", title, text, actions = "", dismissible, icon } = {}) =>
    `<div class="rv-alert" data-tone="${tone}" role="${tone === "danger" ? "alert" : "status"}">${RV.ic(icon || toneIcon[tone])}<div class="rv-alert__body">${title ? `<div class="rv-alert__title">${esc(title)}</div>` : ""}${text ? `<div class="rv-alert__text">${text}</div>` : ""}${actions ? `<div class="rv-alert__actions">${actions}</div>` : ""}</div>${dismissible ? RV.iconButton({ icon: "x", label: "Fechar", size: "sm", attrs: { "data-rv-dismiss": "" } }) : ""}</div>`;

  RV.toastHtml = ({ tone = "success", title, text, action, icon, staticToast } = {}) =>
    `<div class="${cx("rv-toast", staticToast && "rv-toast--static")}" data-tone="${tone}" role="status">${RV.ic(icon || toneIcon[tone])}<div class="rv-toast__body"><div class="rv-toast__title">${esc(title)}</div>${text ? `<div class="rv-toast__text">${text}</div>` : ""}${action ? `<div class="rv-toast__action">${RV.button({ label: action.label, variant: "soft", size: "sm", attrs: { "data-rv-toast-action": "" } })}</div>` : ""}</div>${RV.iconButton({ icon: "x", label: "Fechar", size: "sm", attrs: { "data-rv-toast-close": "" } })}</div>`;

  RV.toast = (opts = {}) => {
    let host = document.querySelector(".rv-toaster");
    if (!host) { host = RV.html(`<div class="rv-toaster" aria-live="polite"></div>`); document.body.appendChild(host); }
    const el = RV.html(RV.toastHtml(opts));
    host.appendChild(el);
    RV.refreshIcons();
    const close = () => { if (el.classList.contains("is-leaving")) return; el.classList.add("is-leaving"); setTimeout(() => el.remove(), 220); };
    el.querySelector("[data-rv-toast-close]").onclick = close;
    const act = el.querySelector("[data-rv-toast-action]");
    if (act) act.onclick = () => { opts.action.onClick?.(); close(); };
    const t = setTimeout(close, opts.duration ?? 4200);
    el.addEventListener("pointerenter", () => clearTimeout(t), { once: true });
    el.addEventListener("pointerleave", () => setTimeout(close, 1800), { once: true });
    return close;
  };

  /* ---------- Overlays: modal, drawer ---------- */
  const focusables = 'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  function openOverlay(inner, { cls = "", onClose, label } = {}) {
    const prev = document.activeElement;
    const ov = RV.html(`<div class="rv-overlay ${cls}" role="dialog" aria-modal="true" ${label ? `aria-label="${esc(label)}"` : ""}>${inner}</div>`);
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    RV.refreshIcons();
    const close = () => {
      if (ov.classList.contains("is-leaving")) return;
      ov.classList.add("is-leaving");
      document.removeEventListener("keydown", onKey, true);
      setTimeout(() => { ov.remove(); if (!document.querySelector(".rv-overlay")) document.body.style.overflow = ""; prev?.focus?.(); onClose?.(); }, reduceMotion() ? 0 : 200);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
      if (e.key === "Tab") {
        const f = [...ov.querySelectorAll(focusables)].filter((n) => n.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    ov.addEventListener("click", (e) => { if (e.target.closest("[data-rv-close]")) close(); });
    requestAnimationFrame(() => (ov.querySelector("[autofocus]") || ov.querySelector(focusables))?.focus());
    return { el: ov, close };
  }
  RV.openOverlay = openOverlay;

  RV.modalHtml = ({ title, desc, body = "", actions = [], wide, icon, staticModal } = {}) =>
    `<div class="${cx("rv-modal", wide && "wide", staticModal && "rv-modal--static")}">
      <div class="rv-modal__head">${icon ? `<span class="rv-limit__icon" style="background:var(--rv-action-soft);color:var(--rv-action-soft-text)">${RV.ic(icon)}</span>` : ""}<div><h2 class="rv-modal__title">${esc(title)}</h2>${desc ? `<p class="rv-modal__desc">${esc(desc)}</p>` : ""}</div>${RV.iconButton({ icon: "x", label: "Fechar", attrs: { "data-rv-close": "" } })}</div>
      <div class="rv-modal__body">${body}</div>
      ${actions.length ? `<div class="rv-modal__foot">${actions.map((a, i) => RV.button({ ...a, attrs: { "data-rv-modal-action": i } })).join("")}</div>` : ""}
    </div>`;

  RV.modal = (opts = {}) => {
    const o = openOverlay(RV.modalHtml(opts), { label: opts.title, onClose: opts.onClose });
    o.el.querySelectorAll("[data-rv-modal-action]").forEach((b) => {
      const a = opts.actions[+b.dataset.rvModalAction];
      b.onclick = async () => { const r = await a.onClick?.(o, b); if (r !== false && a.close !== false) o.close(); };
    });
    return o;
  };

  RV.drawer = ({ title, body = "", foot = "", onClose } = {}) =>
    openOverlay(`<aside class="rv-drawer"><div class="rv-drawer__head"><h3>${esc(title)}</h3>${RV.iconButton({ icon: "x", label: "Fechar", attrs: { "data-rv-close": "" } })}</div><div class="rv-drawer__body rv-scroll">${body}</div>${foot ? `<div class="rv-drawer__foot">${foot}</div>` : ""}</aside>`, { cls: "rv-overlay--drawer", label: title, onClose });

  /* ---------- Navegação ---------- */
  RV.tabs = ({ tabs = [], variant = "pill", selected, id = nextId("tabs"), cls = "", panels = true } = {}) => {
    const sel = selected ?? tabs[0]?.id;
    return `<div class="${cx("rv-tabs", `rv-tabs--${variant}`, cls)}" data-rv-tabs id="${id}">
      <div class="rv-tablist" role="tablist"><span class="rv-tab-indicator" aria-hidden="true"></span>${tabs
        .map((t) => `<button type="button" role="tab" class="rv-tab" id="${id}-${t.id}-tab" data-tab="${t.id}" aria-selected="${t.id === sel}" aria-controls="${id}-${t.id}" tabindex="${t.id === sel ? 0 : -1}" ${t.disabled ? "disabled" : ""}>${t.icon ? RV.ic(t.icon) : ""}${esc(t.label)}${t.count != null ? RV.badge({ count: t.count }) : ""}</button>`)
        .join("")}</div>
      ${panels ? tabs.map((t) => `<div role="tabpanel" class="rv-tabpanel" id="${id}-${t.id}" aria-labelledby="${id}-${t.id}-tab" ${t.id === sel ? "" : "hidden"}>${t.panel ?? ""}</div>`).join("") : ""}
    </div>`;
  };

  RV.breadcrumbs = (items = []) =>
    `<nav class="rv-breadcrumbs" aria-label="Você está em">${items
      .map((it, i) => (i === items.length - 1 ? `<span aria-current="page" title="${esc(it)}">${esc(it)}</span>` : `<button type="button" title="${esc(it)}">${esc(it)}</button>${RV.ic("chevron-right")}`))
      .join("")}</nav>`;

  RV.pagination = ({ page = 1, total = 10, id = nextId("pg") } = {}) => {
    const set = new Set([1, total, page, page - 1, page + 1].filter((n) => n >= 1 && n <= total));
    const nums = [...set].sort((a, b) => a - b);
    let out = "", last = 0;
    for (const n of nums) {
      if (n - last > 1) out += `<span class="rv-page rv-page--ellipsis" aria-hidden="true">…</span>`;
      out += `<button type="button" class="rv-page" data-page="${n}" ${n === page ? 'aria-current="page"' : ""} aria-label="Página ${n}">${n}</button>`;
      last = n;
    }
    return `<nav class="rv-pagination" aria-label="Paginação" data-rv-pagination data-total="${total}" data-page="${page}" id="${id}">
      <button type="button" class="rv-page rv-page--nav" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>${RV.ic("chevron-left", "sm")}Anterior</button>${out}<button type="button" class="rv-page rv-page--nav" data-page="${page + 1}" ${page >= total ? "disabled" : ""}>Próxima${RV.ic("chevron-right", "sm")}</button></nav>`;
  };

  /* ---------- Chips, progresso, estados ---------- */
  RV.chip = ({ label, icon, pressed, prompt, disabled, attrs: extra = {}, cls = "" } = {}) =>
    `<button ${attrs({ type: "button", class: cx("rv-chip", prompt && "rv-chip--prompt", cls), "aria-pressed": pressed == null ? null : String(!!pressed), disabled: disabled || null, ...extra })}>${icon ? RV.ic(icon) : ""}<span>${esc(label)}</span></button>`;

  RV.progress = ({ value = 0, error, aurora, thin, label = "Progresso" } = {}) =>
    `<div class="${cx("rv-progress", error && "is-error", aurora && "aurora", thin && "thin")}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value)}"><span style="--v:${value}%"></span></div>`;

  RV.skeleton = ({ w = "100%", h = 12, circle, r } = {}) => `<span class="${cx("rv-skeleton", circle && "circle")}" style="width:${typeof w === "number" ? w + "px" : w};height:${h}px;${r ? `border-radius:${r}px` : ""}"></span>`;

  RV.empty = ({ icon = "sparkles", title, text, actions = "" } = {}) =>
    `<div class="rv-empty"><div class="rv-empty__art">${RV.ic(icon)}</div><h4>${esc(title)}</h4>${text ? `<p>${esc(text)}</p>` : ""}${actions ? `<div class="rv-btn-group">${actions}</div>` : ""}</div>`;

  /* ==========================================================================
     APOIO (código, upload, etapas)
     ========================================================================== */

  /* ---------- Bloco de código ---------- */
  const KW = new Set("const let var function return if else for while await async import from export default new class extends true false null undefined try catch of in typeof this def print None True False".split(" "));
  RV.highlight = (code, lang = "js") => {
    const hashComments = /^(bash|sh|python|py|yaml|yml)$/i.test(lang);
    const re = new RegExp(String.raw`(\/\/[^\n]*|\/\*[\s\S]*?\*\/${hashComments ? String.raw`|#[^\n]*` : ""})|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\`(?:[^\`\\]|\\.)*\`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)`, "g");
    let out = "", last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      const [tok, com, str, num, word] = m;
      const after = code.slice(re.lastIndex).match(/^\s*(.)/)?.[1];
      if (com) out += `<span class="tk-com">${esc(tok)}</span>`;
      else if (str) out += `<span class="${after === ":" ? "tk-prop" : "tk-str"}">${esc(tok)}</span>`;
      else if (num) out += `<span class="tk-num">${tok}</span>`;
      else if (word && KW.has(word)) out += `<span class="tk-kw">${tok}</span>`;
      else if (word && after === "(") out += `<span class="tk-fn">${tok}</span>`;
      else if (word && after === ":") out += `<span class="tk-prop">${tok}</span>`;
      else out += esc(tok);
      last = re.lastIndex;
    }
    out += esc(code.slice(last));
    return out.split("\n").map((l, i) => `<span class="ln">${i + 1}</span>${l}`).join("\n");
  };
  RV.codeBlock = ({ lang = "js", code = "", title } = {}) => {
    const id = nextId("code");
    return `<div class="rv-codeblock"><div class="rv-codeblock__head"><span class="rv-codeblock__lang"><i></i>${esc(title || lang)}</span><button type="button" class="rv-btn" data-rv-copy="#${id}">${RV.ic("copy")}<span>Copiar</span></button></div><pre class="rv-scroll"><code id="${id}" data-raw="${esc(code)}">${RV.highlight(code, lang)}</code></pre></div>`;
  };

  /* ---------- Tipos de arquivo ---------- */
  const kindOf = (name = "") => (/\.(png|jpe?g|webp|gif|svg|heic)$/i.test(name) ? "img" : /\.pdf$/i.test(name) ? "pdf" : /\.(xlsx?|csv)$/i.test(name) ? "sheet" : /\.(docx?|md|txt|pages|key|pptx?)$/i.test(name) ? "doc" : "file");
  const kindIcon = { img: "image", pdf: "file-text", sheet: "file-spreadsheet", doc: "file-type", file: "file" };
  RV.kindOf = kindOf;

  /* ---------- Upload ---------- */
  RV.dropzone = ({ id = nextId("dz"), accept = "image/*,.pdf,.docx,.xlsx,.csv,.md", maxMB = 25, title = "Arraste arquivos ou clique para enviar", hint } = {}) =>
    `<div data-rv-upload="${id}" data-max="${maxMB}">
      <div class="rv-dropzone" tabindex="0" role="button" aria-describedby="${id}-hint">
        <span class="rv-dropzone__icon">${RV.ic("cloud-upload", "lg")}</span>
        <strong>${esc(title)}</strong>
        <small id="${id}-hint">${esc(hint || `PNG, JPG, PDF, DOCX, XLSX até ${maxMB} MB`)}</small>
        <input type="file" multiple hidden accept="${accept}">
      </div>
      <div class="rv-filelist" data-rv-filelist></div>
    </div>`;

  RV.fileRow = ({ id = nextId("file"), name, size = 0, progress = 0, error } = {}) => {
    const k = kindOf(name);
    const done = !error && progress >= 100;
    const status = error ? error : done ? "Enviado" : `${Math.round(progress)}% · ${RV.fmtBytes(Math.round((size * progress) / 100))} de ${RV.fmtBytes(size)}`;
    return `<div class="${cx("rv-file", done && "is-done", error && "is-error")}" data-file="${id}">
      <span class="rv-file__icon" data-kind="${k}">${RV.ic(kindIcon[k])}</span>
      <div class="rv-file__main"><div class="rv-file__row"><span class="rv-file__name" title="${esc(name)}">${esc(name)}</span><span class="rv-file__status">${done ? RV.ic("check", "sm") + " " : ""}${esc(status)}</span></div>${done ? "" : RV.progress({ value: error ? 100 : progress, error: !!error, thin: true })}</div>
      ${error ? RV.iconButton({ icon: "rotate-ccw", label: "Tentar de novo", attrs: { "data-rv-file-retry": id } }) : RV.iconButton({ icon: done ? "trash-2" : "x", label: done ? "Remover" : "Cancelar envio", attrs: { "data-rv-file-remove": id } })}
    </div>`;
  };

  /** Simula upload de { name, size } dentro de uma lista; failAt força erro. */
  RV.simulateUpload = (list, { name, size, failAt, error = "Falha na conexão. Tente de novo." }) => {
    const f = { id: nextId("file"), name, size, progress: 0 };
    list.insertAdjacentHTML("beforeend", RV.fileRow(f));
    RV.refreshIcons();
    const run = () => {
      const el = list.querySelector(`[data-file="${f.id}"]`);
      if (!el) return;
      f.progress = Math.min(100, f.progress + 6 + Math.random() * 14);
      if (failAt && f.progress >= failAt) { f.error = error; f.progress = failAt; }
      el.outerHTML = RV.fileRow(f);
      RV.refreshIcons();
      if (!f.error && f.progress < 100) setTimeout(run, reduceMotion() ? 20 : 180);
    };
    f.retry = () => { f.error = null; f.progress = 0; failAt = null; run(); };
    uploads.set(f.id, f);
    setTimeout(run, 150);
    return f;
  };
  const uploads = new Map();

  /* ---------- Etapa (linha do tempo) ---------- */
  const stepIcon = { waiting: "", running: "sparkles", done: "check", failed: "x" };
  RV.step = ({ id = nextId("step"), state = "waiting", title, sub, time, detail, open } = {}) => {
    const did = `${id}-d`;
    return `<div class="rv-step" data-step="${id}" data-state="${state}">
      <span class="rv-step__dot" aria-hidden="true">${stepIcon[state] ? RV.ic(stepIcon[state]) : ""}</span>
      <div class="rv-step__main">
        <button type="button" class="rv-step__head" ${detail ? `aria-expanded="${!!open}" aria-controls="${did}" data-rv-collapse="${did}"` : "disabled style='cursor:default'"}>
          <span class="rv-step__title">${esc(title)}<span class="rv-sr"> · ${{ waiting: "aguardando", running: "executando", done: "concluída", failed: "falhou" }[state]}</span></span>
          <span class="rv-step__time" data-step-time ${state === "running" && !time ? `data-rv-since="${Date.now()}"` : ""}>${esc(time || (state === "waiting" ? "Aguardando" : ""))}</span>
          ${detail ? RV.ic("chevron-down", "rv-chev") : ""}
        </button>
        ${sub ? `<div class="rv-step__sub" data-step-sub>${esc(sub)}</div>` : `<div class="rv-step__sub" data-step-sub hidden></div>`}
        ${detail ? `<div id="${did}" class="rv-collapse ${open ? "is-open" : ""}"><div><div class="rv-step__detail">${detail}</div></div></div>` : ""}
      </div>
    </div>`;
  };
  RV.setStep = (el, { state, sub, time, detail } = {}) => {
    if (!el) return;
    const prev = el.dataset.state;
    if (state) {
      el.dataset.state = state;
      el.querySelector(".rv-step__dot").innerHTML = stepIcon[state] ? RV.ic(stepIcon[state]) : "";
      const t = el.querySelector("[data-step-time]");
      if (state === "running" && prev !== "running") { t.dataset.rvSince = Date.now(); t.textContent = "0s"; }
      if (state !== "running") delete t.dataset.rvSince;
      if (state === "waiting") t.textContent = "Aguardando";
      const sr = el.querySelector(".rv-step__title .rv-sr");
      if (sr) sr.textContent = ` · ${{ waiting: "aguardando", running: "executando", done: "concluída", failed: "falhou" }[state]}`;
    }
    if (time != null) el.querySelector("[data-step-time]").textContent = time;
    if (sub != null) { const s = el.querySelector("[data-step-sub]"); s.hidden = !sub; s.textContent = sub; }
    if (detail != null) { const d = el.querySelector(".rv-step__detail"); if (d) d.innerHTML = detail; }
    RV.refreshIcons();
  };

  /* ---------- Visualizador de imagem (portfólio) ---------- */
  /** images: [{ media (HTML), title, desc, meta: [[rótulo, valor]], ratio }] */
  RV.lightbox = (images = [], index = 0) => {
    let i = index;
    const o = openOverlay(`<div class="rv-lightbox"><div class="rv-lightbox__media" data-lb-media></div><aside class="rv-lightbox__side" data-lb-side></aside>${RV.iconButton({ icon: "x", label: "Fechar", cls: "rv-lightbox__close bordered", attrs: { "data-rv-close": "" } })}</div>`, { label: "Imagem ampliada" });
    const media = o.el.querySelector("[data-lb-media]");
    const side = o.el.querySelector("[data-lb-side]");
    const render = () => {
      const im = images[i];
      const [w, h] = (im.ratio || "4:3").split(":");
      media.innerHTML = `<div class="rv-lightbox__frame" style="aspect-ratio:${w} / ${h}">${im.media}</div>${images.length > 1 ? RV.iconButton({ icon: "chevron-left", label: "Anterior", cls: "rv-lightbox__nav prev bordered lg", attrs: { "data-lb": "prev" } }) + RV.iconButton({ icon: "chevron-right", label: "Próxima", cls: "rv-lightbox__nav next bordered lg", attrs: { "data-lb": "next" } }) : ""}`;
      side.innerHTML = `<div><div class="rv-overline">${i + 1} de ${images.length}</div><h3 class="rv-h3" style="margin-top:6px">${esc(im.title)}</h3></div>${im.desc ? `<p class="rv-small rv-muted" style="margin:0">${esc(im.desc)}</p>` : ""}${im.meta ? `<dl class="rv-kv">${im.meta.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}`;
      RV.refreshIcons();
    };
    const go = (d) => { i = (i + d + images.length) % images.length; render(); };
    o.el.addEventListener("click", (e) => { const a = e.target.closest("[data-lb]")?.dataset.lb; if (a === "prev") go(-1); if (a === "next") go(1); });
    o.el.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); });
    render();
    return o;
  };

  /* ==========================================================================
     SITE E MARCA
     Peças para o site do Revo Studio, propostas e materiais. Sem foto ou
     ilustração: a imagem da marca é cor em movimento (gradiente com desfoque)
     com vidro por cima, como nas referências.
     ========================================================================== */

  /** Fundo de marca (substitui foto enquanto não há produção própria). */
  RV.coverTones = ["pine", "rose", "violet", "mist", "night"];
  RV.cover = ({ tone = "pine", tag, title, sub, size = "", cls = "" } = {}) =>
    `<div class="${cx("rv-cover", size && `rv-cover--${size}`, cls)}" data-tone="${tone}" aria-hidden="${title ? "false" : "true"}">
      <span class="rv-cover__blob a"></span><span class="rv-cover__blob b"></span><span class="rv-cover__blob c"></span>
      ${tag ? `<span class="rv-cover__tag">${esc(tag)}</span>` : ""}
      ${title ? `<span class="rv-cover__text"><span class="rv-cover__title">${title}</span>${sub ? `<span class="rv-cover__sub">${esc(sub)}</span>` : ""}</span>` : ""}
    </div>`;

  /** Navegação do site. */
  RV.siteNav = ({ links = ["Serviços", "Trabalhos", "Como trabalhamos", "Sobre"], active, cta = "Fale com o studio", glass = true } = {}) =>
    `<header class="${cx("rv-sitenav", glass && "is-glass")}">
      <a href="#" class="rv-sitenav__logo" aria-label="Revo Studio, início">${RV.logo(20)}</a>
      <nav class="rv-sitenav__links" aria-label="Principal">${links.map((l) => `<a href="#" ${l === active ? 'aria-current="page"' : ""}>${esc(l)}</a>`).join("")}</nav>
      <div class="rv-sitenav__end">${RV.button({ label: cta, size: "sm", iconRight: "arrow-up-right", cls: "rv-sitenav__cta" })}${RV.iconButton({ icon: "menu", label: "Abrir menu", cls: "rv-sitenav__menu bordered", attrs: { "data-rv-sitemenu": JSON.stringify(links) } })}</div>
    </header>`;

  /** Hero. */
  RV.hero = ({ kicker = "Studio criativo AI first", title = "Ofício de studio.<br>Velocidade de IA.", lead = "Marca, vídeo, sites e design contínuo para seguradoras, insurtechs, entidades e grandes corretoras. Com fluência em seguros.", proof = "Nosso time vem da Segbox, que constrói tecnologia para seguradoras.", ctas, visual = true } = {}) =>
    `<section class="rv-hero">
      <div class="rv-hero__copy">
        <span class="rv-overline rv-hero__kicker"><i></i>${esc(kicker)}</span>
        <h1 class="rv-hero__title">${title}</h1>
        <p class="rv-hero__lead">${esc(lead)}</p>
        <div class="rv-btn-group">${ctas ?? RV.button({ label: "Fale com o studio", size: "lg", iconRight: "arrow-up-right" }) + RV.button({ label: "Ver trabalhos", size: "lg", variant: "secondary" })}</div>
        ${proof ? `<p class="rv-hero__proof">${RV.ic("badge-check", "sm")}${esc(proof)}</p>` : ""}
      </div>
      ${visual ? `<div class="rv-hero__visual">${RV.cover({ tone: "pine", size: "fill" })}
        <div class="rv-hero__glass rv-glass one"><span class="rv-overline">Em produção</span><strong>Comercial 30 s · Lançamento auto</strong><span class="rv-hero__bar"><i style="width:72%"></i></span><small>Animatic aprovado · finalização</small></div>
        <div class="rv-hero__glass rv-glass two"><span class="rv-overline">DaaS · esta semana</span><strong class="rv-mono-num">38 peças</strong><small>para a rede de corretores</small></div>
      </div>` : ""}
    </section>`;

  /** Faixa corrida (ticker). */
  RV.ticker = (items = ["Identidade visual", "Vídeo com IA", "Sites e landing pages", "Design sob demanda", "Mascotes e AI creators"]) => {
    const row = items.map((t) => `<span>${esc(t)}</span><i aria-hidden="true"></i>`).join("");
    return `<div class="rv-ticker" role="marquee" aria-label="${esc(items.join(", "))}"><div class="rv-ticker__track" aria-hidden="true">${row}${row}</div></div>`;
  };

  /** Manifesto numerado. */
  RV.manifesto = ({ kicker = "Manifesto", title = "IA na produção.<br>Critério na direção.", items = [] } = {}) =>
    `<section class="rv-manifesto">
      <div class="rv-manifesto__head"><span class="rv-overline">${esc(kicker)}</span><h2 class="rv-section-title">${title}</h2></div>
      <ol class="rv-manifesto__list">${items.map((it, i) => `<li><span class="rv-manifesto__n">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div></li>`).join("")}</ol>
    </section>`;

  /** Card de serviço. variant: "cover" (visual) ou "detail" (entregáveis). */
  RV.serviceCard = ({ n, title, tag, text, deliverables = [], tone = "pine", variant = "cover", model, cta = "Ver serviço" } = {}) =>
    variant === "cover"
      ? `<a href="#" class="rv-service rv-service--cover" data-tone="${tone}">${RV.cover({ tone, size: "fill" })}<span class="rv-cover__tag">${esc(tag || title)}</span><span class="rv-service__body"><span class="rv-service__title">${esc(title)}</span><span class="rv-service__text">${esc(text)}</span><span class="rv-service__link">${esc(cta)}${RV.ic("arrow-up-right", "sm")}</span></span></a>`
      : `<article class="rv-service rv-service--detail"><div class="rv-service__top"><span class="rv-service__n rv-mono-num">${n ? String(n).padStart(2, "0") : ""}</span>${tag ? RV.badge({ label: tag, tag: true }) : ""}</div><h3 class="rv-service__title">${esc(title)}</h3><p class="rv-service__text">${esc(text)}</p>${deliverables.length ? `<ul class="rv-service__list">${deliverables.map((d) => `<li>${RV.ic("check", "sm")}${esc(d)}</li>`).join("")}</ul>` : ""}<div class="rv-service__foot">${model ? `<span class="rv-caption">${esc(model)}</span>` : "<span></span>"}${RV.button({ label: cta, variant: "ghost", size: "sm", iconRight: "arrow-right" })}</div></article>`;

  /** Pilares (objeção do cliente + resposta). */
  RV.pillars = (items = []) =>
    `<div class="rv-pillars">${items.map((p, i) => `<article class="rv-pillar"><span class="rv-overline">${String(i + 1).padStart(2, "0")} · ${esc(p.name)}</span><p class="rv-pillar__q">“${esc(p.q)}”</p><p class="rv-pillar__a">${esc(p.a)}</p></article>`).join("")}</div>`;

  /** Processo do studio (linha horizontal que vira vertical no celular). */
  RV.process = (steps = []) =>
    `<ol class="rv-process">${steps.map((s, i) => `<li class="rv-process__step" ${s.current ? 'aria-current="step"' : ""}><span class="rv-process__dot">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.ai ? `<span class="rv-process__ai">${RV.ic("sparkles", "sm")}${esc(s.ai)}</span>` : ""}</div></li>`).join("")}</ol>`;

  /** Card de trabalho (portfólio). */
  RV.workCard = ({ id = nextId("work"), title, client, service, year, tone = "pine", ratio = "4:3", coverTitle, coverSub } = {}) => {
    const [w, h] = ratio.split(":");
    return `<article class="rv-work" data-work="${id}">
      <button type="button" class="rv-work__media" style="aspect-ratio:${w} / ${h}" data-rv-work-open aria-label="Ampliar ${esc(title)}">${RV.cover({ tone, size: "fill", title: coverTitle, sub: coverSub })}<span class="rv-work__open">${RV.ic("maximize-2", "sm")}Ver case</span></button>
      <div class="rv-work__meta"><div><h3 class="rv-work__title">${esc(title)}</h3><span class="rv-work__client">${esc(client)}</span></div><span class="rv-work__info">${service ? RV.badge({ label: service, tag: true }) : ""}${year ? `<span class="rv-mono-num rv-caption">${esc(year)}</span>` : ""}</span></div>
    </article>`;
  };

  /** Bloco de case. */
  RV.caseBlock = ({ tag, client, title, challenge, solution, results = [], tone = "violet", note } = {}) =>
    `<article class="rv-case">
      <div class="rv-case__media">${RV.cover({ tone, size: "fill", tag, title: esc(title) })}</div>
      <div class="rv-case__body">
        <span class="rv-overline">${esc(client)}</span>
        <dl class="rv-case__dl"><div><dt>Desafio</dt><dd>${esc(challenge)}</dd></div><div><dt>O que fizemos</dt><dd>${esc(solution)}</dd></div></dl>
        ${results.length ? `<div class="rv-case__results">${results.map(([n, l]) => `<div><strong class="rv-mono-num">${esc(n)}</strong><span>${esc(l)}</span></div>`).join("")}</div>` : ""}
        ${note ? `<p class="rv-caption" style="margin:0">${esc(note)}</p>` : ""}
      </div>
    </article>`;

  /** Planos (ex.: DaaS por capacidade). */
  RV.plans = (plans = []) =>
    `<div class="rv-plans">${plans.map((p) => `<article class="${cx("rv-plan", p.featured && "is-featured")}">
      <div class="rv-plan__head"><span class="rv-overline">${esc(p.name)}</span>${p.featured ? RV.badge({ label: "Mais escolhido", tone: "violet" }) : ""}</div>
      <div class="rv-plan__price"><strong>${esc(p.price)}</strong>${p.unit ? `<span>${esc(p.unit)}</span>` : ""}</div>
      <p class="rv-plan__for">${esc(p.for)}</p>
      <ul class="rv-plan__list">${p.items.map((it) => `<li>${RV.ic("check", "sm")}${esc(it)}</li>`).join("")}</ul>
      ${RV.button({ label: p.cta || "Conversar sobre este plano", variant: p.featured ? "primary" : "secondary", block: true })}
    </article>`).join("")}</div>`;

  /** Depoimento. */
  RV.quote = ({ text, name, role, tone = "rose" } = {}) =>
    `<figure class="rv-quote" data-tone="${tone}"><blockquote>“${esc(text)}”</blockquote><figcaption>${RV.avatar({ name, tone: tone === "rose" ? "rose" : "pine", size: "lg" })}<span><b>${esc(name)}</b><small>${esc(role)}</small></span></figcaption></figure>`;

  /** Faixa de logos (clientes). */
  RV.logoStrip = ({ title = "Quem já trabalha com o time", logos = [] } = {}) =>
    `<section class="rv-logos"><span class="rv-overline">${esc(title)}</span><div class="rv-logos__row">${logos.map((l) => `<span class="rv-logos__item">${esc(l)}</span>`).join("")}</div></section>`;

  /** FAQ (accordion com o estilo do site). */
  RV.faq = (items = []) => RV.accordion({ items }).replace('class="rv-accordion"', 'class="rv-accordion rv-faq"');

  /** Formulário de contato (filtra o público e direciona corretor autônomo para a Segbox). */
  RV.contactForm = ({ id = nextId("ct"), services = ["Identidade visual", "Vídeo com IA", "Sites e LPs", "Design sob demanda (DaaS)", "Mascotes e AI creators"] } = {}) =>
    `<form class="rv-contact" data-rv-contact id="${id}" novalidate>
      <div class="rv-contact__grid">
        ${RV.field({ label: "Nome", id: `${id}-nome`, control: RV.input({ id: `${id}-nome`, placeholder: "Seu nome", attrs: { required: true, autocomplete: "name" } }) })}
        ${RV.field({ label: "E-mail corporativo", id: `${id}-email`, control: RV.input({ id: `${id}-email`, type: "email", placeholder: "nome@empresa.com.br", attrs: { required: true, autocomplete: "email" } }) })}
        ${RV.field({ label: "Empresa", id: `${id}-empresa`, control: RV.input({ id: `${id}-empresa`, placeholder: "Nome da empresa", attrs: { required: true, autocomplete: "organization" } }) })}
        ${RV.field({ label: "Cargo", id: `${id}-cargo`, optional: true, control: RV.input({ id: `${id}-cargo`, placeholder: "Ex.: Gerente de marketing" }) })}
      </div>
      ${RV.field({ label: "Tipo de empresa", control: RV.select({ id: `${id}-tipo`, placeholder: "Selecione", options: [{ label: "Seguradora", value: "seguradora" }, { label: "Insurtech", value: "insurtech" }, { label: "Entidade do setor", value: "entidade" }, { label: "Corretora, assessoria ou consolidadora de grande porte", value: "corretora" }, { label: "Corretor autônomo ou pequena corretora", value: "autonomo" }] }) })}
      <div class="rv-contact__route" data-route hidden>${RV.alert({ tone: "info", title: "Para corretores, o caminho é a Segbox", text: "O Revo atende seguradoras, insurtechs, entidades e grandes corretoras. Para corretores e pequenas corretoras, a Segbox tem produtos prontos de marketing.", actions: RV.button({ label: "Conhecer a Segbox", size: "sm", variant: "secondary", iconRight: "arrow-up-right" }) })}</div>
      <fieldset class="rv-contact__services"><legend class="rv-field__label">O que você precisa</legend><div class="rv-chips">${services.map((s) => RV.chip({ label: s, pressed: false })).join("")}</div></fieldset>
      ${RV.field({ label: "Conte o desafio", id: `${id}-msg`, counter: "0/800", control: RV.textarea({ id: `${id}-msg`, placeholder: "Contexto, prazo e o que precisa sair do outro lado.", max: 800 }) })}
      ${RV.dropzone({ id: `${id}-up`, title: "Anexar briefing (opcional)", hint: "PDF, DOCX, PPTX ou imagens até 25 MB" })}
      ${RV.checkbox({ label: "Aceito que o Revo Studio use estes dados para responder ao contato.", name: "consent" })}
      <div class="rv-contact__foot">${RV.button({ label: "Enviar", size: "lg", iconRight: "arrow-up-right", type: "submit" })}<span class="rv-caption">Respondemos em até 1 dia útil.</span></div>
    </form>`;

  /** Liga validação e estados do formulário de contato (envio simulado). */
  RV.mountContact = (form) => {
    const sel = form.querySelector(".rv-dropdown");
    sel.addEventListener("rv:select", (e) => { form.querySelector("[data-route]").hidden = e.detail.value !== "autonomo"; });
    const setErr = (input, msg) => {
      const f = input.closest(".rv-field");
      f.classList.toggle("is-error", !!msg);
      f.querySelector(".rv-input")?.classList.toggle("is-error", !!msg);
      let h = f.querySelector(".rv-field__hint[data-err]");
      if (msg && !h) { f.insertAdjacentHTML("beforeend", `<div class="rv-field__hint" data-err>${RV.ic("circle-alert", "sm")}<span></span></div>`); h = f.querySelector("[data-err]"); RV.refreshIcons(); }
      if (h) { if (msg) h.querySelector("span").textContent = msg; else h.remove(); }
    };
    form.addEventListener("input", (e) => { if (e.target.closest(".rv-field.is-error")) setErr(e.target, ""); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = (s) => form.querySelector(s);
      const checks = [
        [q('[id$="-nome"]'), (v) => (v.trim().length < 2 ? "Diga como podemos te chamar" : "")],
        [q('[id$="-email"]'), (v) => (!/^\S+@\S+\.\S+$/.test(v) ? "Digite um e-mail válido, como nome@empresa.com.br" : /@(gmail|hotmail|outlook|yahoo)\./i.test(v) ? "Use o e-mail da empresa" : "")],
        [q('[id$="-empresa"]'), (v) => (!v.trim() ? "Informe a empresa" : "")],
      ];
      let first = null;
      checks.forEach(([el, fn]) => { const m = fn(el.value); setErr(el, m); if (m && !first) first = el; });
      const consent = q('input[name="consent"]');
      consent.closest(".rv-check").classList.toggle("is-error", !consent.checked);
      if (first) { first.focus(); return; }
      if (!consent.checked) { consent.focus(); RV.toast({ tone: "warning", title: "Falta o aceite", text: "Marque a caixa de consentimento para enviar." }); return; }
      const b = q('button[type="submit"]');
      b.classList.add("is-loading"); b.insertAdjacentHTML("beforeend", RV.spinner());
      await RV.sleep(1100);
      form.innerHTML = `<div class="rv-contact__done">${RV.empty({ icon: "mail-check", title: "Recebemos sua mensagem", text: "Alguém do studio responde em até 1 dia útil. Envio simulado: nada saiu desta página." })}</div>`;
      RV.refreshIcons();
    });
  };

  /** Faixa de chamada final. */
  RV.ctaBand = ({ title = "Conte o desafio da sua marca.", text = "Uma conversa de 30 minutos para entender o contexto e indicar o melhor caminho.", cta = "Agendar uma conversa" } = {}) =>
    `<section class="rv-ctaband">${RV.cover({ tone: "night", size: "fill" })}<div class="rv-ctaband__body"><h2 class="rv-section-title">${esc(title)}</h2><p>${esc(text)}</p><div class="rv-btn-group">${RV.button({ label: cta, size: "lg", variant: "glass", iconRight: "arrow-up-right" })}</div></div></section>`;

  /** Rodapé. */
  RV.footer = ({ cols } = {}) => {
    const c = cols || [["Serviços", ["Identidade visual", "Vídeo com IA", "Sites e LPs", "Design sob demanda", "Mascotes e AI creators"]], ["Studio", ["Trabalhos", "Como trabalhamos", "Sobre", "Carreiras"]], ["Contato", ["Fale com o studio", "LinkedIn", "Instagram"]]];
    return `<footer class="rv-footer">
      <div class="rv-footer__brand"><span style="color:var(--rv-text)">${(window.REVO_LOGO_FULL || "").replace("<svg", '<svg width="150" role="img" aria-label="Revo, powered by segbox" style="display:block;height:auto"')}</span><p>Studio criativo AI first com fluência em seguros.</p></div>
      ${c.map(([h, ls]) => `<div class="rv-footer__col"><span class="rv-overline">${esc(h)}</span>${ls.map((l) => `<a href="#">${esc(l)}</a>`).join("")}</div>`).join("")}
      <div class="rv-footer__base"><span>© 2026 Revo Studio</span><span>Ofício de studio. Velocidade de IA.</span></div>
    </footer>`;
  };


  /* ==========================================================================
     COMPORTAMENTOS (delegação)
     ========================================================================== */
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { const t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok; }
  };
  RV.copy = copyText;
  const flashCopied = (btn) => {
    const old = btn.innerHTML;
    const hasLabel = btn.querySelector("span");
    btn.innerHTML = RV.ic("check") + (hasLabel ? "<span>Copiado</span>" : "");
    RV.refreshIcons();
    setTimeout(() => { btn.innerHTML = old; RV.refreshIcons(); }, 1600);
  };

  function closeMenus(except) {
    document.querySelectorAll(".rv-menu.is-open").forEach((m) => {
      if (m === except) return;
      m.classList.remove("is-open");
      m.parentElement.querySelector("[data-rv-dropdown]")?.setAttribute("aria-expanded", "false");
    });
  }
  function openMenu(trigger) {
    const menu = trigger.parentElement.querySelector(":scope > .rv-menu");
    if (!menu) return;
    const willOpen = !menu.classList.contains("is-open");
    closeMenus(menu);
    menu.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) {
      if (menu.classList.contains("rv-menu--fit")) menu.style.minWidth = trigger.offsetWidth + "px";
      // vira para cima se faltar espaço
      const r = trigger.getBoundingClientRect();
      const mh = menu.offsetHeight;
      if (!menu.dataset.fixedDir) {
        menu.dataset.fixedDir = menu.classList.contains("up") ? "up" : "down";
      }
      const prefersUp = menu.dataset.fixedDir === "up";
      const spaceBelow = innerHeight - r.bottom, spaceAbove = r.top;
      menu.classList.toggle("up", prefersUp ? spaceAbove > mh + 12 || spaceAbove > spaceBelow : spaceBelow < mh + 12 && spaceAbove > spaceBelow);
      // mantém o menu dentro da tela no eixo horizontal
      menu.style.translate = "0 0";
      menu.style.transform = "none";
      const mr = menu.getBoundingClientRect();
      menu.style.transform = "";
      if (mr.right > innerWidth - 8) menu.style.translate = `${Math.round(innerWidth - 8 - mr.right)}px 0`;
      else if (mr.left < 8) menu.style.translate = `${Math.round(8 - mr.left)}px 0`;
      (menu.querySelector(".is-selected") || menu.querySelector("button:not(:disabled)"))?.focus({ preventScroll: true });
    }
  }

  document.addEventListener("click", (e) => {
    const t = e.target;

    // Dropdown
    const trig = t.closest("[data-rv-dropdown]");
    if (trig) { e.preventDefault(); openMenu(trig); return; }
    const item = t.closest(".rv-menu .rv-menu__item");
    if (item && !item.disabled) {
      const dd = item.closest(".rv-dropdown");
      const menu = item.closest(".rv-menu");
      if (dd?.hasAttribute("data-rv-select")) {
        menu.querySelectorAll(".rv-menu__item").forEach((n) => { n.classList.toggle("is-selected", n === item); n.setAttribute("aria-checked", String(n === item)); });
        const v = dd.querySelector(".rv-select__value");
        if (v) { v.textContent = item.querySelector(".rv-truncate, .rv-menu__desc > span")?.textContent || item.textContent.trim(); v.classList.remove("is-placeholder"); }
        dd.dispatchEvent(new CustomEvent("rv:select", { bubbles: true, detail: { value: item.dataset.value } }));
      }
      if (!item.hasAttribute("data-keep-open")) { closeMenus(); dd?.querySelector("[data-rv-dropdown]")?.focus({ preventScroll: true }); }
      return;
    }
    if (!t.closest(".rv-menu")) closeMenus();

    // Colapsáveis (accordion, etapas)
    const col = t.closest("[data-rv-collapse]");
    if (col) {
      const panel = document.getElementById(col.dataset.rvCollapse);
      const open = col.getAttribute("aria-expanded") !== "true";
      const acc = col.closest(".rv-accordion");
      if (acc && !acc.hasAttribute("data-multiple") && open) {
        acc.querySelectorAll("[data-rv-collapse][aria-expanded='true']").forEach((o) => { o.setAttribute("aria-expanded", "false"); document.getElementById(o.dataset.rvCollapse)?.classList.remove("is-open"); });
      }
      col.setAttribute("aria-expanded", String(open));
      panel?.classList.toggle("is-open", open);
      return;
    }

    // Tabs
    const tab = t.closest("[data-rv-tabs] [role=tab]");
    if (tab && !tab.disabled) { selectTab(tab); return; }

    // Senha
    const pass = t.closest("[data-rv-toggle-pass]");
    if (pass) {
      const inp = document.getElementById(pass.dataset.rvTogglePass);
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      pass.innerHTML = RV.ic(show ? "eye-off" : "eye");
      pass.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
      pass.dataset.tip = show ? "Ocultar senha" : "Mostrar senha";
      RV.refreshIcons();
      return;
    }
    const clear = t.closest("[data-rv-clear]");
    if (clear) { const inp = clear.parentElement.querySelector("input"); inp.value = ""; clear.hidden = true; inp.focus(); inp.dispatchEvent(new Event("input", { bubbles: true })); return; }

    // Copiar
    const cp = t.closest("[data-rv-copy]");
    if (cp) { const src = document.querySelector(cp.dataset.rvCopy); copyText(src?.dataset.raw ?? src?.innerText ?? "").then(() => flashCopied(cp)); return; }

    // Alertas
    const dis = t.closest("[data-rv-dismiss]");
    if (dis) { const a = dis.closest(".rv-alert"); a.style.transition = "opacity .2s"; a.style.opacity = "0"; setTimeout(() => a.remove(), 200); return; }

    // Chips com toggle
    const chip = t.closest(".rv-chip[aria-pressed]");
    if (chip) { chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true")); return; }

    // Paginação
    const pg = t.closest("[data-rv-pagination] .rv-page[data-page]");
    if (pg && !pg.disabled) {
      const nav = pg.closest("[data-rv-pagination]");
      const fresh = RV.html(RV.pagination({ page: +pg.dataset.page, total: +nav.dataset.total, id: nav.id }));
      nav.replaceWith(fresh);
      RV.refreshIcons();
      fresh.querySelector('[aria-current="page"]')?.focus();
      fresh.dispatchEvent(new CustomEvent("rv:page", { bubbles: true, detail: { page: +pg.dataset.page } }));
      return;
    }

    // Menu do site no celular
    const sm = t.closest("[data-rv-sitemenu]");
    if (sm) { const links = JSON.parse(sm.dataset.rvSitemenu); RV.drawer({ title: "Menu", body: `<nav class="rv-sitemenu">${links.map((l) => `<a href="#" data-rv-close>${esc(l)}</a>`).join("")}</nav>`, foot: RV.button({ label: "Fale com o studio", block: true, iconRight: "arrow-up-right", attrs: { "data-rv-close": "" } }) }); return; }

    // Upload
    const dz = t.closest(".rv-dropzone");
    if (dz) { dz.querySelector("input[type=file]").click(); return; }
    const fr = t.closest("[data-rv-file-remove]");
    if (fr) { const row = fr.closest(".rv-file"); row.style.transition = "opacity .2s, transform .2s"; row.style.opacity = "0"; row.style.transform = "translateX(8px)"; uploads.delete(fr.dataset.rvFileRemove); setTimeout(() => row.remove(), 200); return; }
    const rt = t.closest("[data-rv-file-retry]");
    if (rt) { uploads.get(rt.dataset.rvFileRetry)?.retry(); return; }

  });

  document.addEventListener("change", (e) => {
    const inp = e.target;
    const up = inp.closest("[data-rv-upload]");
    if (up && inp.type === "file") { handleFiles(up, inp.files); inp.value = ""; }
  });

  function handleFiles(up, files) {
    const list = up.querySelector("[data-rv-filelist]");
    const max = +up.dataset.max * 1048576;
    [...files].forEach((f) => {
      if (f.size > max) {
        list.insertAdjacentHTML("beforeend", RV.fileRow({ name: f.name, size: f.size, error: `Arquivo acima de ${up.dataset.max} MB` }));
        RV.refreshIcons();
      } else RV.simulateUpload(list, { name: f.name, size: f.size });
    });
  }
  RV.handleFiles = handleFiles;

  ["dragenter", "dragover"].forEach((ev) => document.addEventListener(ev, (e) => { const dz = e.target.closest?.(".rv-dropzone"); if (dz) { e.preventDefault(); dz.classList.add("is-dragover"); } }));
  document.addEventListener("dragleave", (e) => { const dz = e.target.closest?.(".rv-dropzone"); if (dz && !dz.contains(e.relatedTarget)) dz.classList.remove("is-dragover"); });
  document.addEventListener("drop", (e) => { const dz = e.target.closest?.(".rv-dropzone"); if (dz) { e.preventDefault(); dz.classList.remove("is-dragover"); handleFiles(dz.closest("[data-rv-upload]"), e.dataTransfer.files); } });

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-rv-range]")) {
      const p = ((t.value - t.min) / (t.max - t.min)) * 100;
      t.style.setProperty("--p", p + "%");
      const out = t.closest(".rv-slider")?.querySelector("output");
      if (out) out.textContent = t.value + (out.dataset.unit || "");
    }
    if (t.matches("[data-rv-strength]")) {
      const v = t.value;
      const lvl = !v ? 0 : [/.{8,}/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length || 1;
      document.querySelector(`[data-rv-strength-for="${t.id}"]`)?.setAttribute("data-level", lvl);
    }
    if (t.matches("[data-rv-count]")) {
      const c = document.querySelector(`[data-rv-counter-for="${t.id}"]`);
      if (c) c.textContent = `${t.value.length}/${t.maxLength}`;
    }
    const clr = t.parentElement?.querySelector?.("[data-rv-clear]");
    if (clr) clr.hidden = !t.value;
  });

  /* Teclado: Esc fecha menus, setas navegam em menus e tabs */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.querySelector(".rv-menu.is-open")) {
      const m = document.querySelector(".rv-menu.is-open");
      closeMenus();
      m.parentElement.querySelector("[data-rv-dropdown]")?.focus();
      e.stopPropagation();
      return;
    }
    const menu = e.target.closest?.(".rv-menu.is-open");
    if (menu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const items = [...menu.querySelectorAll(".rv-menu__item:not(:disabled)")];
      const i = items.indexOf(document.activeElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
    const tab = e.target.closest?.("[role=tab]");
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const tabs = [...tab.parentElement.querySelectorAll("[role=tab]:not(:disabled)")];
      const n = tabs[(tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); selectTab(n);
    }
    const dz = e.target.closest?.(".rv-dropzone");
    if (dz && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); dz.querySelector("input").click(); }
  });

  /* Tabs */
  function selectTab(tab) {
    const root = tab.closest("[data-rv-tabs]");
    const list = tab.parentElement;
    list.querySelectorAll("[role=tab]").forEach((b) => {
      const on = b === tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      const p = document.getElementById(b.getAttribute("aria-controls"));
      if (p) { p.hidden = !on; if (on) { p.classList.remove("is-entering"); void p.offsetWidth; p.classList.add("is-entering"); } }
    });
    placeIndicator(list);
    root.dispatchEvent(new CustomEvent("rv:tab", { bubbles: true, detail: { tab: tab.dataset.tab } }));
  }
  RV.selectTab = (root, id) => { const t = root.querySelector(`[role=tab][data-tab="${id}"]`); if (t) selectTab(t); };
  function placeIndicator(list) {
    const ind = list.querySelector(".rv-tab-indicator");
    const sel = list.querySelector("[aria-selected=true]");
    if (!ind || !sel) return;
    ind.style.width = sel.offsetWidth + "px";
    ind.style.transform = `translateX(${sel.offsetLeft}px)`;
  }
  const ro = "ResizeObserver" in window ? new ResizeObserver((ents) => ents.forEach((en) => placeIndicator(en.target))) : null;
  function initTabs(root = document) {
    root.querySelectorAll?.(".rv-tablist").forEach((l) => {
      if (!l.dataset.rvInit) { l.dataset.rvInit = "1"; ro?.observe(l); }
      placeIndicator(l);
    });
  }

  /* Tooltip único, posicionado */
  let tipEl, tipFor;
  const showTip = (el) => {
    const txt = el.dataset.tip;
    if (!txt) return;
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "rv-tooltip"; tipEl.setAttribute("role", "tooltip"); document.body.appendChild(tipEl); }
    tipFor = el;
    tipEl.innerHTML = `<span>${esc(txt)}</span>${el.dataset.tipKbd ? `<span class="rv-kbd">${esc(el.dataset.tipKbd)}</span>` : ""}`;
    const r = el.getBoundingClientRect();
    tipEl.style.left = "0px"; tipEl.style.top = "0px";
    const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    let top = r.top - th - 8;
    if (top < 6) top = r.bottom + 8;
    const left = Math.max(6, Math.min(innerWidth - tw - 6, r.left + r.width / 2 - tw / 2));
    tipEl.style.left = left + "px"; tipEl.style.top = top + "px";
    tipEl.classList.add("is-open");
  };
  const hideTip = () => { tipEl?.classList.remove("is-open"); tipFor = null; };
  document.addEventListener("pointerover", (e) => { const el = e.target.closest?.("[data-tip]"); if (el && el !== tipFor && !el.disabled) showTip(el); else if (!el) hideTip(); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest?.("[data-tip]"); if (el && e.target.matches(":focus-visible")) showTip(el); });
  document.addEventListener("focusout", hideTip);
  document.addEventListener("pointerdown", hideTip);
  addEventListener("scroll", hideTip, true);

  /* Timers ao vivo (tempo decorrido) */
  setInterval(() => {
    document.querySelectorAll("[data-rv-since]").forEach((n) => { n.textContent = RV.fmtTime(Date.now() - +n.dataset.rvSince); });
  }, 250);

  /* Observa o DOM para ícones, tabs e checkboxes indeterminados */
  const mo = new MutationObserver(() => {
    RV.refreshIcons();
    initTabs();
    document.querySelectorAll("input[data-indeterminate]").forEach((i) => { i.indeterminate = true; i.removeAttribute("data-indeterminate"); });
  });
  RV.init = () => {
    RV.refreshIcons();
    initTabs();
    document.querySelectorAll("input[data-indeterminate]").forEach((i) => { i.indeterminate = true; i.removeAttribute("data-indeterminate"); });
    mo.observe(document.body, { childList: true, subtree: true });
    document.fonts?.ready.then(() => initTabs());
  };

  /* Tema */
  RV.setTheme = (t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem("rv-theme", t); } catch {} };
  try { const saved = localStorage.getItem("rv-theme"); if (saved) document.documentElement.dataset.theme = saved; } catch {}
})();
