// ===========================================================
// Banner (always works) + optional OS notification (if the user
// grants permission) for a shift today or tomorrow.
// ===========================================================
const Reminders = {
  init() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  },

  check() {
    const today = Calendar.fmt(new Date());
    const tomorrow = Calendar.fmt(new Date(Date.now() + 86400000));
    const todays = App.state.shifts.filter(s => s.date === today);
    const tomorrows = App.state.shifts.filter(s => s.date === tomorrow);
    const banner = document.getElementById("reminderBanner");
    if (!banner) return;

    if (todays.length) {
      banner.textContent = "Today: " + todays.map(s => `${s.start_time}–${s.end_time}`).join(", ");
      banner.hidden = false;
      this.notifyOnce("today", "Shift today", banner.textContent);
    } else if (tomorrows.length) {
      banner.textContent = "Tomorrow: " + tomorrows.map(s => `${s.start_time}–${s.end_time}`).join(", ");
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  },

  notifyOnce(key, title, body) {
    const flagKey = "worklogger_notified_" + key + "_" + Calendar.fmt(new Date());
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, "1");
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch (e) { /* ignore */ }
    }
  }
};
