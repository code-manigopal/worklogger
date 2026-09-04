// ===========================================================
// A searchable/filterable table of every work log entry.
// ===========================================================
const LogsView = {
  open() {
    this.populateCategoryFilter();
    document.getElementById("logsSearchInput").value = "";
    document.getElementById("logsFilterFrom").value = "";
    document.getElementById("logsFilterTo").value = "";
    document.getElementById("logsFilterCategory").value = "";
    Modals.open("logsModal");
    this.render();
  },

  populateCategoryFilter() {
    const select = document.getElementById("logsFilterCategory");
    select.innerHTML = '<option value="">All categories</option>';
    Object.values(CONFIG.CATEGORIES).forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.label; opt.textContent = cat.label;
      select.appendChild(opt);
    });
  },

  render() {
    const catFilter = document.getElementById("logsFilterCategory").value;
    const q = document.getElementById("logsSearchInput").value.trim().toLowerCase();
    const from = document.getElementById("logsFilterFrom").value;
    const to = document.getElementById("logsFilterTo").value;

    let rows = App.state.logs.slice().sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    if (catFilter) rows = rows.filter(r => r.category === catFilter);
    if (from) rows = rows.filter(r => r.date >= from);
    if (to) rows = rows.filter(r => r.date <= to);
    if (q) rows = rows.filter(r =>
      (r.notes || "").toLowerCase().includes(q) || (r.activities || "").toLowerCase().includes(q)
    );

    const tbody = document.getElementById("logsTableBody");
    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-hint">No matching log entries.</td></tr>';
      return;
    }
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.className = "logs-table-row";
      tr.innerHTML = `
        <td>${r.date}<br><span class="muted">${r.time || ""}</span></td>
        <td>${r.category}</td>
        <td>${r.activities || ""}</td>
        <td>${(r.notes || "").length > 80 ? r.notes.slice(0, 80) + "…" : (r.notes || "")}</td>`;
      tr.addEventListener("click", () => {
        Modals.close("logsModal");
        DayDetail.open(r.date);
      });
      tbody.appendChild(tr);
    });
  }
};
