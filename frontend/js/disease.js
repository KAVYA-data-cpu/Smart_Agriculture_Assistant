/* ==========================================================================
   disease.js — Plant disease detection (POST /disease/detect)
   ========================================================================== */
(function () {
  const MAX_BYTES = 8 * 1024 * 1024;
  let file = null;
  let previewURL = null;

  /** Normalise a value that may be a string, array or object into <li> items. */
  function toItems(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)));
    if (typeof value === 'object') return Object.entries(value).map(([k, v]) => `${titleCase(k)}: ${v}`);
    return String(value).split(/\n|(?:^|\s)[•\-\u2022]\s+/).map((s) => s.trim()).filter(Boolean);
  }

  function block(title, icon, value, tone = '') {
    const items = toItems(value);
    if (!items.length) return '';
    return `<div class="card card--hover">
      <h3 class="card__title"><span class="mi ${tone}">${icon}</span>${esc(title)}</h3>
      <ul class="list-clean">${items.map((i) => `<li><span class="mi">check_circle</span><span>${esc(i)}</span></li>`).join('')}</ul>
    </div>`;
  }

  function render(data) {
    const panel = $('#diseaseResult');
    const name = pick(data, ['disease', 'disease_name', 'prediction', 'class', 'label', 'result'], 'Unknown');
    let confidence = pick(data, ['confidence', 'probability', 'score', 'accuracy']);
    if (confidence !== undefined) { confidence = Number(confidence); if (confidence <= 1) confidence *= 100; }

    const symptoms = pick(data, ['symptoms', 'symptom', 'signs']);
    const treatment = pick(data, ['treatment', 'cure', 'remedy', 'treatments']);
    const prevention = pick(data, ['prevention', 'preventive_measures', 'precautions']);
    const medicine = pick(data, ['medicine', 'medicines', 'pesticides', 'medicine_recommendation', 'recommended_medicines', 'chemicals']);
    const description = pick(data, ['description', 'about', 'details', 'message']);
    const healthy = /healthy/i.test(String(name));

    panel.innerHTML = `
      <div class="result-hero" ${healthy ? '' : 'style="background:linear-gradient(125deg,#8a1c2b,#e5484d)"'}>
        <span class="mi" aria-hidden="true">${healthy ? 'verified' : 'coronavirus'}</span>
        <div style="flex:1">
          <div class="small" style="opacity:.85;text-transform:uppercase;letter-spacing:.1em">Diagnosis</div>
          <div class="big">${esc(titleCase(String(name)))}</div>
        </div>
        ${Number.isFinite(confidence) ? `<div class="center">
          <div style="font-size:2rem;font-weight:800">${fmtNum(confidence, 1)}%</div>
          <div class="small" style="opacity:.85">confidence</div></div>` : ''}
      </div>
      ${description ? `<p class="mt-2">${esc(String(description))}</p>` : ''}
      <div class="grid auto mt-2">
        ${block('Symptoms', 'sick', symptoms)}
        ${block('Treatment', 'healing', treatment)}
        ${block('Prevention', 'shield', prevention)}
        ${block('Recommended medicines', 'medication', medicine)}
      </div>
      <div class="row wrap actions mt-2 no-print">
        <button class="btn btn--ghost btn--sm" onclick="window.print()"><span class="mi">print</span>Print diagnosis</button>
        <a class="btn btn--ghost btn--sm" href="chatbot.html"><span class="mi">forum</span>Ask the AI about it</a>
      </div>`;
  }

  function setFile(f) {
    const err = $('#diseaseError');
    err.textContent = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { err.textContent = 'Please choose an image file.'; Toast.warn('Images only (JPG, PNG, WEBP).'); return; }
    if (f.size > MAX_BYTES) { err.textContent = 'Image is larger than 8 MB.'; Toast.warn('That image is too large (max 8 MB).'); return; }
    file = f;
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = URL.createObjectURL(f);
    const img = $('#diseasePreview');
    img.src = previewURL;
    img.classList.remove('hidden');
    $('#diseaseSubmit').disabled = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const drop = $('#diseaseDrop');
    const input = $('#diseaseFile');

    drop.onclick = () => input.click();
    drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    input.onchange = (e) => setFile(e.target.files[0]);

    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-drag'); }));
    drop.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0]));

    $('#diseaseClear').onclick = () => {
      file = null; input.value = '';
      $('#diseasePreview').classList.add('hidden');
      $('#diseaseSubmit').disabled = true;
      $('#diseaseResult').innerHTML = '';
    };

    $('#diseaseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!file) { Toast.warn('Upload a leaf photo first.'); return; }
      const restore = UI.busy($('#diseaseSubmit'), 'Diagnosing…');
      UI.loading($('#diseaseResult'), 'Scanning the leaf with the vision model…');
      try {
        render(await API.detectDisease(file));
        Toast.success('Diagnosis complete.');
      } catch (err) {
        UI.error($('#diseaseResult'), err.message);
        Toast.error(err.message);
      } finally { restore(); }
    });
  });
})();
