// ===========================================================
// Pay estimation + period math. Flat-percentage CPP/EI you
// configure yourself — this is an estimate for personal
// tracking, not payroll advice. Verify actual rates and rules
// at canada.ca before relying on this.
// ===========================================================
const Pay = {
  hoursForShift(shift) {
    const [sh, sm] = shift.start_time.split(":").map(Number);
    const [eh, em] = shift.end_time.split(":").map(Number);
    let start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += 24 * 60; // overnight shift
    const breakMinutes = Number(shift.break_minutes) || 0;
    const paidMinutes = Math.max(0, (end - start) - breakMinutes);
    return paidMinutes / 60;
  },

  summarize(shifts, payConfig) {
    let regularHours = 0, overtimeHours = 0;
    for (const s of shifts) {
      const hrs = this.hoursForShift(s);
      if (s.type === "Overtime") overtimeHours += hrs;
      else regularHours += hrs;
    }
    const rate = Number(payConfig.hourlyRate) || 0;
    const otMult = Number(payConfig.otMultiplier) || 1.5;
    const regularPay = regularHours * rate;
    const overtimePay = overtimeHours * rate * otMult;
    const grossPay = regularPay + overtimePay;
    const deductionRate = ((Number(payConfig.cppRate) || 0) + (Number(payConfig.eiRate) || 0)) / 100;
    const deductions = grossPay * deductionRate;
    const netPay = grossPay - deductions;
    return {
      totalHours: regularHours + overtimeHours,
      regularHours, overtimeHours, regularPay, overtimePay, grossPay, deductions, netPay
    };
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
      const day = refDate.getDay();
      const start = new Date(refDate); start.setDate(refDate.getDate() - day);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { start: this.fmt(start), end: this.fmt(end), label: "This week" };
    }
    if (period === "payPeriod") {
      const anchor = new Date(payConfig.payPeriodAnchor + "T00:00:00");
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
