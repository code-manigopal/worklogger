// ===========================================================
// Local downloads of the Drive-stored data — CSV as-is, and a
// formatted PDF report combining shifts + logs.
// ===========================================================
const Exporter = {
  downloadBlob(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },

  exportShiftsCsv() {
    const csv = CSVUtil.stringify(App.state.shifts, CONFIG.SHIFTS_HEADER);
    this.downloadBlob(`shifts-${this._timestamp()}.csv`, csv, "text/csv");
  },

  exportLogsCsv() {
    const csv = CSVUtil.stringify(App.state.logs, CONFIG.LOG_HEADER);
    this.downloadBlob(`work_log-${this._timestamp()}.csv`, csv, "text/csv");
  },

  exportPdf() {
    try {
      this._buildWorkReportPdf();
    } catch (e) {
      console.error(e);
      alert("PDF export failed: " + e.message + "\n\nCheck the browser console (F12) for details.");
    }
  },

  _buildWorkReportPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const summary = Pay.summarize(App.state.shifts, App.state.payConfig || CONFIG.DEFAULT_PAY_CONFIG);

    doc.setFontSize(16);
    doc.text("WLOG — Work Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleDateString("en-CA")}`, 14, 24);

    doc.setFontSize(11);
    doc.text(
      `Total hours: ${summary.totalHours.toFixed(1)}  |  Regular: ${summary.regularHours.toFixed(1)}  |  OT: ${summary.overtimeHours.toFixed(1)}`,
      14, 32
    );
    doc.text(
      `Est. gross: $${summary.grossPay.toFixed(2)} (incl. $${summary.nightPremiumPay.toFixed(2)} night premium)  |  Est. deductions: $${summary.deductions.toFixed(2)}  |  Est. net: $${summary.netPay.toFixed(2)}`,
      14, 38
    );

    doc.autoTable({
      startY: 46,
      head: [["Date", "Start", "End", "Type"]],
      body: App.state.shifts.map(s => [s.date || "", s.start_time || "", s.end_time || "", s.type || ""]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 113, 206] }
    });

    const afterShiftsY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("Work Log", 14, afterShiftsY);

    doc.autoTable({
      startY: afterShiftsY + 4,
      head: [["Date", "Hours", "Category", "Activities", "Notes"]],
      body: App.state.logs.map(l => [l.date || "", l.hours_worked || "", l.category || "", l.activities || "", l.notes || ""]),
      styles: { fontSize: 8, cellWidth: "wrap" },
      columnStyles: { 4: { cellWidth: 60 } },
      headStyles: { fillColor: [255, 194, 32], textColor: [4, 30, 66] }
    });

    doc.save(`work-report-${this._timestamp()}.pdf`);
  },

  _timestamp() {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  },

  exportAnnualPdf() {
    try {
      this._buildAnnualPdf();
    } catch (e) {
      console.error(e);
      alert("Annual PDF export failed: " + e.message + "\n\nCheck the browser console (F12) for details.");
    }
  },

  _buildAnnualPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const year = new Date().getFullYear();
    const payConfig = App.state.payConfig || CONFIG.DEFAULT_PAY_CONFIG;
    const months = Pay.monthlyBreakdownForYear(App.state.shifts, payConfig, year);
    const totals = months.reduce((acc, m) => ({
      totalHours: acc.totalHours + m.totalHours,
      regularHours: acc.regularHours + m.regularHours,
      overtimeHours: acc.overtimeHours + m.overtimeHours,
      grossPay: acc.grossPay + m.grossPay,
      deductions: acc.deductions + m.deductions,
      netPay: acc.netPay + m.netPay
    }), { totalHours: 0, regularHours: 0, overtimeHours: 0, grossPay: 0, deductions: 0, netPay: 0 });

    doc.setFontSize(16);
    doc.text(`WLOG — Annual Summary ${year}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleDateString("en-CA")} · estimates only, verify against actual pay stubs`, 14, 24);

    doc.autoTable({
      startY: 32,
      head: [["Month", "Reg. hrs", "OT hrs", "Gross", "Deductions", "Net"]],
      body: months.map(m => [
        m.month, m.regularHours.toFixed(1), m.overtimeHours.toFixed(1),
        "$" + m.grossPay.toFixed(2), "$" + m.deductions.toFixed(2), "$" + m.netPay.toFixed(2)
      ]),
      foot: [[
        "Total", totals.regularHours.toFixed(1), totals.overtimeHours.toFixed(1),
        "$" + totals.grossPay.toFixed(2), "$" + totals.deductions.toFixed(2), "$" + totals.netPay.toFixed(2)
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 113, 206] },
      footStyles: { fillColor: [255, 194, 32], textColor: [4, 30, 66], fontStyle: "bold" }
    });

    doc.save(`annual-summary-${year}-${this._timestamp()}.pdf`);
  }
};
