// ===========================================================
// Dark mode — preference stored in localStorage, applied via a
// data-theme attribute that the CSS overrides.
// ===========================================================
const Theme = {
  KEY: "worklogger_theme",

  init() {
    const saved = localStorage.getItem(this.KEY) || "light";
    this.apply(saved);
    document.getElementById("themeToggleBtn").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      this.apply(current === "light" ? "dark" : "light");
    });
  },

  apply(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem(this.KEY, mode);
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.textContent = mode === "dark" ? "☀" : "☾";
  }
};
