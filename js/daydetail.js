// ===========================================================
// Click a calendar day → see everything for that date, with
// edit/delete on each entry and thumbnails for uploaded photos.
// ===========================================================
const DayDetail = {
  currentDate: null,

  async open(dateStr) {
    this.currentDate = dateStr;
    document.getElementById("dayDetailTitle").textContent = dateStr;
    Modals.open("dayDetailModal");
    await this.render();
  },

  async render() {
    const shifts = App.state.shifts.filter(s => s.date === this.currentDate);
    const logs = App.state.logs.filter(l => l.date === this.currentDate);

    const shiftsBox = document.getElementById("dayDetailShifts");
    shiftsBox.innerHTML = shifts.length ? "" : '<p class="empty-hint">No shifts scheduled.</p>';
    shifts.forEach(s => {
      const row = document.createElement("div");
      row.className = "detail-row";
      const hrs = Pay.hoursForShift(s).toFixed(1);
      row.innerHTML = `
        <div class="detail-row-main">
          <b>${s.start_time}–${s.end_time}</b> · ${s.type} · ${hrs}h paid${s.employer ? " · " + s.employer : ""}
          <div class="detail-row-sub">${s.break_minutes || 0} min unpaid break</div>
        </div>`;
      const actions = document.createElement("div");
      actions.className = "detail-row-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-ghost btn-sm"; editBtn.type = "button"; editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => { Modals.openShiftModal(s); });
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost btn-sm btn-danger"; delBtn.type = "button"; delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => this.deleteShift(s.id));
      actions.appendChild(editBtn); actions.appendChild(delBtn);
      row.appendChild(actions);
      shiftsBox.appendChild(row);
    });

    const logsBox = document.getElementById("dayDetailLogs");
    logsBox.innerHTML = logs.length ? "" : '<p class="empty-hint">No work logged.</p>';
    for (const l of logs) {
      const row = document.createElement("div");
      row.className = "detail-row";
      row.innerHTML = `
        <div class="detail-row-main">
          <b>${l.time || ""} · ${l.category}</b>${l.employer ? " · " + l.employer : ""}
          <div class="detail-row-sub">${l.activities || ""}</div>
          ${l.notes ? `<div class="detail-row-sub">${l.notes}</div>` : ""}
        </div>`;
      const actions = document.createElement("div");
      actions.className = "detail-row-actions";
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-ghost btn-sm"; editBtn.type = "button"; editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => { Modals.openLogModal(l); });
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost btn-sm btn-danger"; delBtn.type = "button"; delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => this.deleteLog(l.id));
      actions.appendChild(editBtn); actions.appendChild(delBtn);
      row.appendChild(actions);
      logsBox.appendChild(row);

      if (l.photo_links) {
        const photoRow = document.createElement("div");
        photoRow.className = "photo-preview-list";
        const ids = l.photo_links.split(";").map(x => x.trim()).filter(Boolean);
        for (const id of ids) {
          const img = document.createElement("img");
          img.className = "photo-thumb photo-thumb-clickable";
          img.alt = "Uploaded photo";
          img.addEventListener("click", () => this.openLightbox(id));
          Drive.getPhotoBlobUrl(id).then(url => { img.src = url; }).catch(() => {});
          photoRow.appendChild(img);
        }
        logsBox.appendChild(photoRow);
      }
    }
  },

  async openLightbox(fileId) {
    const overlay = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    const errEl = document.getElementById("lightboxError");
    img.src = "";
    img.hidden = false;
    errEl.hidden = true;
    overlay.hidden = false;
    try {
      img.src = await Drive.getPhotoBlobUrl(fileId);
    } catch (e) {
      img.hidden = true;
      errEl.hidden = false;
    }
  },

  async deleteShift(id) {
    if (!confirm("Delete this shift?")) return;
    const rows = App.state.shifts.filter(s => s.id !== id);
    try {
      App.state.shifts = await Drive.writeShiftsRows(rows);
      Calendar.render(); App.refreshSummary(); this.render();
      App.toast("Shift deleted.");
    } catch (e) {
      App.toast("Couldn't delete: " + e.message);
    }
  },

  async deleteLog(id) {
    if (!confirm("Delete this log entry? (Any uploaded photos will stay in Drive.)")) return;
    const rows = App.state.logs.filter(l => l.id !== id);
    try {
      App.state.logs = await Drive.writeLogsRows(rows);
      Calendar.render(); this.render();
      App.toast("Log deleted.");
    } catch (e) {
      App.toast("Couldn't delete: " + e.message);
    }
  }
};
