/* ==========================================================================
   table.js — Reusable data table with search, sorting, pagination, CSV export.
   Used by history.html and fertilizer.html.
   ========================================================================== */
function createDataTable({ mount, pager, pageSize = 10, emptyText = 'No records found.' }) {
  const state = { rows: [], filtered: [], query: '', sortKey: null, sortDir: 1, page: 1, columns: [] };

  /** Derive readable columns from the first rows (backend field names may vary). */
  function deriveColumns(rows) {
    const keys = [];
    rows.slice(0, 12).forEach((r) => Object.keys(r || {}).forEach((k) => {
      if (!keys.includes(k) && typeof r[k] !== 'object') keys.push(k);
    }));
    return keys.slice(0, 10);
  }

  function applyFilter() {
    const q = state.query.trim().toLowerCase();
    state.filtered = !q ? state.rows.slice()
      : state.rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));

    if (state.sortKey) {
      const k = state.sortKey;
      state.filtered.sort((a, b) => {
        const av = a[k], bv = b[k];
        const an = Number(av), bn = Number(bv);
        const cmp = Number.isFinite(an) && Number.isFinite(bn)
          ? an - bn
          : String(av ?? '').localeCompare(String(bv ?? ''));
        return cmp * state.sortDir;
      });
    }
    state.page = Math.min(state.page, Math.max(1, Math.ceil(state.filtered.length / pageSize)));
  }

  function cell(value, key) {
    if (value === null || value === undefined || value === '') return '<span class="muted">—</span>';
    if (/date|time|created|updated/i.test(key)) return esc(fmtDate(value));
    if (/crop|fertilizer|prediction|label|result/i.test(key)) {
      return `<span class="badge">${esc(titleCase(String(value)))}</span>`;
    }
    return esc(String(value));
  }

  function render() {
    if (!state.rows.length) return UI.empty(mount, emptyText, 'inbox');
    applyFilter();
    if (!state.filtered.length) return UI.empty(mount, 'No rows match your search.', 'search_off');

    UI.ready(mount);
    const start = (state.page - 1) * pageSize;
    const pageRows = state.filtered.slice(start, start + pageSize);

    mount.innerHTML = `
      <div class="row spread wrap" style="margin-bottom:12px">
        <span class="small muted">Showing ${start + 1}–${start + pageRows.length} of ${state.filtered.length} records</span>
      </div>
      <div class="table-wrap"><table class="data">
        <thead><tr>${state.columns.map((c) => `
          <th data-sort="${esc(c)}" title="Sort by ${esc(titleCase(c))}" tabindex="0" role="button">
            ${esc(titleCase(c))}${state.sortKey === c ? (state.sortDir === 1 ? ' ▲' : ' ▼') : ''}
          </th>`).join('')}</tr></thead>
        <tbody>${pageRows.map((r) => `<tr>${state.columns.map((c) => `<td>${cell(r[c], c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;

    mount.querySelectorAll('th[data-sort]').forEach((th) => {
      const sort = () => {
        const key = th.dataset.sort;
        state.sortDir = state.sortKey === key ? -state.sortDir : 1;
        state.sortKey = key;
        render();
      };
      th.addEventListener('click', sort);
      th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); } });
    });

    renderPager();
  }

  function renderPager() {
    if (!pager) return;
    const total = Math.max(1, Math.ceil(state.filtered.length / pageSize));
    if (total <= 1) { pager.innerHTML = ''; return; }
    const btn = (label, page, opts = {}) =>
      `<button class="page-btn${opts.active ? ' is-active' : ''}" data-page="${page}"
        ${opts.disabled ? 'disabled' : ''} aria-label="${opts.label || 'Page ' + page}">${label}</button>`;

    const pages = [];
    for (let p = 1; p <= total; p++) {
      if (p === 1 || p === total || Math.abs(p - state.page) <= 1) pages.push(p);
      else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    pager.innerHTML =
      btn('‹', state.page - 1, { disabled: state.page === 1, label: 'Previous page' }) +
      pages.map((p) => (p === '…' ? '<span class="muted">…</span>' : btn(p, p, { active: p === state.page }))).join('') +
      btn('›', state.page + 1, { disabled: state.page === total, label: 'Next page' });

    pager.querySelectorAll('button[data-page]').forEach((b) => {
      b.onclick = () => { state.page = Number(b.dataset.page); render(); window.scrollTo({ top: mount.offsetTop - 90, behavior: 'smooth' }); };
    });
  }

  return {
    setRows(rows) {
      state.rows = Array.isArray(rows) ? rows : [];
      state.columns = deriveColumns(state.rows);
      state.page = 1;
      render();
    },
    search(q) { state.query = q; state.page = 1; render(); },
    rows: () => state.filtered.length ? state.filtered : state.rows,
    render,
  };
}
