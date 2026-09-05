// ===========================================================
// Pay estimation + period math. Flat-percentage CPP/EI you
// configure yourself — this is an estimate for personal
// tracking, not payroll advice. Verify actual rates and rules
// at canada.ca before relying on this.
// ===========================================================
const Pay = {
  // Ontario ESA: overtime pay kicks in after 44 hours worked in a week —
  // calculated weekly, not per shift or per day.
  ONTARIO_WEEKLY_OT_THRESHOLD: 44,

  hoursForShift(shift) {
    if (shift.hours !== undefined && shift.hours !== "" && !isNaN(Number(shift.hours))) {
      return Number(shift.hours);
    }
    const [sh, sm] = shift.start_time.split(":").map(Number);
    const [eh, em] = shift.end_time.split(":").map(Number);
    let start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += 24 * 60; // overnight shift
    const breakMinutes = Number(shift.break_minutes) || 0;
    const paidMinutes = Math.max(0, (end - start) - breakMinutes);
    return paidMinutes / 60;
  },

  // Walmart's work week runs Saturday through Friday.
  getWorkWeekRange(refDate) {
    const day = refDate.getDay(); // 0=Sun ... 6=Sat
    const daysSinceSaturday = (day + 1) % 7;
    const start = new Date(refDate);
    start.setDate(refDate.getDate() - daysSinceSaturday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: this.fmt(start), end: this.fmt(end) };
  },

  // Determines the anchor Saturday that full pay periods are counted
  // from. Uses firstFullPeriodStart directly if it's set (the one
  // piece of ground truth date-math alone can't derive — a 14-day
  // cycle has two possible phases a week apart, and only your actual
  // pay stub tells you which one your employer uses). Otherwise falls
  // back to snapping hireDate forward to the next Saturday.
  getPayPeriodAnchor(payConfig) {
    if (payConfig.firstFullPeriodStart) {
      return new Date(payConfig.firstFullPeriodStart + "T00:00:00");
    }
    const raw = payConfig.hireDate ? new Date(payConfig.hireDate + "T00:00:00") : new Date("2026-01-03T00:00:00");
    const day = raw.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;
    const anchor = new Date(raw);
    anchor.setDate(raw.getDate() + daysUntilSaturday);
    return anchor;
  },

  // A payday recurs a fixed number of days (default 7, matching a
  // typical one-week processing lag) after each period's end. Works
  // for any period, past or future, not just the one currently selected.
  PAY_DATE_LAG_DAYS: 7,

  isPayDate(dateStr, payConfig) {
    const anchor = this.getPayPeriodAnchor(payConfig);
    const lengthDays = Number(payConfig.payPeriodLengthDays) || 14;
    const msPerDay = 86400000;
    const firstPayDate = new Date(anchor.getTime() + (lengthDays - 1 + this.PAY_DATE_LAG_DAYS) * msPerDay);
    const d = new Date(dateStr + "T00:00:00");
    if (d < firstPayDate) return false;
    const offset = Math.round((d - firstPayDate) / msPerDay);
    return offset % lengthDays === 0;
  },

  groupShiftsByWorkWeek(shifts) {
    const weeks = {};
    shifts.forEach(s => {
      const { start } = this.getWorkWeekRange(new Date(s.date + "T00:00:00"));
      (weeks[start] = weeks[start] || []).push(s);
    });
    return weeks;
  },

  // Splits each shift's hours into regular vs overtime portions, using the
  // whole work week's chronological order — so the 44-hour threshold is
  // applied correctly across ALL shifts in the week before any per-shift
  // or per-bucket breakdown happens.
  attributePerShift(shifts) {
    const weeks = this.groupShiftsByWorkWeek(shifts);
    const results = [];
    Object.values(weeks).forEach(weekShifts => {
      const sorted = [...weekShifts].sort((a, b) =>
        (a.date + (a.created_at || "")).localeCompare(b.date + (b.created_at || ""))
      );
      let cumulative = 0;
      sorted.forEach(s => {
        const hrs = this.hoursForShift(s);
        const regularPortion = Math.max(0, Math.min(hrs, this.ONTARIO_WEEKLY_OT_THRESHOLD - cumulative));
        const overtimePortion = hrs - regularPortion;
        cumulative += hrs;
        results.push({ shift: s, hours: hrs, regularHours: regularPortion, overtimeHours: overtimePortion });
      });
    });
    return results;
  },

  payForHours(regularHours, overtimeHours, totalHours, payConfig) {
    const rate = Number(payConfig.hourlyRate) || 0;
    const otMult = Number(payConfig.otMultiplier) || 1.5;
    const nightPremium = Number(payConfig.nightPremium) || 0;
    const regularPay = regularHours * rate;
    const overtimePay = overtimeHours * rate * otMult;
    const nightPremiumPay = totalHours * nightPremium;
    const grossPay = regularPay + overtimePay + nightPremiumPay;
    const deductionRate = ((Number(payConfig.cppRate) || 0) + (Number(payConfig.eiRate) || 0)) / 100;
    const deductions = grossPay * deductionRate;
    return { regularPay, overtimePay, nightPremiumPay, grossPay, deductions, netPay: grossPay - deductions };
  },

  summarize(shifts, payConfig) {
    // Regular vs overtime is determined automatically by weekly total
    // hours crossing the 44-hour Ontario threshold — not by the per-shift
    // Normal/Overtime tag, which is kept only as your own reference label.
    const attrs = this.attributePerShift(shifts);
    let regularHours = 0, overtimeHours = 0;
    attrs.forEach(a => { regularHours += a.regularHours; overtimeHours += a.overtimeHours; });
    const totalHours = regularHours + overtimeHours;
    const pay = this.payForHours(regularHours, overtimeHours, totalHours, payConfig);
    return { totalHours, regularHours, overtimeHours, ...pay };
  },

  // Splits a summary into "earned" (dates that have a matching Log Work
  // entry) and "scheduled" (shifts with no log yet — still an estimate).
  // Uses the same per-shift weekly attribution as summarize(), so the two
  // buckets always add up to exactly the combined total.
  summarizeEarnedVsScheduled(shifts, logs, payConfig) {
    const loggedDates = new Set(logs.map(l => l.date));
    const attrs = this.attributePerShift(shifts);
    const buckets = {
      earned: { regularHours: 0, overtimeHours: 0 },
      scheduled: { regularHours: 0, overtimeHours: 0 }
    };
    attrs.forEach(a => {
      const bucket = loggedDates.has(a.shift.date) ? buckets.earned : buckets.scheduled;
      bucket.regularHours += a.regularHours;
      bucket.overtimeHours += a.overtimeHours;
    });
    const result = {};
    Object.entries(buckets).forEach(([key, b]) => {
      const totalHours = b.regularHours + b.overtimeHours;
      result[key] = { totalHours, regularHours: b.regularHours, overtimeHours: b.overtimeHours,
        ...this.payForHours(b.regularHours, b.overtimeHours, totalHours, payConfig) };
    });
    return result;
  },

  // ---- Date-range helpers ----
  fmt(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  filterByRange(shifts, startStr, endStr) {
    return shifts.filter(s => s.date >= startStr && s.date <= endStr);
  },

  // Returns {start, end, label} Date-strings for the period containing refDate.
  getPeriodRange(period, payConfig, refDate = new Date()) {
    if (period === "week") {
      const range = this.getWorkWeekRange(refDate);
      return { start: range.start, end: range.end, label: "This week (Sat\u2013Fri)" };
    }
    if (period === "payPeriod") {
      const anchor = this.getPayPeriodAnchor(payConfig);
      const lengthDays = Number(payConfig.payPeriodLengthDays) || 14;
      const msPerDay = 86400000;
      const diffDays = Math.floor((refDate - anchor) / msPerDay);
      const periodsElapsed = Math.floor(diffDays / lengthDays);
      const start = new Date(anchor.getTime() + periodsElapsed * lengthDays * msPerDay);
      const end = new Date(start.getTime() + (lengthDays - 1) * msPerDay);
      return { start: this.fmt(start), end: this.fmt(end), label: `Pay period (${lengthDays}d)` };
    }
    if (period === "ytd") {
      const start = new Date(refDate.getFullYear(), 0, 1);
      return { start: this.fmt(start), end: this.fmt(refDate), label: "Year to date" };
    }
    // default: month
    const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    return { start: this.fmt(start), end: this.fmt(end), label: "This month" };
  },

  summarizeForPeriod(shifts, payConfig, period, refDate = new Date()) {
    const range = this.getPeriodRange(period, payConfig, refDate);
    const filtered = this.filterByRange(shifts, range.start, range.end);
    return { ...this.summarize(filtered, payConfig), range };
  },

  summarizeEarnedVsScheduledForPeriod(shifts, logs, payConfig, period, refDate = new Date()) {
    const range = this.getPeriodRange(period, payConfig, refDate);
    const filteredShifts = this.filterByRange(shifts, range.start, range.end);
    const filteredLogs = this.filterByRange(logs, range.start, range.end);
    return { ...this.summarizeEarnedVsScheduled(filteredShifts, filteredLogs, payConfig), range };
  },

  // Month-by-month breakdown for a given year, used by the annual PDF.
  monthlyBreakdownForYear(shifts, payConfig, year) {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const start = this.fmt(new Date(year, m, 1));
      const end = this.fmt(new Date(year, m + 1, 0));
      const filtered = this.filterByRange(shifts, start, end);
      const s = this.summarize(filtered, payConfig);
      months.push({ month: new Date(year, m, 1).toLocaleDateString("en-CA", { month: "long" }), ...s });
    }
    return months;
  }
};
