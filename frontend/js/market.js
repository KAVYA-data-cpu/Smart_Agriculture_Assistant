/* ==========================================================================
   market.js — Market intelligence dashboard.
   Endpoints: /market/price, /market/nearby, /market/history, /market/trend,
   /market/demand, /market/recommendation, /market/predict, /market/full-report
   ========================================================================== */
(function () {
  const charts = {};
  let lastReport = null;

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function drawChart(id, config) {
    if (typeof Chart === 'undefined') return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), config);
  }

  /** Pull {labels, values} out of loosely-shaped API series data. */
  function series(data) {
    const list = asList(data, [
      'history', 'prices', 'data', 'trend', 'records', 'results', 'forecast', 'predictions',
      'data_points', 'daily_history', 'history_used',
    ]);
    if (list.length && typeof list[0] === 'object') {
      return {
        labels: list.map((r, i) => String(pick(r, ['date', 'day', 'month', 'label', 'period', 'timestamp'], i + 1))),
        values: list.map((r) => Number(pick(r, [
          'price', 'modal_price', 'value', 'avg_price', 'predicted_price', 'amount',
          'average_modal_price', 'markets_reporting',
        ], 0))),
      };
    }
    if (list.length) return { labels: list.map((_, i) => `T${i + 1}`), values: list.map(Number) };
    if (data && typeof data === 'object') {
      const entries = Object.entries(data).filter(([, v]) => Number.isFinite(Number(v)));
      if (entries.length) return { labels: entries.map(([k]) => titleCase(k)), values: entries.map(([, v]) => Number(v)) };
    }
    return { labels: [], values: [] };
  }

  function kpi(icon, label, value, extra = '') {
    return `<div class="card card--hover reveal stat">
      <div class="stat__icon"><span class="mi">${icon}</span></div>
      <div><div class="stat__value" style="font-size:1.35rem">${esc(String(value))}</div>
        <div class="stat__label">${esc(label)}</div>${extra}</div></div>`;
  }

  function renderKpis(price, recommendation) {
    const host = $('#marketKpis');
    // /market/price returns { found, count, records: [...] } — the actual price
    // fields live on the first record, not on the top-level response object.
    const rec0 = (price && Array.isArray(price.records) && price.records.length) ? price.records[0] : price;
    const current = pick(rec0, ['price', 'modal_price', 'current_price', 'avg_price'], '—');
    const unit = pick(rec0, ['unit', 'units'], '');
    const market = pick(rec0, ['market', 'mandi', 'market_name'], '—');
    const min = pick(rec0, ['min_price', 'minimum_price']);
    const max = pick(rec0, ['max_price', 'maximum_price']);
    const advice = pick(recommendation, ['recommendation', 'advice', 'action', 'message', 'result'], '—');
    const count = pick(price, ['count']);

    host.innerHTML =
      kpi('payments', `Current price${unit ? ' (' + unit + ')' : ''}`, current) +
      kpi('storefront', 'Reference market', market) +
      kpi('swap_vert', 'Min – Max', (min || max) ? `${fmtNum(min)} – ${fmtNum(max)}` : '—') +
      kpi('recommend', 'Recommendation', typeof advice === 'string' ? advice : JSON.stringify(advice)) +
      (count ? kpi('storefront', 'Markets reporting today', count) : '');
    $$('#marketKpis .reveal').forEach((n) => n.classList.add('is-in'));

    // Backend includes this when the crop just isn't reported in this location
    // today, so show what IS available instead of leaving the user guessing.
    const nearbyCrops = recommendation && recommendation.available_crops_nearby;
    if (Array.isArray(nearbyCrops) && nearbyCrops.length) {
      host.insertAdjacentHTML('beforeend',
        `<div class="card reveal is-in" style="grid-column:1/-1">
          <p class="small muted" style="margin:0 0 6px">Crops reported near this location today:</p>
          <p class="small">${nearbyCrops.slice(0, 15).map((c) => esc(c)).join(', ')}</p>
        </div>`);
    }
  }

  function renderTrend(history, trend) {
    const s = series(history && asList(history).length ? history : trend);
    const state = $('#trendState');
    if (!s.values.length) { state.innerHTML = '<p class="small muted">No historical price data returned.</p>'; return; }
    const dir = pick(trend, ['trend', 'direction', 'movement', 'trend_direction']);
    state.innerHTML = dir
      ? `<span class="badge ${/down|fall|decreas/i.test(String(dir)) ? 'rose' : ''}">
          <span class="mi" style="font-size:15px">${/down|fall|decreas/i.test(String(dir)) ? 'trending_down' : 'trending_up'}</span>${esc(titleCase(String(dir)))}</span>`
      : '';
    drawChart('trendChart', {
      type: 'line',
      data: {
        labels: s.labels,
        datasets: [{
          label: 'Price', data: s.values, tension: .38, fill: true,
          borderColor: css('--leaf') || '#2fbf71',
          backgroundColor: 'rgba(47,191,113,.16)',
          pointRadius: 2, borderWidth: 2.5,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } },
    });
  }

  function renderDemand(demand) {
    const s = series(demand);
    const state = $('#demandState');
    // get_crop_demand_indicator reports its signal under "trend" (rising/falling/stable).
    const level = pick(demand, ['demand', 'level', 'status', 'demand_level', 'trend']);
    state.innerHTML = level ? `<span class="badge blue">${esc(titleCase(String(level)))} demand</span>` : '';
    if (!s.values.length) { if (!level) state.innerHTML = '<p class="small muted">No demand data returned.</p>'; return; }
    drawChart('demandChart', {
      type: 'bar',
      data: { labels: s.labels, datasets: [{ label: 'Demand', data: s.values, borderRadius: 8, backgroundColor: css('--leaf') || '#2fbf71' }] },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }

  function renderForecast(forecast) {
    const s = series(forecast);
    const panel = $('#forecastPanel');
    const predicted = pick(forecast, ['predicted_next_day_price', 'predicted_price', 'prediction']);
    const direction = pick(forecast, ['trend_direction']);
    const summary = predicted
      ? `Predicted next-day price: ₹${esc(fmtNum(predicted))}${direction ? ` (trend: ${esc(titleCase(String(direction)))})` : ''}`
      : pick(forecast, ['message', 'summary', 'note']);
    panel.innerHTML = summary
      ? `<p class="small">${esc(typeof summary === 'object' ? JSON.stringify(summary) : String(summary))}</p>`
      : (s.values.length ? '' : '<p class="small muted">No forecast returned.</p>');
    if (!s.values.length) return;
    drawChart('forecastChart', {
      type: 'line',
      data: {
        labels: s.labels,
        datasets: [{
          label: 'Predicted price', data: s.values, tension: .35, borderDash: [6, 5],
          borderColor: '#f5a524', backgroundColor: 'rgba(245,165,36,.14)', fill: true, borderWidth: 2.5, pointRadius: 3,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }

  function renderNearby(nearby) {
    // get_nearby_market_prices returns its list under "all_markets".
    const list = asList(nearby, ['markets', 'data', 'results', 'nearby', 'all_markets']);
    const panel = $('#nearbyPanel');
    if (!list.length) return UI.empty(panel, 'No nearby markets returned.', 'storefront');
    panel.innerHTML = `<ul class="list-clean">${list.slice(0, 8).map((m) => {
      const name = pick(m, ['market', 'name', 'market_name', 'mandi'], 'Market');
      const dist = pick(m, ['distance', 'distance_km', 'km']);
      const price = pick(m, ['price', 'modal_price', 'avg_price']);
      return `<li><span class="mi">storefront</span>
        <span style="flex:1"><strong>${esc(String(name))}</strong>
        ${dist ? `<span class="small muted"> · ${esc(String(dist))} km</span>` : ''}</span>
        ${price ? `<span class="badge">₹${esc(fmtNum(price))}</span>` : ''}</li>`;
    }).join('')}</ul>`;
  }

  function renderReport(report) {
    const panel = $('#reportPanel');
    if (!report) return UI.empty(panel, 'No consolidated report returned.', 'summarize');

    // get_full_market_report nests every section as an object, so surface the
    // most useful fields from each section explicitly instead of only showing
    // top-level primitives (which is just "crop" and "city").
    const bits = [];
    const rec = report.buy_sell_recommendation;
    if (rec && rec.recommendation) {
      bits.push(`<dt>Recommendation</dt><dd>${esc(titleCase(String(rec.recommendation)))} — ${esc(rec.reason || '')}</dd>`);
    }
    const pred = report.price_prediction;
    if (pred && pred.found) {
      bits.push(`<dt>Predicted next-day price</dt><dd>₹${esc(fmtNum(pred.predicted_next_day_price))} (${esc(titleCase(String(pred.trend_direction || '')))})</dd>`);
    }
    const demand = report.demand_indicator;
    if (demand && demand.trend) {
      bits.push(`<dt>Demand trend</dt><dd>${esc(titleCase(String(demand.trend)))} (${esc(String(demand.markets_reporting_today))} markets today)</dd>`);
    }
    const dash = report.market_dashboard;
    if (dash && dash.total_records_today != null) {
      bits.push(`<dt>Markets reporting today</dt><dd>${esc(String(dash.total_records_today))} records across ${esc(String(dash.states_reporting))} states</dd>`);
    }

    const rows = Object.entries(report).filter(([, v]) => v !== null && typeof v !== 'object');
    const text = pick(report, ['report', 'summary', 'analysis', 'message']);

    panel.innerHTML =
      (typeof text === 'string' ? `<p>${esc(text)}</p>` : '') +
      (rows.length ? `<dl class="kv mt-1">${rows.map(([k, v]) => `<dt>${esc(titleCase(k))}</dt><dd>${esc(String(v))}</dd>`).join('')}</dl>` : '') +
      (bits.length ? `<dl class="kv mt-1">${bits.join('')}</dl>` : '');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('#marketForm');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
     const { valid, values } = Validate.form(form, {
  commodity: { required: true, label: 'Commodity' },
  district: { required: true, label: 'District' },
});
if (!valid) return;

      // Backend's MarketRequest schema expects "crop_name" and "city" —
      // the other fields are kept only for any legacy/local use, not sent as canon.
      const params = {
        crop_name: values.commodity,
        commodity: values.commodity,
        crop: values.commodity,
        state: values.state,
        district: values.district,
        city: values.district || values.state,
      };
      const restore = UI.busy($('#marketSubmit'), 'Analysing…');
      UI.loading($('#marketKpis'), 'Fetching live market intelligence…');

      const [price, nearby, history, trend, demand, recommendation, forecast, report] = await Promise.allSettled([
        API.marketPrice(params), API.nearbyMarkets(params), API.marketHistory(params), API.marketTrend(params),
        API.marketDemand(params), API.marketRecommendation(params), API.marketPredict(params), API.marketFullReport(params),
      ]);
      const val = (r) => (r.status === 'fulfilled' ? r.value : null);

      restore();

      if ([price, nearby, history, trend, demand, recommendation, forecast, report].every((r) => r.status === 'rejected')) {
        UI.error($('#marketKpis'), price.reason?.message || 'Market data is unavailable.', () => form.requestSubmit());
        Toast.error(price.reason?.message || 'Market data is unavailable.');
        return;
      }

      renderKpis(val(price), val(recommendation));
      renderTrend(val(history), val(trend));
      renderDemand(val(demand));
      renderForecast(val(forecast));
      renderNearby(val(nearby));
      renderReport(val(report));

      lastReport = {
        query: params, price: val(price), trend: val(trend), demand: val(demand),
        recommendation: val(recommendation), forecast: val(forecast),
        nearby: val(nearby), history: val(history), report: val(report),
      };
      Toast.success('Market dashboard updated.');
    });

    $('#reportPrint').onclick = () => window.print();
    $('#reportExport').onclick = () => {
      if (!lastReport) { Toast.warn('Run an analysis before exporting.'); return; }
      downloadBlob(new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' }),
        `market-report-${(lastReport.query.commodity || 'crop').toLowerCase()}.json`);
      Toast.success('Report exported.');
    };
  });
})();