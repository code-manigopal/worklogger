// ===========================================================
// If a shift/log save fails (offline, flaky connection), it's
// queued in localStorage and retried on next load or on demand.
// This is a real standalone site (not a claude.ai artifact), so
// localStorage is the right tool here.
// ===========================================================
const Sync = {
  QUEUE_KEY: "worklogger_pending_queue",

  getQueue() {
    try { return JSON.parse(localStorage.getItem(this.QUEUE_KEY) || "[]"); }
    catch { return []; }
  },

  setQueue(q) {
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(q));
    this.updateBanner();
  },

  enqueue(action) {
    const q = this.getQueue();
    q.push(action);
    this.setQueue(q);
  },

  updateBanner() {
    const q = this.getQueue();
    const el = document.getElementById("syncBanner");
    if (!el) return;
    if (q.length) {
      el.hidden = false;
      el.querySelector(".sync-text").textContent =
        `${q.length} change${q.length > 1 ? "s" : ""} saved locally, waiting to sync to Drive.`;
    } else {
      el.hidden = true;
    }
  },

  async flush() {
    const q = this.getQueue();
    if (!q.length) return;
    const remaining = [];
    for (const action of q) {
      try {
        if (action.type === "shift") await Drive.appendShift(action.row);
        else if (action.type === "log") await Drive.appendLog(action.row);
      } catch (e) {
        remaining.push(action);
      }
    }
    this.setQueue(remaining);
    if (remaining.length < q.length) {
      App.state.shifts = await Drive.loadShifts();
      App.state.logs = await Drive.loadLogs();
      Calendar.render();
      App.refreshSummary();
      if (remaining.length === 0) App.toast("All pending changes synced.");
      else App.toast(`Synced some changes — ${remaining.length} still pending.`);
    }
  }
};
