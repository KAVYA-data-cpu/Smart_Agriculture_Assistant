/* ==========================================================================
   history.js — Crop prediction history (GET /history)
   Search · sort · pagination · CSV export
   ========================================================================== */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const mount = $('#histTable');
    let table = build(10);

    function build(size) {
      return createDataTable({
        mount, pager: $('#histPager'), pageSize: size,
        emptyText: 'No predictions recorded yet. Run a crop recommendation to get started.',
      });
    }

    let rows = [];
    async function load() {
      UI.loading(mount, 'Loading prediction history…');
      try {
        const data = await API.history();
        rows = asList(data, ['history', 'data', 'records', 'results', 'predictions']);
        table.setRows(rows);
        if (rows.length) Toast.success(`Loaded ${rows.length} record${rows.length === 1 ? '' : 's'}.`);
      } catch (err) {
        UI.error(mount, err.message, load);
        Toast.error(err.message);
      }
    }

    let debounce;
    $('#histSearch').addEventListener('input', (e) => {
      clearTimeout(debounce);
      const v = e.target.value;
      debounce = setTimeout(() => table.search(v), 220);
    });

    $('#histSize').addEventListener('change', (e) => {
      table = build(Number(e.target.value));
      table.setRows(rows);
      table.search($('#histSearch').value);
    });

    $('#histRefresh').onclick = load;
    $('#histExport').onclick = () => exportCSV(table.rows(), 'crop-prediction-history.csv');

    load();
  });
})();
