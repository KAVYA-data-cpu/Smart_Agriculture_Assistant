/* ==========================================================================
   fertilizer.js — POST /fertilizer/predict  +  GET /fertilizer/history
   ========================================================================== */
(function () {
  const RULES = {
    nitrogen: { required: true, type: 'number', min: 0, max: 300, label: 'Nitrogen' },
    phosphorous: { required: true, type: 'number', min: 0, max: 300, label: 'Phosphorous' },
    potassium: { required: true, type: 'number', min: 0, max: 300, label: 'Potassium' },
    moisture: { required: true, type: 'number', min: 0, max: 100, label: 'Moisture' },
    city: { required: true, label: 'City' },
    soil_type: { required: true, label: 'Soil type' },
    crop_type: { required: true, label: 'Crop type' },
  };

  function render(data) {
    const panel = $('#fertResult');
    const name = pick(data, ['fertilizer', 'recommended_fertilizer', 'prediction', 'result', 'label'], 'Unknown');
    const dosage = pick(data, ['dosage', 'quantity', 'application_rate', 'rate']);
    const advice = pick(data, ['advice', 'description', 'note', 'recommendation']);
    const tips = pick(data, ['tips', 'instructions', 'steps']);
    const temperature = pick(data, ['temperature']);
    const humidity = pick(data, ['humidity']);

    panel.innerHTML = `
      <div class="result-hero">
        <span class="mi" aria-hidden="true">science</span>
        <div>
          <div class="small" style="opacity:.85;text-transform:uppercase;letter-spacing:.1em">Recommended fertilizer</div>
          <div class="big">${esc(typeof name === 'object' ? JSON.stringify(name) : name)}</div>
        </div>
      </div>
      ${(temperature !== undefined || humidity !== undefined) ? `
        <dl class="kv mt-2">
          ${temperature !== undefined ? `<dt>Temperature</dt><dd>${esc(String(temperature))}°C</dd>` : ''}
          ${humidity !== undefined ? `<dt>Humidity</dt><dd>${esc(String(humidity))}%</dd>` : ''}
        </dl>` : ''}
      ${dosage ? `<dl class="kv mt-2"><dt>Suggested dosage</dt><dd>${esc(String(dosage))}</dd></dl>` : ''}
      ${advice ? `<p class="mt-2 small">${esc(String(advice))}</p>` : ''}
      ${Array.isArray(tips) && tips.length ? `
        <h3 class="mt-2">Application tips</h3>
        <ul class="list-clean">${tips.map((t) => `<li><span class="mi">check_circle</span><span>${esc(String(t))}</span></li>`).join('')}</ul>` : ''}
      <div class="row wrap actions mt-2 no-print">
        <button class="btn btn--ghost btn--sm" onclick="window.print()"><span class="mi">print</span>Print plan</button>
      </div>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('#fertForm');
    const panel = $('#fertResult');
    const table = createDataTable({
      mount: $('#fertHistory'), pager: $('#fertPager'),
      emptyText: 'No fertilizer recommendations saved yet.',
    });

    async function loadHistory() {
      UI.loading($('#fertHistory'), 'Loading fertilizer history…');
      try {
        const data = await API.fertilizerHistory();
        table.setRows(asList(data, ['history', 'data', 'records', 'results']));
      } catch (err) {
        UI.error($('#fertHistory'), err.message, loadHistory);
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { valid, values } = Validate.form(form, RULES);
      if (!valid) return;

      const restore = UI.busy($('#fertSubmit'), 'Calculating…');
      UI.loading(panel, 'Building your fertilizer plan…');
      try {
        render(await API.predictFertilizer(values));
        Toast.success('Fertilizer recommendation ready.');
        loadHistory();
      } catch (err) {
        UI.error(panel, err.message, () => form.requestSubmit());
        Toast.error(err.message);
      } finally {
        restore();
      }
    });

    let debounce;
    $('#fertSearch').addEventListener('input', (e) => {
      clearTimeout(debounce);
      const v = e.target.value;
      debounce = setTimeout(() => table.search(v), 220);
    });
    $('#fertExport').onclick = () => exportCSV(table.rows(), 'fertilizer-history.csv');

    loadHistory();
  });
})();
