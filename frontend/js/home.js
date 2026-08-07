/* ==========================================================================
   home.js — Dashboard statistics + recent predictions (GET /history)
   ========================================================================== */
(function () {
  const panel = $('#recentPanel');

  function setStat(id, value) { const n = $(id); if (n) n.textContent = value; }

  function renderRecent(rows) {
    if (!rows.length) return UI.empty(panel, 'No predictions yet. Run your first crop recommendation.', 'grass');
    UI.ready(panel);
    panel.innerHTML = `
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Date</th><th>Crop</th><th>N</th><th>P</th><th>K</th><th>Temp °C</th><th>City</th></tr></thead>
        <tbody>${rows.slice(0, 6).map((r) => `
          <tr>
            <td class="small muted">${esc(fmtDate(pick(r, ['created_at', 'timestamp', 'date', 'time'])))}</td>
            <td><span class="badge"><span class="mi" style="font-size:14px">eco</span>${esc(titleCase(pick(r, ['crop', 'prediction', 'recommended_crop', 'label'], '—')))}</span></td>
            <td>${esc(fmtNum(pick(r, ['N', 'n', 'nitrogen'])))}</td>
            <td>${esc(fmtNum(pick(r, ['P', 'p', 'phosphorus'])))}</td>
            <td>${esc(fmtNum(pick(r, ['K', 'k', 'potassium'])))}</td>
            <td>${esc(fmtNum(pick(r, ['temperature', 'temp'])))}</td>
            <td>${esc(pick(r, ['city', 'location'], '—'))}</td>
          </tr>`).join('')}</tbody>
      </table></div>`;
  }

  async function load() {
    UI.loading(panel, 'Fetching your latest predictions…');
    try {
      const [cropData, fertData] = await Promise.allSettled([API.history(), API.fertilizerHistory()]);

      const crops = cropData.status === 'fulfilled' ? asList(cropData.value, ['history', 'data', 'records', 'results']) : [];
      const ferts = fertData.status === 'fulfilled' ? asList(fertData.value, ['history', 'data', 'records', 'results']) : [];

      setStat('#statPredictions', crops.length ? fmtNum(crops.length, 0) : '0');
      setStat('#statFertilizer', ferts.length ? fmtNum(ferts.length, 0) : '0');

      // Most frequently recommended crop
      const counts = {};
      crops.forEach((r) => {
        const c = titleCase(pick(r, ['crop', 'prediction', 'recommended_crop', 'label'], ''));
        if (c) counts[c] = (counts[c] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      setStat('#statTopCrop', top ? top[0] : '—');

      const latest = crops[0] && pick(crops[0], ['created_at', 'timestamp', 'date', 'time']);
      setStat('#statLast', latest ? fmtDate(latest) : '—');

      if (cropData.status === 'rejected') throw cropData.reason;
      renderRecent(crops);
    } catch (err) {
      UI.error(panel, err.message, load);
      Toast.error(err.message);
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
