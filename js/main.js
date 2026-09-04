// ===========================================================
// Entry point. Wires everything up once Google Identity Services
// has loaded and, later, once the user has signed in.
// ===========================================================
const App = {
  state: {
    shifts: [],
    logs: [],
    payConfig: null,
    summaryPeriod: "payPeriod" // 'week' | 'payPeriod' | 'month'
  },

  async onSignedIn() {
    try {
      await Drive.ensureStructure();
      this.state.shifts = await Drive.loadShifts();
      this.state.logs = await Drive.loadLogs();
      this.state.payConfig = await Drive.loadPayConfig();

      Calendar.render();
      this.refreshSummary();
      Sync.updateBanner();
      await Sync.flush();
      Reminders.init();
      Reminders.check();
    } catch (err) {
      this.toast("Setup error: " + err.message);
      console.error(err);
    }
  },

  refreshSummary() {
    const cfg = this.state.payConfig || CONFIG.DEFAULT_PAY_CONFIG;
    const summary = Pay.summarizeForPeriod(this.state.shifts, cfg, this.state.summaryPeriod);
    document.getElementById("periodLabel").textContent = summary.range.label;
    document.getElementById("sumHours").textContent = summary.totalHours.toFixed(1);
    document.getElementById("sumRegOt").textContent =
      `${summary.regularHours.toFixed(1)} / ${summary.overtimeHours.toFixed(1)}`;
    document.getElementById("sumGross").textContent = "$" + summary.grossPay.toFixed(2);
    document.getElementById("sumNet").textContent = "$" + summary.netPay.toFixed(2);

    const ytd = Pay.summarizeForPeriod(this.state.shifts, cfg, "ytd");
    document.getElementById("ytdLine").textContent =
      `Year to date: ${ytd.totalHours.toFixed(1)} h · $${ytd.netPay.toFixed(2)} est. net`;
  },

  setSummaryPeriod(period) {
    this.state.summaryPeriod = period;
    document.querySelectorAll(".period-toggle button").forEach(b => {
      b.classList.toggle("active", b.dataset.period === period);
    });
    this.refreshSummary();
  },

  toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  },

  init() {
    Theme.init();
    Modals.init();
    document.getElementById("prevMonth").addEventListener("click", () => Calendar.prevMonth());
    document.getElementById("nextMonth").addEventListener("click", () => Calendar.nextMonth());
    document.getElementById("exportShiftsCsv").addEventListener("click", () => Exporter.exportShiftsCsv());
    document.getElementById("exportLogsCsv").addEventListener("click", () => Exporter.exportLogsCsv());
    document.getElementById("exportPdf").addEventListener("click", () => Exporter.exportPdf());
    document.getElementById("exportAnnualPdf").addEventListener("click", () => Exporter.exportAnnualPdf());
    document.querySelectorAll(".period-toggle button").forEach(b => {
      b.addEventListener("click", () => this.setSummaryPeriod(b.dataset.period));
    });
    document.getElementById("syncRetryBtn").addEventListener("click", () => Sync.flush());
    Calendar.render();

    // Google Identity Services script loads async — wait for it.
    const waitForGoogle = setInterval(() => {
      if (window.google && google.accounts) {
        clearInterval(waitForGoogle);
        Auth.init();
      }
    }, 100);
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
