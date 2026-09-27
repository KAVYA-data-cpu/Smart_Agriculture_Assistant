/* ==========================================================================
   script.js — Shared UI kernel v2.0
   Navbar / sidebar / footer / chatbot · Theme · Toasts · 3D tilt
   Particle system · Animated counters · Ripple · Validation · CSV export
   ========================================================================== */

/* ---------------------------------------------------------------- helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs = {}, html = '') => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) =>
    (k === 'class' ? (node.className = v) : node.setAttribute(k, v)));
  if (html) node.innerHTML = html;
  return node;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (n, d = 2) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: d }) : '—';
const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
const titleCase = (s) => String(s ?? '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const pick = (obj, keys, fallback = undefined) => {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  return fallback;
};
const asList = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) if (Array.isArray(data[k])) return data[k];
  for (const v of Object.values(data)) if (Array.isArray(v)) return v;
  return [];
};

const NAV = [
  { group: 'Overview', items: [
      { href: 'index.html', icon: 'dashboard', label: 'Home Dashboard' },
      { href: 'demo.html',  icon: 'smart_display', label: '🎬 3-Min Demo Video' }
    ]
  },
  {
    group: 'Advisory',
    items: [
      { href: 'pages/crop.html',       icon: 'psychiatry',  label: 'Crop Recommendation' },
      { href: 'pages/fertilizer.html', icon: 'science',     label: 'Fertilizer' },
      { href: 'pages/soil.html',       icon: 'terrain',     label: 'Soil Health' },
      { href: 'pages/disease.html',    icon: 'coronavirus', label: 'Disease Detection' },
    ],
  },
  {
    group: 'Insights',
    items: [
      { href: 'pages/market.html',  icon: 'insights',   label: 'Market Intelligence' },
      { href: 'pages/news.html',    icon: 'newspaper',  label: 'Agriculture News' },
      { href: 'pages/history.html', icon: 'history',    label: 'Prediction History' },
    ],
  },
  {
    group: 'Assistants',
    items: [
      { href: 'pages/chatbot.html', icon: 'forum',      label: 'AI Chatbot' },
      { href: 'pages/voice.html',   icon: 'graphic_eq', label: 'Voice Assistant' },
    ],
  },
];

/** Root-relative prefix so the same markup works from / and /pages/. */
const ROOT = document.body?.dataset.root || (location.pathname.includes('/pages/') ? '../' : './');
const link = (href) => ROOT + href;

/* ----------------------------------------------------------------- theme */
const Theme = {
  key: 'saa.theme',
  get() {
    return localStorage.getItem(this.key) ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  },
  apply(mode) {
    document.documentElement.dataset.theme = mode;
    const btn = $('#themeToggle .mi');
    if (btn) btn.textContent = mode === 'dark' ? 'light_mode' : 'dark_mode';
  },
  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(this.key, next);
    this.apply(next);
    Toast.show(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled`, { type: 'info', title: 'Appearance' });
  },
};
// Apply immediately to prevent flash
document.documentElement.dataset.theme =
  localStorage.getItem('saa.theme') ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/* ---------------------------------------------------------------- toasts */
const Toast = {
  stack: null,
  ensure() {
    if (!this.stack) {
      this.stack = el('div', { class: 'toast-stack', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(this.stack);
    }
    return this.stack;
  },
  show(message, { type = 'success', title = '', timeout = 4200 } = {}) {
    const icons = { success: 'check_circle', error: 'error', warn: 'warning', info: 'info' };
    const node = el('div', { class: `toast ${type}`, role: 'alert' },
      `<span class="mi" aria-hidden="true">${icons[type] || 'info'}</span>
       <div class="toast__body">${title ? `<strong>${esc(title)}</strong>` : ''}${esc(message)}</div>
       <button class="icon-btn" style="width:28px;height:28px;border:0;background:transparent;flex-shrink:0" aria-label="Dismiss">
         <span class="mi" style="font-size:17px">close</span></button>`);
    const close = () => { node.classList.add('is-out'); setTimeout(() => node.remove(), 320); };
    node.querySelector('button').onclick = close;
    this.ensure().appendChild(node);
    if (timeout) setTimeout(close, timeout);
    return node;
  },
  success: (m, t) => Toast.show(m, { type: 'success', title: t || 'Success' }),
  error:   (m, t) => Toast.show(m, { type: 'error',   title: t || 'Something went wrong', timeout: 6000 }),
  info:    (m, t) => Toast.show(m, { type: 'info',    title: t }),
  warn:    (m, t) => Toast.show(m, { type: 'warn',    title: t || 'Heads up' }),
};

/* ------------------------------------------------------------- UI states */
const UI = {
  loading(node, text = 'Loading…') {
    if (!node) return;
    node.innerHTML = `<div class="loader">
      <div class="spinner" aria-hidden="true"></div>
      <div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
      <p class="small muted" style="margin:0">${esc(text)}</p></div>`;
    node.setAttribute('aria-busy', 'true');
  },
  error(node, message, onRetry) {
    if (!node) return;
    node.removeAttribute('aria-busy');
    node.innerHTML = `<div class="alert"><span class="mi" aria-hidden="true">error</span>
      <div><strong>Request failed</strong><div class="small">${esc(message)}</div></div></div>`;
    if (onRetry) {
      const b = el('button', { class: 'btn btn--ghost btn--sm mt-1' },
        '<span class="mi">refresh</span>Try again');
      b.onclick = onRetry;
      node.appendChild(b);
    }
  },
  empty(node, message = 'Nothing to show yet.', icon = 'inbox') {
    if (!node) return;
    node.removeAttribute('aria-busy');
    node.innerHTML = `<div class="empty"><span class="mi" aria-hidden="true">${icon}</span>
      <p class="mt-1">${esc(message)}</p></div>`;
  },
  ready(node) { node?.removeAttribute('aria-busy'); },
  busy(btn, text = 'Working…') {
    if (!btn) return () => {};
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner spinner--sm" aria-hidden="true"></span>${esc(text)}`;
    return () => { btn.disabled = false; btn.innerHTML = original; };
  },
};

/* ------------------------------------------------------------ validation */
const Validate = {
  form(form, rules) {
    let valid = true;
    const values = {};
    Object.entries(rules).forEach(([name, rule]) => {
      const input = form.elements[name];
      if (!input) return;
      const errNode = form.querySelector(`[data-error-for="${name}"]`);
      const raw = String(input.value ?? '').trim();
      let message = '';

      if (rule.required && !raw) message = `${rule.label || titleCase(name)} is required`;
      else if (raw && rule.type === 'number') {
        const n = Number(raw);
        if (!Number.isFinite(n)) message = 'Enter a valid number';
        else if (rule.min !== undefined && n < rule.min) message = `Minimum is ${rule.min}`;
        else if (rule.max !== undefined && n > rule.max) message = `Maximum is ${rule.max}`;
        else values[name] = n;
      } else if (raw) values[name] = raw;

      input.classList.toggle('is-invalid', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (errNode) errNode.textContent = message;
      if (message) valid = false;
    });
    if (!valid) Toast.warn('Please fix the highlighted fields before submitting.', 'Check your input');
    return { valid, values };
  },
};

/* -------------------------------------------------------------- CSV export */
function exportCSV(rows, filename = 'export.csv') {
  if (!rows || !rows.length) { Toast.warn('There is no data to export yet.'); return; }
  const cols = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set()));
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
  Toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'} to CSV.`);
}

function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const a = el('a', { href, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}

/* --------------------------------------------------------------- shell UI */
function buildNavbar() {
  const host = $('[data-shell="navbar"]');
  if (!host) return;
  host.className = 'navbar';
  host.innerHTML = `
    <button class="icon-btn hamburger" id="menuToggle" aria-label="Open navigation" aria-expanded="false">
      <span class="mi" aria-hidden="true">menu</span>
    </button>
    <a class="brand" href="${link('index.html')}" aria-label="Smart Agriculture Assistant home">
      <span class="brand__mark" aria-hidden="true"><span class="mi">eco</span></span>
      <span class="brand__name">Smart<span>Agri</span> Assistant</span>
    </a>
    <div class="navbar__spacer"></div>
    <div class="navbar__actions">
      <button class="icon-btn" id="apiSettings" aria-label="Configure backend URL" title="Backend URL">
        <span class="mi" aria-hidden="true">settings_ethernet</span>
      </button>
      <button class="icon-btn" id="themeToggle" aria-label="Toggle dark mode" title="Toggle theme">
        <span class="mi" aria-hidden="true">dark_mode</span>
      </button>
      <a class="btn btn--primary btn--sm" href="${link('pages/crop.html')}">
        <span class="mi" aria-hidden="true">bolt</span>
        <span class="label-text">New prediction</span>
      </a>
    </div>`;

  $('#themeToggle').onclick = () => Theme.toggle();
  $('#apiSettings').onclick = () => {
    const next = prompt('FastAPI backend base URL', API.getBase());
    if (next === null) return;
    API.setBase(next);
    Toast.success(`Backend set to ${API.getBase()}`, 'Saved');
    setTimeout(() => location.reload(), 700);
  };
  $('#menuToggle').onclick = () => toggleSidebar();
}

function buildSidebar() {
  const host = $('[data-shell="sidebar"]');
  if (!host) return;
  host.className = 'sidebar';
  host.id = 'sidebar';
  host.setAttribute('aria-label', 'Main navigation');
  const current = location.pathname.split('/').pop() || 'index.html';

  host.innerHTML =
    `<button class="icon-btn sidebar__close hidden" id="sidebarClose" aria-label="Close navigation"
       style="margin-left:auto;margin-bottom:8px"><span class="mi" aria-hidden="true">close</span></button>` +
    NAV.map((g) => `
      <div class="sidebar__label">${g.group}</div>
      ${g.items.map((i) => {
        const active = i.href.endsWith(current) &&
          (current !== 'index.html' || i.href === 'index.html');
        return `<a class="nav-link${active ? ' is-active' : ''}" href="${link(i.href)}"${active ? ' aria-current="page"' : ''}>
          <span class="mi" aria-hidden="true">${i.icon}</span>${i.label}</a>`;
      }).join('')}`).join('') +
    `<div class="sidebar__label" style="margin-top:12px">Status</div>
     <div class="card card--glass small" style="padding:14px;margin:0 0 8px">
       <div class="row spread">
         <span class="muted" style="font-size:.8rem">Backend</span>
         <span class="badge" id="apiStatus"><span class="mi" style="font-size:13px">sync</span>Checking</span>
       </div>
       <div class="small muted mt-1" style="word-break:break-all;font-size:.72rem">${esc(API.getBase())}</div>
     </div>`;

  $('#sidebarClose')?.addEventListener('click', () => toggleSidebar(false));
  $$('#sidebar .nav-link').forEach((a) => a.addEventListener('click', () => toggleSidebar(false)));
}

function toggleSidebar(force) {
  const sb = $('#sidebar');
  if (!sb) return;
  const open = force === undefined ? !sb.classList.contains('is-open') : force;
  sb.classList.toggle('is-open', open);
  $('#scrim')?.classList.toggle('is-open', open);
  $('#menuToggle')?.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open && innerWidth <= 900 ? 'hidden' : '';
}

function buildFooter() {
  const host = $('[data-shell="footer"]');
  if (!host) return;
  host.className = 'footer';
  host.innerHTML = `
    <div class="footer__grid">
      <div>
        <div class="brand" style="margin-bottom:14px">
          <span class="brand__mark" aria-hidden="true"><span class="mi">eco</span></span>
          <span class="brand__name">Smart<span>Agri</span> Assistant</span>
        </div>
        <p class="small">AI-powered advisory for crops, soil, fertilizer, plant health and markets —
        built for farmers, agronomists and agri-businesses.</p>
      </div>
      <div><h4>Advisory</h4>
        <a href="${link('pages/crop.html')}">Crop Recommendation</a>
        <a href="${link('pages/fertilizer.html')}">Fertilizer</a>
        <a href="${link('pages/soil.html')}">Soil Health</a>
        <a href="${link('pages/disease.html')}">Disease Detection</a></div>
      <div><h4>Insights</h4>
        <a href="${link('pages/market.html')}">Market Intelligence</a>
        <a href="${link('pages/news.html')}">Agriculture News</a>
        <a href="${link('pages/history.html')}">Prediction History</a></div>
      <div><h4>Assistants</h4>
        <a href="${link('pages/chatbot.html')}">AI Chatbot</a>
        <a href="${link('pages/voice.html')}">Voice Assistant</a></div>
    </div>
    <div class="footer__bottom">
      <span>© ${new Date().getFullYear()} Smart Agriculture Assistant. All rights reserved.</span>
      <span>Powered by FastAPI · Built with HTML5, CSS3 &amp; Vanilla JS</span>
    </div>`;
}

/* ----------------------------------------------------- floating chatbot */
function buildChatWidget() {
  if (document.body.dataset.chatWidget === 'off') return;

  const fab = el('button', {
    class: 'chat-fab', id: 'chatFab',
    'aria-label': 'Open AI assistant', 'aria-expanded': 'false'
  }, '<span class="mi" aria-hidden="true">forum</span>');

  const panel = el('section', {
    class: 'chat-panel', id: 'chatPanel',
    'aria-label': 'AI assistant', role: 'dialog'
  });
  panel.innerHTML = `
    <header class="chat-panel__head">
      <span class="dot" aria-hidden="true"></span>
      <div style="flex:1">
        <strong style="font-size:.97rem">AgriBot</strong>
        <div class="small" style="opacity:.82;font-size:.78rem">Ask anything about farming</div>
      </div>
      <button class="icon-btn" id="chatClose" aria-label="Close assistant"
        style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#fff;flex-shrink:0">
        <span class="mi" aria-hidden="true">close</span></button>
    </header>
    <div class="chat-log" id="chatLog" aria-live="polite"></div>
    <form class="chat-input" id="chatForm">
      <label class="visually-hidden" for="chatText">Message</label>
      <input class="input" id="chatText" autocomplete="off"
             placeholder="Ask about crops, pests, prices…" required />
      <button class="chat-send" type="submit" aria-label="Send message">
        <span class="mi" aria-hidden="true">send</span></button>
    </form>`;
  document.body.append(fab, panel);

  const open = (state) => {
    panel.classList.toggle('is-open', state);
    fab.setAttribute('aria-expanded', String(state));
    fab.querySelector('.mi').textContent = state ? 'close' : 'forum';
    if (state) $('#chatText').focus();
  };
  fab.onclick = () => open(!panel.classList.contains('is-open'));
  $('#chatClose').onclick = () => open(false);

  const log = $('#chatLog');
  const sessionKey = 'saa.chat.session';
  let sessionId = sessionStorage.getItem(sessionKey) || null;

  const bubble = (text, who) => {
    const b = el('div', { class: `msg ${who}` }, esc(text));
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  };
  bubble('Hi! I\'m AgriBot 🌱 Ask me about crop choice, fertilizer dosage, pests or market prices.', 'bot');

  $('#chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#chatText');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    bubble(text, 'user');

    const typing = el('div', { class: 'msg bot' },
      '<span class="typing" aria-label="AgriBot is typing"><i></i><i></i><i></i></span>');
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    try {
      const payload = { question: text, message: text, query: text };
      if (sessionId) payload.session_id = sessionId;
      const res = await API.askChatbot(payload);
      typing.remove();
      const answer = typeof res === 'string' ? res
        : pick(res, ['answer', 'response', 'reply', 'message', 'result', 'text'], 'No answer returned.');
      const sid = pick(res, ['session_id', 'sessionId', 'id']);
      if (sid) { sessionId = sid; sessionStorage.setItem(sessionKey, sid); }
      bubble(typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2), 'bot');
    } catch (err) {
      typing.remove();
      bubble(`⚠️ ${err.message}`, 'bot');
      Toast.error(err.message);
    }
  });
}

/* ================================================== NEW EFFECTS v2 ================================================== */

/* ------------------------------------------------------ Hero Canvas Particles */
function initHeroParticles() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let w, h, particles;
  const PARTICLE_COUNT = 55;

  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = w = rect.width;
    canvas.height = h = rect.height;
  };

  const random = (min, max) => Math.random() * (max - min) + min;

  const createParticle = () => ({
    x: random(0, w),
    y: random(0, h),
    r: random(1, 3.5),
    vx: random(-0.35, 0.35),
    vy: random(-0.55, -0.1),
    alpha: random(0.2, 0.8),
    fade: random(0.003, 0.008),
  });

  const init = () => {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.alpha.toFixed(3)})`;
      ctx.fill();

      p.x  += p.vx;
      p.y  += p.vy;
      p.alpha -= p.fade;

      if (p.alpha <= 0 || p.y < -10 || p.x < -10 || p.x > w + 10) {
        Object.assign(p, createParticle(), { y: h + 5, alpha: 0 });
        setTimeout(() => { p.alpha = random(.2, .8); }, random(0, 800));
      }
    }
    requestAnimationFrame(draw);
  };

  init();
  draw();
  window.addEventListener('resize', () => { resize(); }, { passive: true });
}

/* ------------------------------------------------------ 3D Card Tilt */
function init3DTilt() {
  const cards = $$('.feature-card.card--hover, .stat.card--hover');
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch

  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 to 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      const rx = y * -10;   // max 10deg
      const ry = x *  10;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
      card.style.boxShadow = `var(--shadow-xl)`;
      card.style.borderColor = `color-mix(in oklab,var(--leaf) 40%,transparent)`;

      // Highlight reflection
      const shine = card.querySelector('.card-shine') || (() => {
        const s = el('div', { class: 'card-shine', 'aria-hidden': 'true' });
        s.style.cssText = 'position:absolute;inset:0;pointer-events:none;border-radius:inherit;z-index:10;transition:opacity .2s;';
        card.style.position = card.style.position || 'relative';
        card.appendChild(s);
        return s;
      })();
      const lx = (x + .5) * 100;
      const ly = (y + .5) * 100;
      shine.style.background = `radial-gradient(circle at ${lx}% ${ly}%, rgba(255,255,255,.14), transparent 60%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.borderColor = '';
      const shine = card.querySelector('.card-shine');
      if (shine) shine.style.background = 'none';
    });
  });
}

/* ------------------------------------------------------ Animated Number Counter */
function animateCounter(el, target, duration = 1400, prefix = '', suffix = '') {
  const start = performance.now();
  const isFloat = !Number.isInteger(target);
  const update = (now) => {
    const elapsed = Math.min((now - start) / duration, 1);
    // Ease out cubic
    const progress = 1 - Math.pow(1 - elapsed, 3);
    const current = target * progress;
    el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current).toLocaleString()) + suffix;
    if (elapsed < 1) requestAnimationFrame(update);
    else el.textContent = prefix + (isFloat ? target.toFixed(1) : target.toLocaleString()) + suffix;
  };
  requestAnimationFrame(update);
}

/* ------------------------------------------------------ Scroll reveal (enhanced) */
function initReveal() {
  const nodes = $$('.reveal, .stagger-children');
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('is-in'), i * 60);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10 });
  nodes.forEach((n) => io.observe(n));
}

/* ------------------------------------------------------ Ripple on buttons */
function initRipple() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const ripple = el('span');
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.cssText = `
      position:absolute; border-radius:50%; pointer-events:none;
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px;
      background:rgba(255,255,255,.22);
      transform:scale(0); animation:rippleAnim .6s var(--ease) forwards;`;
    // Ensure btn has position
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });

  // Inject keyframes once
  if (!document.getElementById('rippleStyle')) {
    const s = el('style');
    s.id = 'rippleStyle';
    s.textContent = `@keyframes rippleAnim{to{transform:scale(1);opacity:0}}`;
    document.head.appendChild(s);
  }
}

/* ------------------------------------------------------ backend health */
async function pingBackend() {
  const badge = $('#apiStatus');
  if (!badge) return;
  try {
    await fetch(API.url('/'), { method: 'GET', mode: 'cors' });
    badge.className = 'badge';
    badge.innerHTML = '<span class="mi" style="font-size:13px">check_circle</span>Online';
  } catch {
    badge.className = 'badge rose';
    badge.innerHTML = '<span class="mi" style="font-size:13px">cloud_off</span>Offline';
  }
}

/* ------------------------------------------------------ Smooth section label reveal */
function initSectionLabels() {
  $$('.sidebar__label').forEach((label, i) => {
    label.style.cssText += `opacity:0;transform:translateX(-8px);transition:opacity .4s ${i*.08}s var(--ease),transform .4s ${i*.08}s var(--ease)`;
    setTimeout(() => { label.style.opacity = '1'; label.style.transform = 'none'; }, 200 + i * 80);
  });
}

/* ------------------------------------------------------------- bootstrap */
document.addEventListener('DOMContentLoaded', () => {
  Theme.apply(Theme.get());
  buildNavbar();
  buildSidebar();
  buildFooter();

  if (!$('#scrim')) {
    const scrim = el('div', { class: 'scrim', id: 'scrim' });
    scrim.onclick = () => toggleSidebar(false);
    document.body.appendChild(scrim);
  }

  buildChatWidget();
  initReveal();
  initRipple();
  pingBackend();
  initSectionLabels();

  // Hero effects
  initHeroParticles();

  // 3D tilt after a brief delay so DOM is painted
  requestAnimationFrame(() => setTimeout(init3DTilt, 100));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleSidebar(false);
  });
});
