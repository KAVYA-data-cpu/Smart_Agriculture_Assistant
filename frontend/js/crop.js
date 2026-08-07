/* ==========================================================================
   crop.js — Crop recommendation (POST /predict)
   ========================================================================== */
(function () {
  const RULES = {
    N: { required: true, type: 'number', min: 0, max: 300, label: 'Nitrogen' },
    P: { required: true, type: 'number', min: 0, max: 300, label: 'Phosphorus' },
    K: { required: true, type: 'number', min: 0, max: 300, label: 'Potassium' },
    temperature: { required: true, type: 'number', min: -10, max: 60, label: 'Temperature' },
    humidity: { required: true, type: 'number', min: 0, max: 100, label: 'Humidity' },
    ph: { required: true, type: 'number', min: 0, max: 14, label: 'Soil pH' },
    rainfall: { required: true, type: 'number', min: 0, max: 2000, label: 'Rainfall' },
    city: { required: true, label: 'City' },
  };

  function weatherBlock(weather) {
    if (!weather || typeof weather !== 'object') return '';
    const rows = Object.entries(weather)
      .filter(([, v]) => v !== null && typeof v !== 'object')
      .map(([k, v]) => `<dt>${esc(titleCase(k))}</dt><dd>${esc(String(v))}</dd>`).join('');
    if (!rows) return '';
    return `<div class="card card--glass mt-1">
      <h3 class="card__title"><span class="mi">partly_cloudy_day</span>Weather at location</h3>
      <dl class="kv">${rows}</dl></div>`;
  }

  function render(data) {
    const panel = $('#cropResult');
    const crop = pick(data, ['crop', 'recommended_crop', 'prediction', 'result', 'label'], 'Unknown');
    let confidence = pick(data, ['confidence', 'probability', 'accuracy', 'score']);
    if (confidence !== undefined) {
      confidence = Number(confidence);
      if (confidence <= 1) confidence *= 100;
    }
    const weather = pick(data, ['weather', 'weather_data', 'weather_info']);
    const message = pick(data, ['message', 'advice', 'description', 'note']);

    panel.innerHTML = `
      <div class="result-hero">
        <span class="mi" aria-hidden="true">eco</span>
        <div>
          <div class="small" style="opacity:.85;text-transform:uppercase;letter-spacing:.1em">Recommended crop</div>
          <div class="big">${esc(typeof crop === 'object' ? JSON.stringify(crop) : crop)}</div>
        </div>
      </div>
      ${Number.isFinite(confidence) ? `
        <div class="mt-2">
          <div class="row spread"><span class="small muted">Model confidence</span>
            <strong>${fmtNum(confidence, 1)}%</strong></div>
          <div class="meter mt-1"><i id="confBar"></i></div>
        </div>` : ''}
      ${message ? `<p class="mt-2 small">${esc(String(message))}</p>` : ''}
      ${weatherBlock(weather)}
      <div class="row wrap actions mt-2 no-print">
        <a class="btn btn--ghost btn--sm" href="history.html"><span class="mi">history</span>View history</a>
        <a class="btn btn--ghost btn--sm" href="fertilizer.html"><span class="mi">science</span>Fertilizer advice</a>
        <button class="btn btn--ghost btn--sm" onclick="window.print()"><span class="mi">print</span>Print</button>
      </div>`;

    if (Number.isFinite(confidence)) {
      requestAnimationFrame(() => { const bar = $('#confBar'); if (bar) bar.style.width = `${Math.min(100, confidence)}%`; });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('#cropForm');
    const panel = $('#cropResult');

    $('#cropSample').onclick = () => {
      const sample = { N: 90, P: 42, K: 43, temperature: 24.5, humidity: 82, ph: 6.5, rainfall: 202, city: 'Pune' };
      Object.entries(sample).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
      Toast.info('Sample values filled in.');
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { valid, values } = Validate.form(form, RULES);
      if (!valid) return;

      const restore = UI.busy($('#cropSubmit'), 'Analysing…');
      UI.loading(panel, 'Running the recommendation model…');
      try {
        const data = await API.predictCrop(values);
        render(data);
        Toast.success('Crop recommendation ready.');
      } catch (err) {
        UI.error(panel, err.message, () => form.requestSubmit());
        Toast.error(err.message);
      } finally {
        restore();
      }
    });
  });
})();
