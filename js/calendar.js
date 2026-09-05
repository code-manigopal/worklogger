// ===========================================================
// Renders the month grid and wires up hover tooltips.
// Reads from App.state.shifts / App.state.logs (set in main.js).
// ===========================================================
const Calendar = {
  viewDate: new Date(),

  fmt(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  render() {
    const grid = document.getElementById("calendarDays");
    grid.innerHTML = "";

    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    document.getElementById("monthLabel").textContent =
      this.viewDate.toLocaleDateString("en-CA", { month: "long", year: "numeric" });

    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startDay);

    const todayStr = this.fmt(new Date());
    const shiftsByDate = {};
    (App.state.shifts || []).forEach(s => {
      (shiftsByDate[s.date] = shiftsByDate[s.date] || []).push(s);
    });
    const logsByDate = {};
    (App.state.logs || []).forEach(l => {
      (logsByDate[l.date] = logsByDate[l.date] || []).push(l);
    });

    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      const dateStr = this.fmt(cellDate);
      const isOutside = cellDate.getMonth() !== month;

      const cell = document.createElement("div");
      const weekStart = Pay.getWorkWeekRange(cellDate).start;
      const weekIndex = Math.floor(new Date(weekStart + "T00:00:00").getTime() / (7 * 86400000));
      const weekStripeClass = weekIndex % 2 === 0 ? "week-even" : "week-odd";
      cell.className = "day-cell " + weekStripeClass + (isOutside ? " outside" : "") + (dateStr === todayStr ? " today" : "");
      cell.dataset.date = dateStr;

      const num = document.createElement("div");
      num.className = "day-num";
      num.textContent = cellDate.getDate();
      cell.appendChild(num);

      const tags = document.createElement("div");
      tags.className = "day-tags";

      const dayShifts = shiftsByDate[dateStr] || [];
      const dayLogs = logsByDate[dateStr] || [];

      dayShifts.forEach(s => {
        const tag = document.createElement("span");
        tag.className = "tag " + (s.type === "Overtime" ? "tag-overtime" : "tag-normal");
        tag.textContent = s.type === "Overtime" ? "OT" : "Shift";
        tags.appendChild(tag);
      });

      if (dayShifts.length && !dayLogs.length && dateStr < todayStr) {
        const tag = document.createElement("span");
        tag.className = "tag tag-missing";
        tag.textContent = "No log";
        tags.appendChild(tag);
      } else if (dayLogs.length) {
        const tag = document.createElement("span");
        tag.className = "tag tag-logged";
        tag.textContent = "Logged";
        tags.appendChild(tag);
      }

      cell.appendChild(tags);

      if (dayShifts.length || dayLogs.length) {
        cell.addEventListener("mouseenter", (e) => this.showTooltip(e, dateStr, dayShifts, dayLogs));
        cell.addEventListener("mousemove", (e) => this.moveTooltip(e));
        cell.addEventListener("mouseleave", () => this.hideTooltip());
      }
      cell.addEventListener("click", () => {
        App.setRefDate(new Date(dateStr + "T00:00:00"));
        DayDetail.open(dateStr);
      });

      grid.appendChild(cell);
    }
  },

  showTooltip(e, dateStr, shifts, logs) {
    const tip = document.getElementById("dayTooltip");
    let html = `<b>${dateStr}</b>`;
    shifts.forEach(s => {
      const paidHrs = Pay.hoursForShift(s).toFixed(1);
      const timeLabel = s.start_time ? `${s.start_time}–${s.end_time} (${s.type})` : `${s.type} shift`;
      html += `<br>${timeLabel} · ${paidHrs}h paid${s.employer ? " · " + s.employer : ""}`;
    });
    logs.forEach(l => {
      html += `<br><b>${l.category || ""}</b>: ${l.activities || ""}`;
      if (l.notes) html += `<br>${l.notes.length > 90 ? l.notes.slice(0, 90) + "…" : l.notes}`;
    });
    tip.innerHTML = html;
    tip.hidden = false;
    this.moveTooltip(e);
  },

  moveTooltip(e) {
    const tip = document.getElementById("dayTooltip");
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 280) + "px";
    tip.style.top = Math.min(e.clientY + 14, window.innerHeight - 120) + "px";
  },

  hideTooltip() {
    document.getElementById("dayTooltip").hidden = true;
  },

  prevMonth() {
    this.viewDate.setMonth(this.viewDate.getMonth() - 1);
    this.render();
    App.setRefDate(new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1));
  },

  nextMonth() {
    this.viewDate.setMonth(this.viewDate.getMonth() + 1);
    this.render();
    App.setRefDate(new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1));
  }
};
