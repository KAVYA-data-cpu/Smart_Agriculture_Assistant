/* ==========================================================================
   news.js — Agriculture news (GET /news/dashboard) with category filters + search
   ========================================================================== */
(function () {
  // Label shown in the UI -> key used in the backend's dashboard response
  const CATEGORY_MAP = {
    All: 'latest',
    MSP: 'msp',
    Schemes: 'schemes',
    Market: 'market',
    Export: 'export',
  };
  const CATEGORIES = Object.keys(CATEGORY_MAP);

  let dashboard = null; // full { latest, msp, schemes, market, export } payload
  let category = 'All';
  let query = '';

  const card = (n) => {
    const title = pick(n, ['title', 'headline', 'name'], 'Untitled');
    const desc = pick(n, ['description', 'summary', 'content', 'text'], '');
    const img = pick(n, ['image', 'image_url', 'urlToImage', 'thumbnail', 'imageUrl']);
    const url = pick(n, ['url', 'link', 'source_url']);
    const src = pick(n, ['source', 'publisher', 'author']);
    const date = pick(n, ['published_at', 'publishedAt', 'date', 'created_at']);
    const cat = pick(n, ['category', 'topic', 'section']);
    return `<article class="card card--hover reveal is-in" style="padding:0;overflow:hidden;display:flex;flex-direction:column">
      ${img ? `<img src="${esc(String(img))}" alt="" loading="lazy" style="width:100%;height:160px;object-fit:cover">` : ''}
      <div style="padding:18px;display:flex;flex-direction:column;flex:1;gap:8px">
        ${cat ? `<span class="chip small">${esc(titleCase(String(cat)))}</span>` : ''}
        <h3>${esc(String(title))}</h3>
        <p class="small" style="margin:0">${esc(String(desc).slice(0, 180))}${String(desc).length > 180 ? '…' : ''}</p>
        <div class="row spread small muted mt-1" style="margin-top:auto">
          <span>${esc(String(src || 'Agri Desk'))}</span><span>${date ? esc(fmtDate(date)) : ''}</span>
        </div>
        ${url ? `<a href="${esc(String(url))}" target="_blank" rel="noopener" class="row small"><span class="material-symbols-rounded" style="font-size:16px">open_in_new</span>Read more</a>` : ''}
      </div>
    </article>`;
  };

  function currentArticles() {
    if (!dashboard) return [];
    const key = CATEGORY_MAP[category] || 'latest';
    const section = dashboard[key];
    return (section && section.articles) || [];
  }

  function render() {
    const grid = $('#newsGrid');
    let rows = currentArticles();
    if (query) rows = rows.filter((n) => JSON.stringify(n).toLowerCase().includes(query.toLowerCase()));
    if (!rows.length) return UI.empty(grid, 'No articles match your filters.', 'search_off');
    UI.ready(grid);
    grid.innerHTML = rows.map(card).join('');
  }

  async function load() {
    const grid = $('#newsGrid');
    UI.loading(grid, 'Fetching the latest agriculture headlines…');
    try {
      dashboard = await API.newsDashboard();
      render();
    } catch (err) {
      UI.error(grid, err.message, load);
      Toast.error(err.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#newsChips').innerHTML = CATEGORIES.map((c) =>
      `<button class="chip${c === 'All' ? ' is-active' : ''}" data-cat="${c}" role="tab"
        aria-selected="${c === 'All'}">${c}</button>`).join('');

    $$('#newsChips .chip').forEach((chip) => {
      chip.onclick = () => {
        $$('#newsChips .chip').forEach((c) => { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
        chip.classList.add('is-active'); chip.setAttribute('aria-selected', 'true');
        category = chip.dataset.cat;
        render(); // no network call — data's already local
      };
    });

    let debounce;
    $('#newsSearch').addEventListener('input', (e) => {
      clearTimeout(debounce);
      query = e.target.value;
      debounce = setTimeout(render, 220);
    });
    $('#newsRefresh').onclick = load; // manual refresh re-fetches the dashboard

    load();
  });
})();