// ===========================================================
// EDIT THIS FILE for your own setup.
// ===========================================================
const CONFIG = {
  // Firebase project config (Project Settings → General → Your apps → Web app).
  // Using Firebase Authentication instead of raw Google Identity Services —
  // same pattern as SplitFree — for a more reliable popup sign-in flow.
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyC0Vvm6H_xHg6XDF33xW0kzgQUOw7fk6VI",
    authDomain: "wlog-507616.firebaseapp.com",
    projectId: "wlog-507616",
    storageBucket: "wlog-507616.firebasestorage.app",
    messagingSenderId: "394825366106",
    appId: "1:394825366106:web:54888b1dd7a65178ca7663"
  },

  // Only requests access to files this app itself creates —
  // it can never see or touch the rest of your Drive. Requested
  // as an extra scope on top of Firebase's default sign-in.
  DRIVE_SCOPE: "https://www.googleapis.com/auth/drive.file",

  ROOT_FOLDER_NAME: "WLOG",
  PHOTOS_FOLDER_NAME: "Photos",
  SHIFTS_FILE_NAME: "shifts.csv",
  LOG_FILE_NAME: "work_log.csv",
  CONFIG_FILE_NAME: "config.json",

  SHIFTS_HEADER: ["id", "date", "start_time", "end_time", "break_minutes", "hours", "type", "employer", "created_at"],
  LOG_HEADER: ["id", "date", "hours_worked", "category", "activities", "notes", "photo_links", "employer", "logged_at"],

  // Unpaid meal break, subtracted from shift duration before any pay
  // calculation. Pre-filled in the Add Shift modal — override per shift.
  DEFAULT_BREAK_MINUTES: 30,

  // Add more names here if you ever pick up a second part-time job —
  // shows as a dropdown in Add Shift / Log Work.
  EMPLOYERS: ["Walmart"],

  // Rename these to match your actual task lists — shown as a
  // dropdown in Log Work, with checkboxes for the picked category.
  CATEGORIES: {
    receiving: {
      label: "Receiving & Sorting",
      items: ["Skid Sorting", "Stocking", "Binning", "Cardboards Disposal", "Zoning"]
    },
    reset: {
      label: "Reset & Cleanup",
      items: ["Purging", "Stocking", "Re-Binning", "Cardboards Disposal", "Zoning"]
    }
  },

  DEFAULT_PAY_CONFIG: {
    hourlyRate: 0,
    nightPremium: 0,
    cppRate: 0,
    eiRate: 0,
    otMultiplier: 1.5,
    // Start date (Sunday recommended) of any known pay period, used
    // to work out which 7/14-day window "today" falls into.
    payPeriodAnchor: "2026-01-04",
    payPeriodLengthDays: 14
  }
};
