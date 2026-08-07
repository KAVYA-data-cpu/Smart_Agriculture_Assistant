/* ==========================================================================
   script.js — Shared UI kernel
   Builds navbar / sidebar / footer / chatbot widget, handles theme, toasts,
   validation and small DOM helpers used by every page module.
   ========================================================================== */

/* ---------------------------------------------------------------- helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs = {}, html = '') => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => (k === 'class' ? (node.className = v) : node.setAttribute(k, v)));
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
/** Read the first present key from an object (backends vary in naming). */
const pick = (obj, keys, fallback = undefined) => {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  return fallback;
};
/** Find the first array inside an API response envelope. */
const asList = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of keys) if (Array.isArray(data[k])) return data[k];
  for (const v of Object.values(data)) if (Array.isArray(v)) return v;
  return [];
};

/* ------------------------------------------------------------ navigation */
const NAV = [
  { group: 'Overview', items: [{ href: 'index.html', icon: 'dashboard', label: 'Home Dashboard' }] },
  {
    group: 'Advisory',
    items: [
      { href: 'pages/crop.html', icon: 'psychiatry', label: 'Crop Recommendation' },
      { href: 'pages/fertilizer.html', icon: 'science', label: 'Fertilizer' },
      { href: 'pages/soil.html', icon: 'terrain', label: 'Soil Health' },
      { href: 'pages/disease.html', icon: 'coronavirus', label: 'Disease Detection' },
    ],
  },
  {
    group: 'Insights',
    items: [
      { href: 'pages/market.html', icon: 'insights', label: 'Market Intelligence' },
      { href: 'pages/news.html', icon: 'newspaper', label: 'Agriculture News' },
      { href: 'pages/history.html', icon: 'history', label: 'Prediction History' },
    ],
  },
  {
    group: 'Assistants',
    items: [
      { href: 'pages/chatbot.html', icon: 'forum', label: 'AI Chatbot' },
      { href: 'pages/voice.html', icon: 'graphic_eq', label: 'Voice Assistant' },
    ],
  },
];

/** Root-relative prefix so the same markup works from / and /pages/. */
const ROOT = document.body?.dataset.root || (location.pathname.includes('/pages/') ? '../' : './');
const link = (href) => ROOT + href;

/* ----------------------------------------------------------------- theme */
const Theme = {
  key: 'saa.theme',
  get() { return localStorage.getItem(this.key) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); },
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
// Apply as early as possible to avoid a flash of the wrong theme.
document.documentElement.dataset.theme = localStorage.getItem('saa.theme')
  || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

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
    const node = el('div', { class: `toast ${type}` },
      `<span class="mi" aria-hidden="true">${icons[type] || 'info'}</span>
       <div class="toast__body">${title ? `<strong>${esc(title)}</strong>` : ''}${esc(message)}</div>
       <button class="icon-btn" style="width:28px;height:28px;border:0;background:transparent" aria-label="Dismiss">
         <span class="mi" style="font-size:18px">close</span></button>`);
    const close = () => { node.classList.add('is-out'); setTimeout(() => node.remove(), 300); };
    node.querySelector('button').onclick = close;
    this.ensure().appendChild(node);
    if (timeout) setTimeout(close, timeout);
    return node;
  },
  success: (m, t) => Toast.show(m, { type: 'success', title: t || 'Success' }),
  error: (m, t) => Toast.show(m, { type: 'error', title: t || 'Something went wrong', timeout: 6000 }),
  info: (m, t) => Toast.show(m, { type: 'info', title: t }),
  warn: (m, t) => Toast.show(m, { type: 'warn', title: t || 'Heads up' }),
};

/* ------------------------------------------------------------- UI states */
const UI = {
  /** Replace a container's content with a loading animation. */
  loading(node, text = 'Loading…') {
    if (!node) return;
    node.innerHTML = `<div class="loader"><div class="spinner" aria-hidden="true"></div>
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
      const b = el('button', { class: 'btn btn--ghost btn--sm mt-1' }, '<span class="mi">refresh</span>Try again');
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
  /** Put a button into a spinner/disabled state; returns a restore function. */
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
  /**
   * rules: { fieldName: { required, min, max, type: 'number'|'text', label } }
   * Returns { valid, values }
   */
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
    <button class="icon-btn hamburger" id="menuToggle" aria-label="Open navigation menu" aria-expanded="false">
      <span class="mi" aria-hidden="true">menu</span>
    </button>
    <a class="brand" href="${link('index.html')}" aria-label="Smart Agriculture Assistant home">
      <span class="brand__mark"><span class="mi" aria-hidden="true">eco</span></span>
      <span class="brand__name">Smart<span>Agri</span> Assistant</span>
    </a>
    <div class="navbar__spacer"></div>
    <div class="navbar__actions">
      <button class="icon-btn" id="apiSettings" aria-label="Configure backend URL" title="Backend URL">
        <span class="mi" aria-hidden="true">settings_ethernet</span>
      </button>
      <button class="icon-btn" id="themeToggle" aria-label="Toggle dark mode" title="Toggle dark mode">
        <span class="mi" aria-hidden="true">dark_mode</span>
      </button>
      <a class="btn btn--primary btn--sm" href="${link('pages/crop.html')}">
        <span class="mi" aria-hidden="true">bolt</span><span class="label-text">New prediction</span>
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
       style="margin-left:auto"><span class="mi" aria-hidden="true">close</span></button>` +
    NAV.map((g) => `
      <div class="sidebar__label">${g.group}</div>
      ${g.items.map((i) => {
        const active = i.href.endsWith(current) && (current !== 'index.html' || i.href === 'index.html');
        return `<a class="nav-link${active ? ' is-active' : ''}" href="${link(i.href)}"${active ? ' aria-current="page"' : ''}>
          <span class="mi" aria-hidden="true">${i.icon}</span>${i.label}</a>`;
      }).join('')}`).join('') +
    `<div class="sidebar__label">Status</div>
     <div class="card card--glass small" style="padding:14px">
       <div class="row spread"><span class="muted">Backend</span>
         <span class="badge" id="apiStatus"><span class="mi" style="font-size:14px">sync</span>Checking</span></div>
       <div class="small muted mt-1" style="word-break:break-all">${esc(API.getBase())}</div>
     </div>`;

  const closeBtn = $('#sidebarClose');
  if (closeBtn) closeBtn.onclick = () => toggleSidebar(false);
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
        <div class="brand" style="margin-bottom:10px">
          <span class="brand__mark"><span class="mi" aria-hidden="true">eco</span></span>
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
      <span>Powered by a FastAPI backend · Built with HTML5, CSS3 &amp; Vanilla JS</span>
    </div>`;
}

/* ----------------------------------------------------- floating chatbot */
function buildChatWidget() {
  if (document.body.dataset.chatWidget === 'off') return;

  const fab = el('button', { class: 'chat-fab', id: 'chatFab', 'aria-label': 'Open AI assistant', 'aria-expanded': 'false' },
    '<span class="mi" aria-hidden="true">forum</span>');
  const panel = el('section', { class: 'chat-panel', id: 'chatPanel', 'aria-label': 'AI assistant', role: 'dialog' });
  panel.innerHTML = `
    <header class="chat-panel__head">
      <span class="dot" aria-hidden="true"></span>
      <div style="flex:1"><strong>AgriBot</strong><div class="small" style="opacity:.85">Ask anything about farming</div></div>
      <button class="icon-btn" id="chatClose" aria-label="Close assistant"
        style="background:transparent;border-color:rgba(255,255,255,.35);color:#fff">
        <span class="mi" aria-hidden="true">close</span></button>
    </header>
    <div class="chat-log" id="chatLog" aria-live="polite"></div>
    <form class="chat-input" id="chatForm">
      <label class="visually-hidden" for="chatText">Message</label>
      <input class="input" id="chatText" autocomplete="off" placeholder="Ask about crops, pests, prices…" required />
      <button class="chat-send" type="submit" aria-label="Send message"><span class="mi" aria-hidden="true">send</span></button>
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
  bubble('Hi! I am AgriBot 🌱 Ask me about crop choice, fertilizer dosage, pests or market prices.', 'bot');

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

/* ------------------------------------------------------ scroll reveal fx */
function initReveal() {
  const nodes = $$('.reveal');
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window)) { nodes.forEach((n) => n.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('is-in'), i * 55);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  nodes.forEach((n) => io.observe(n));
}

/* ------------------------------------------------------- backend health */
async function pingBackend() {
  const badge = $('#apiStatus');
  if (!badge) return;
  try {
    await fetch(API.url('/'), { method: 'GET', mode: 'cors' });
    badge.className = 'badge';
    badge.innerHTML = '<span class="mi" style="font-size:14px">check_circle</span>Online';
  } catch {
    badge.className = 'badge rose';
    badge.innerHTML = '<span class="mi" style="font-size:14px">cloud_off</span>Offline';
  }
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
  pingBackend();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleSidebar(false); });
});
