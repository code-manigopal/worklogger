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
    const split = Pay.summarizeEarnedVsScheduledForPeriod(this.state.shifts, this.state.logs, cfg, this.state.summaryPeriod);
    document.getElementById("periodLabel").textContent = split.range.label;
    document.getElementById("sumHours").textContent =
      `${split.earned.totalHours.toFixed(1)} / ${split.scheduled.totalHours.toFixed(1)}`;
    document.getElementById("sumRegOt").textContent =
      `${split.earned.regularHours.toFixed(1)} / ${split.earned.overtimeHours.toFixed(1)}`;
    document.getElementById("sumGross").textContent = "$" + split.earned.netPay.toFixed(2);
    document.getElementById("sumNet").textContent = "$" + split.scheduled.netPay.toFixed(2);

    const ytdSplit = Pay.summarizeEarnedVsScheduledForPeriod(this.state.shifts, this.state.logs, cfg, "ytd");
    const ytdTotalHours = ytdSplit.earned.totalHours + ytdSplit.scheduled.totalHours;
    const ytdTotalNet = ytdSplit.earned.netPay + ytdSplit.scheduled.netPay;
    document.getElementById("ytdLine").textContent =
      `Year to date: ${ytdTotalHours.toFixed(1)} h (${ytdSplit.earned.totalHours.toFixed(1)} earned) · $${ytdTotalNet.toFixed(2)} est. net`;
  },

  setSummaryPeriod(period) {
    this.state.summaryPeriod = period;
    document.querySelectorAll(".period-toggle button").forEach(b => {
      b.classList.toggle("active", b.dataset.period === period);
    });
    const strip = document.getElementById("summaryStrip");
    strip.classList.remove("mode-week", "mode-payPeriod", "mode-month");
    strip.classList.add("mode-" + period);
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
    Auth.init();
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
