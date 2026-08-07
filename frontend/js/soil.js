/* ==========================================================================
   soil.js — Soil health report upload (POST /soil/upload)
   ========================================================================== */
(function () {
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  let file = null;

  const NUTRIENT_ICONS = {
    nitrogen: 'grass', phosphorus: 'science', phosphorous: 'science', potassium: 'bolt',
    ph: 'water_ph', ec: 'flash_on', organic_carbon: 'compost', sulphur: 'blur_on',
    zinc: 'circle', iron: 'hardware', moisture: 'humidity_percentage',
  };

  /** Flatten the API payload into displayable {label, value} cards. */
  function flatten(obj, prefix = '', out = []) {
    Object.entries(obj || {}).forEach(([k, v]) => {
      const label = titleCase(k);
      if (v === null || v === undefined || v === '') return;
      if (Array.isArray(v)) {
        out.push({ label: prefix + label, value: v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(', ') });
      } else if (typeof v === 'object') {
        flatten(v, '', out);
      } else {
        out.push({ label: prefix + label, value: v, key: k.toLowerCase() });
      }
    });
    return out;
  }

  function render(data) {
    const panel = $('#soilResult');
    const items = flatten(data);
    if (!items.length) return UI.empty(panel, 'The report was processed but returned no readable values.', 'description');

    const longText = items.filter((i) => String(i.value).length > 90);
    const shortVals = items.filter((i) => String(i.value).length <= 90);

    panel.innerHTML = `
      <div class="result-hero">
        <span class="mi" aria-hidden="true">terrain</span>
        <div><div class="small" style="opacity:.85;text-transform:uppercase;letter-spacing:.1em">Soil report</div>
          <div class="big">Analysis complete</div></div>
      </div>
      <div class="grid auto mt-2">
        ${shortVals.map((i) => `
          <div class="card card--hover">
            <div class="row" style="gap:10px">
              <span class="stat__icon"><span class="mi">${NUTRIENT_ICONS[i.key] || 'lab_research'}</span></span>
              <div><div class="stat__label">${esc(i.label)}</div>
                <div class="stat__value" style="font-size:1.25rem">${esc(String(i.value))}</div></div>
            </div>
          </div>`).join('')}
      </div>
      ${longText.length ? `
        <div class="card mt-2">
          <h3 class="card__title"><span class="mi">notes</span>Report details</h3>
          <ul class="list-clean">${longText.map((i) => `
            <li><span class="mi">chevron_right</span><span><strong>${esc(i.label)}:</strong> ${esc(String(i.value))}</span></li>`).join('')}
          </ul>
        </div>` : ''}
      <div class="row wrap actions mt-2 no-print">
        <button class="btn btn--ghost btn--sm" onclick="window.print()"><span class="mi">print</span>Print report</button>
        <a class="btn btn--ghost btn--sm" href="fertilizer.html"><span class="mi">science</span>Plan fertilizer</a>
      </div>`;
  }

  const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const ALLOWED_EXT = /\.(pdf|png|jpe?g)$/i;

  function setFile(f) {
    const err = $('#soilError');
    err.textContent = '';
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type) && !ALLOWED_EXT.test(f.name)) {
      err.textContent = 'Only PDF, JPG or PNG files are supported.';
      Toast.warn('Please choose a PDF, JPG or PNG file.');
      return;
    }
    if (f.size > MAX_BYTES) {
      err.textContent = 'File is larger than 10 MB.';
      Toast.warn('That file is too large (max 10 MB).');
      return;
    }
    file = f;
    const icon = /\.pdf$/i.test(f.name) || f.type === 'application/pdf' ? '📄' : '🖼️';
    $('#soilFileName').textContent = `${icon} ${f.name} · ${(f.size / 1024).toFixed(0)} KB`;
    $('#soilSubmit').disabled = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const drop = $('#soilDrop');
    const input = $('#soilFile');

    drop.onclick = () => input.click();
    drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    input.onchange = (e) => setFile(e.target.files[0]);

    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => {
      e.preventDefault(); drop.classList.add('is-drag');
    }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => {
      e.preventDefault(); drop.classList.remove('is-drag');
    }));
    drop.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0]));

    $('#soilClear').onclick = () => {
      file = null; input.value = '';
      $('#soilFileName').textContent = '';
      $('#soilSubmit').disabled = true;
      $('#soilResult').innerHTML = '';
    };

    $('#soilForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!file) { Toast.warn('Choose a report file first.'); return; }
      const restore = UI.busy($('#soilSubmit'), 'Extracting…');
      UI.loading($('#soilResult'), 'Reading and analysing your soil report…');
      try {
        render(await API.uploadSoilReport(file));
        Toast.success('Soil report analysed successfully.');
      } catch (err) {
        UI.error($('#soilResult'), err.message);
        Toast.error(err.message);
      } finally { restore(); }
    });
  });
})();
