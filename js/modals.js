// ===========================================================
// Modal open/close plumbing + the three forms' submit handlers.
// Add Shift and Log Work both double as edit forms when opened
// with an existing row (see DayDetail).
// ===========================================================
const Modals = {
  // Only one of these is ever meant to be open at a time.
  // "lightbox" is intentionally excluded — it stacks on top of dayDetailModal.
  EXCLUSIVE_IDS: ["shiftModal", "logModal", "settingsModal", "dayDetailModal", "logsModal"],

  open(id, opts = {}) {
    if (this.EXCLUSIVE_IDS.includes(id)) {
      const keep = new Set([id, ...(opts.keepOpen || [])]);
      this.EXCLUSIVE_IDS.forEach(otherId => {
        if (!keep.has(otherId)) document.getElementById(otherId).hidden = true;
      });
    }
    document.getElementById(id).hidden = false;
  },
  close(id) {
    document.getElementById(id).hidden = true;
  },

  init() {
    document.querySelectorAll("[data-close]").forEach(btn => {
      btn.addEventListener("click", () => this.close(btn.dataset.close));
    });
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.hidden = true;
      });
    });

    document.getElementById("addShiftBtn").addEventListener("click", () => this.openShiftModal());
    document.getElementById("logWorkBtn").addEventListener("click", () => this.openLogModal());
    document.getElementById("settingsBtn").addEventListener("click", () => this.openSettingsModal());
    document.getElementById("viewLogsBtn").addEventListener("click", () => LogsView.open());

    document.getElementById("shiftForm").addEventListener("submit", (e) => this.submitShift(e));
    document.getElementById("logForm").addEventListener("submit", (e) => this.submitLog(e));
    document.getElementById("settingsForm").addEventListener("submit", (e) => this.submitSettings(e));
    document.getElementById("generateShiftsBtn").addEventListener("click", () => this.generateRegularShifts());

    document.getElementById("logCategory").addEventListener("change", () => this.renderActivityCheckboxes());
    document.getElementById("logPhotos").addEventListener("change", () => this.renderPhotoPreviews());
    ["shiftQuickHours", "shiftStart", "shiftBreak"].forEach(id => {
      document.getElementById(id).addEventListener("input", () => this.applyQuickHours());
    });

    ["logsFilterCategory", "logsFilterFrom", "logsFilterTo"].forEach(id => {
      document.getElementById(id).addEventListener("change", () => LogsView.render());
    });
    document.getElementById("logsSearchInput").addEventListener("input", () => LogsView.render());

    this.populateCategoryDropdown();
    this.populateEmployerDropdowns();
  },

  populateCategoryDropdown() {
    const select = document.getElementById("logCategory");
    select.innerHTML = "";
    Object.entries(CONFIG.CATEGORIES).forEach(([key, cat]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = cat.label;
      select.appendChild(opt);
    });
  },

  populateEmployerDropdowns() {
    ["shiftEmployer", "logEmployer"].forEach(id => {
      const select = document.getElementById(id);
      select.innerHTML = "";
      CONFIG.EMPLOYERS.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name; opt.textContent = name;
        select.appendChild(opt);
      });
    });
  },

  renderActivityCheckboxes(preChecked) {
    const key = document.getElementById("logCategory").value;
    const cat = CONFIG.CATEGORIES[key];
    const box = document.getElementById("logActivities");
    box.innerHTML = "";

    const allLabel = document.createElement("label");
    allLabel.className = "activity-all";
    const allCb = document.createElement("input");
    allCb.type = "checkbox";
    allLabel.appendChild(allCb);
    allLabel.appendChild(document.createTextNode("All"));
    box.appendChild(allLabel);

    const itemCbs = [];
    cat.items.forEach(item => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "activity-item";
      cb.value = item;
      if (preChecked && preChecked.includes(item)) cb.checked = true;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(item));
      box.appendChild(label);
      itemCbs.push(cb);
    });

    allCb.checked = itemCbs.length > 0 && itemCbs.every(cb => cb.checked);
    allCb.addEventListener("change", () => {
      itemCbs.forEach(cb => { cb.checked = allCb.checked; });
    });
    itemCbs.forEach(cb => {
      cb.addEventListener("change", () => {
        allCb.checked = itemCbs.every(c => c.checked);
      });
    });
  },

  categoryKeyForLabel(label) {
    return Object.entries(CONFIG.CATEGORIES).find(([, c]) => c.label === label)?.[0] || Object.keys(CONFIG.CATEGORIES)[0];
  },

  // ---- Add / Edit Shift ----
  openShiftModal(existing) {
    const form = document.getElementById("shiftForm");
    form.reset();
    document.getElementById("shiftFormError").hidden = true;
    document.getElementById("shiftEditId").value = existing ? existing.id : "";
    document.getElementById("modalShiftTitle").textContent = existing ? "Edit Shift" : "Add Shift";
    document.getElementById("shiftSubmitBtn").textContent = existing ? "Save Changes" : "Add Shift";

    const dateInput = document.getElementById("shiftDate");
    dateInput.removeAttribute("min"); // any date — past, today, or future — is fine now
    document.getElementById("shiftQuickHours").value = "";
    if (existing) {
      dateInput.value = existing.date;
      document.getElementById("shiftStart").value = existing.start_time;
      document.getElementById("shiftEnd").value = existing.end_time;
      document.getElementById("shiftBreak").value = existing.break_minutes || CONFIG.DEFAULT_BREAK_MINUTES;
      document.getElementById("shiftEmployer").value = existing.employer || CONFIG.EMPLOYERS[0];
      document.querySelector(`input[name="shiftType"][value="${existing.type}"]`).checked = true;
    } else {
      dateInput.value = Calendar.fmt(new Date());
      document.getElementById("shiftBreak").value = CONFIG.DEFAULT_BREAK_MINUTES;
      document.getElementById("shiftEmployer").value = CONFIG.EMPLOYERS[0];
    }
    this.open("shiftModal", { keepOpen: existing ? ["dayDetailModal"] : [] });
  },

  // Typing hours worked auto-fills the end time from start + hours + break,
  // so you don't have to do the math for a shift you're logging after the fact.
  applyQuickHours() {
    const startVal = document.getElementById("shiftStart").value;
    const hoursVal = parseFloat(document.getElementById("shiftQuickHours").value);
    if (!startVal || isNaN(hoursVal)) return;
    const breakMin = parseFloat(document.getElementById("shiftBreak").value) || 0;
    const [sh, sm] = startVal.split(":").map(Number);
    let totalMinutes = Math.round(sh * 60 + sm + hoursVal * 60 + breakMin) % (24 * 60);
    const eh = Math.floor(totalMinutes / 60);
    const em = totalMinutes % 60;
    document.getElementById("shiftEnd").value = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  },

  async submitShift(e) {
    e.preventDefault();
    const errEl = document.getElementById("shiftFormError");
    errEl.hidden = true;

    const editId = document.getElementById("shiftEditId").value;
    const date = document.getElementById("shiftDate").value;
    const start = document.getElementById("shiftStart").value;
    const end = document.getElementById("shiftEnd").value;
    const breakMinutes = document.getElementById("shiftBreak").value || CONFIG.DEFAULT_BREAK_MINUTES;
    const employer = document.getElementById("shiftEmployer").value;
    const type = document.querySelector('input[name="shiftType"]:checked').value;

    const submitBtn = document.getElementById("shiftSubmitBtn");
    submitBtn.disabled = true;
    try {
      if (editId) {
        const rows = App.state.shifts.map(s => s.id === editId
          ? { ...s, date, start_time: start, end_time: end, break_minutes: breakMinutes, hours: "", employer, type }
          : s);
        App.state.shifts = await Drive.writeShiftsRows(rows);
        App.toast("Shift updated.");
        this.close("shiftModal");
        DayDetail.currentDate === date && DayDetail.render();
      } else {
        const row = {
          id: crypto.randomUUID(),
          date, start_time: start, end_time: end, break_minutes: breakMinutes, hours: "", type, employer,
          created_at: new Date().toISOString()
        };
        try {
          App.state.shifts = await Drive.appendShift(row);
          App.toast("Shift added.");
        } catch (err) {
          App.state.shifts.push(row);
          Sync.enqueue({ type: "shift", row });
          App.toast("Offline — shift saved locally, will sync later.");
        }
        this.close("shiftModal");
      }
      Calendar.render();
      App.refreshSummary();
      Reminders.check();
    } catch (err) {
      errEl.textContent = "Couldn't save to Drive: " + err.message;
      errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  },

  // ---- Add / Edit Log ----
  openLogModal(existing) {
    const form = document.getElementById("logForm");
    form.reset();
    document.getElementById("logFormError").hidden = true;
    document.getElementById("logFormStatus").hidden = true;
    document.getElementById("logEditId").value = existing ? existing.id : "";
    document.getElementById("modalLogTitle").textContent = existing ? "Edit Log" : "Log Work";
    document.getElementById("logSubmitBtn").textContent = existing ? "Save Changes" : "Save Log";
    document.getElementById("photoPreviewList").innerHTML = "";
    document.getElementById("logDate").max = Calendar.fmt(new Date());

    if (existing) {
      document.getElementById("logDate").value = existing.date;
      document.getElementById("logHours").value = existing.hours_worked || "";
      document.getElementById("logCategory").value = this.categoryKeyForLabel(existing.category);
      document.getElementById("logEmployer").value = existing.employer || CONFIG.EMPLOYERS[0];
      document.getElementById("logNotes").value = existing.notes || "";
      this.renderActivityCheckboxes((existing.activities || "").split(";").map(s => s.trim()));
      document.getElementById("logExistingPhotos").value = existing.photo_links || "";
      const hint = document.getElementById("logPhotoHint");
      const count = (existing.photo_links || "").split(";").filter(Boolean).length;
      hint.textContent = count ? `${count} photo(s) already attached — new uploads are added, not replaced.` : "";
      hint.hidden = !count;
    } else {
      document.getElementById("logDate").value = Calendar.fmt(new Date());
      document.getElementById("logHours").value = "";
      document.getElementById("logEmployer").value = CONFIG.EMPLOYERS[0];
      document.getElementById("logExistingPhotos").value = "";
      document.getElementById("logPhotoHint").hidden = true;
      this.renderActivityCheckboxes();
    }
    this.open("logModal", { keepOpen: existing ? ["dayDetailModal"] : [] });
  },

  renderPhotoPreviews() {
    const files = document.getElementById("logPhotos").files;
    const list = document.getElementById("photoPreviewList");
    list.innerHTML = "";
    Array.from(files).forEach(file => {
      const img = document.createElement("img");
      img.className = "photo-thumb";
      img.src = URL.createObjectURL(file);
      list.appendChild(img);
    });
  },

  async submitLog(e) {
    e.preventDefault();
    const errEl = document.getElementById("logFormError");
    const statusEl = document.getElementById("logFormStatus");
    errEl.hidden = true; statusEl.hidden = true;

    const editId = document.getElementById("logEditId").value;
    const date = document.getElementById("logDate").value;
    const hoursWorked = document.getElementById("logHours").value;
    const categoryKey = document.getElementById("logCategory").value;
    const categoryLabel = CONFIG.CATEGORIES[categoryKey].label;
    const employer = document.getElementById("logEmployer").value;
    const activities = Array.from(document.querySelectorAll("#logActivities input.activity-item:checked")).map(cb => cb.value);
    const notes = document.getElementById("logNotes").value.trim();
    const files = document.getElementById("logPhotos").files;
    const existingPhotoLinks = document.getElementById("logExistingPhotos").value;

    if (!activities.length) {
      errEl.textContent = "Pick at least one activity.";
      errEl.hidden = false;
      return;
    }

    const submitBtn = document.getElementById("logSubmitBtn");
    submitBtn.disabled = true;
    try {
      let photoLinks = existingPhotoLinks ? existingPhotoLinks.split(";").map(s => s.trim()).filter(Boolean) : [];
      if (files.length) {
        statusEl.textContent = `Uploading ${files.length} photo(s)...`;
        statusEl.hidden = false;
        const folderId = await Drive.ensureDateFolder(date);
        for (const file of files) {
          const uploaded = await Drive.uploadPhoto(folderId, file);
          photoLinks.push(uploaded.id);
        }
      }

      if (editId) {
        statusEl.textContent = "Saving changes...";
        const rows = App.state.logs.map(l => l.id === editId
          ? { ...l, date, hours_worked: hoursWorked, category: categoryLabel, activities: activities.join("; "), notes, employer, photo_links: photoLinks.join("; ") }
          : l);
        App.state.logs = await Drive.writeLogsRows(rows);
        await this.syncHoursToShift(date, employer, hoursWorked);
        App.toast("Log updated.");
        this.close("logModal");
        DayDetail.currentDate === date && DayDetail.render();
      } else {
        statusEl.textContent = "Saving log...";
        const row = {
          id: crypto.randomUUID(),
          date, hours_worked: hoursWorked, category: categoryLabel, employer,
          activities: activities.join("; "),
          notes,
          photo_links: photoLinks.join("; "),
          logged_at: new Date().toISOString()
        };
        try {
          App.state.logs = await Drive.appendLog(row);
          await this.syncHoursToShift(date, employer, hoursWorked);
          App.toast("Work log saved.");
        } catch (err) {
          App.state.logs.push(row);
          Sync.enqueue({ type: "log", row });
          App.toast("Offline — log saved locally, will sync later.");
        }
        this.close("logModal");
      }
      Calendar.render();
      App.refreshSummary();
    } catch (err) {
      errEl.textContent = "Couldn't save photos/log: " + err.message;
      errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      statusEl.hidden = true;
    }
  },

  // Entering hours in Log Work feeds straight into pay: update the
  // matching shift if one exists for this date+employer, or create a
  // minimal one (hours only, no clock times) if it doesn't.
  async syncHoursToShift(date, employer, hoursWorked) {
    if (hoursWorked === "" || hoursWorked === null || isNaN(Number(hoursWorked))) return;
    try {
      const existingShift = App.state.shifts.find(s => s.date === date && s.employer === employer);
      let rows;
      if (existingShift) {
        rows = App.state.shifts.map(s => s === existingShift ? { ...s, hours: hoursWorked } : s);
      } else {
        rows = [...App.state.shifts, {
          id: crypto.randomUUID(),
          date, start_time: "", end_time: "", break_minutes: "", hours: hoursWorked,
          type: "Normal", employer, created_at: new Date().toISOString()
        }];
      }
      App.state.shifts = await Drive.writeShiftsRows(rows);
    } catch (e) {
      // Non-fatal — the log itself is already saved; just note the hours didn't sync.
      App.toast("Log saved, but couldn't update hours: " + e.message);
    }
  },

  // ---- Settings ----
  async openSettingsModal() {
    const cfg = App.state.payConfig || CONFIG.DEFAULT_PAY_CONFIG;
    document.getElementById("cfgRate").value = cfg.hourlyRate;
    document.getElementById("cfgNightPremium").value = cfg.nightPremium || 0;
    document.getElementById("cfgCpp").value = cfg.cppRate;
    document.getElementById("cfgEi").value = cfg.eiRate;
    document.getElementById("cfgOtMult").value = cfg.otMultiplier;
    document.getElementById("cfgHireDate").value = cfg.hireDate || "";
    document.getElementById("cfgFirstFullPeriod").value = cfg.firstFullPeriodStart || "";
    document.getElementById("cfgPayLength").value = cfg.payPeriodLengthDays || CONFIG.DEFAULT_PAY_CONFIG.payPeriodLengthDays;

    const regularDays = cfg.regularDays || [];
    document.querySelectorAll("#regularDaysToggle input").forEach(cb => {
      cb.checked = regularDays.includes(Number(cb.value));
    });
    document.getElementById("cfgRegularStart").value = cfg.regularStart || "";
    document.getElementById("cfgRegularEnd").value = cfg.regularEnd || "";
    document.getElementById("cfgRegularBreak").value = cfg.regularBreak || CONFIG.DEFAULT_BREAK_MINUTES;
    document.getElementById("generateShiftsStatus").hidden = true;
    this.open("settingsModal");
  },

  async submitSettings(e) {
    e.preventDefault();
    const cfg = {
      hourlyRate: Number(document.getElementById("cfgRate").value),
      nightPremium: Number(document.getElementById("cfgNightPremium").value),
      cppRate: Number(document.getElementById("cfgCpp").value),
      eiRate: Number(document.getElementById("cfgEi").value),
      otMultiplier: Number(document.getElementById("cfgOtMult").value),
      hireDate: document.getElementById("cfgHireDate").value,
      firstFullPeriodStart: document.getElementById("cfgFirstFullPeriod").value,
      payPeriodLengthDays: Number(document.getElementById("cfgPayLength").value),
      regularDays: Array.from(document.querySelectorAll("#regularDaysToggle input:checked")).map(cb => Number(cb.value)),
      regularStart: document.getElementById("cfgRegularStart").value,
      regularEnd: document.getElementById("cfgRegularEnd").value,
      regularBreak: Number(document.getElementById("cfgRegularBreak").value) || CONFIG.DEFAULT_BREAK_MINUTES
    };
    await Drive.savePayConfig(cfg);
    App.state.payConfig = cfg;
    App.refreshSummary();
    this.close("settingsModal");
    App.toast("Pay settings saved.");
  },

  // Fills in upcoming shifts on your usual days, using the schedule set
  // in Settings. Never touches a date that already has a shift — so
  // editing or deleting a generated day afterward sticks; it won't be
  // silently recreated unless you delete it and then generate over that
  // same date range again.
  async generateRegularShifts() {
    const days = Array.from(document.querySelectorAll("#regularDaysToggle input:checked")).map(cb => Number(cb.value));
    const start = document.getElementById("cfgRegularStart").value;
    const end = document.getElementById("cfgRegularEnd").value;
    const breakMin = Number(document.getElementById("cfgRegularBreak").value) || CONFIG.DEFAULT_BREAK_MINUTES;
    const weeksAhead = Number(document.getElementById("cfgGenerateWeeks").value) || 4;
    const statusEl = document.getElementById("generateShiftsStatus");

    if (!days.length || !start || !end) {
      statusEl.textContent = "Pick at least one day and set a start/end time first.";
      statusEl.hidden = false;
      return;
    }

    statusEl.textContent = "Generating...";
    statusEl.hidden = false;

    const existingDates = new Set(App.state.shifts.map(s => s.date));
    const newRows = [];
    const today = new Date();
    for (let i = 0; i < weeksAhead * 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (!days.includes(d.getDay())) continue;
      const dateStr = Calendar.fmt(d);
      if (existingDates.has(dateStr)) continue;
      newRows.push({
        id: crypto.randomUUID(),
        date: dateStr, start_time: start, end_time: end, break_minutes: breakMin, hours: "",
        type: "Normal", employer: CONFIG.EMPLOYERS[0], created_at: new Date().toISOString()
      });
    }

    if (!newRows.length) {
      statusEl.textContent = "Nothing to add — those days are already covered in this window.";
      return;
    }

    try {
      const rows = [...App.state.shifts, ...newRows];
      App.state.shifts = await Drive.writeShiftsRows(rows);
      Calendar.render();
      App.refreshSummary();
      statusEl.textContent = `Added ${newRows.length} shift(s). You can edit or delete any of them individually from the calendar.`;
      App.toast(`Added ${newRows.length} upcoming shift(s).`);
    } catch (e) {
      statusEl.textContent = "Couldn't generate shifts: " + e.message;
    }
  }
};
