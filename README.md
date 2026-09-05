# WLOG — Setup

A static site (no backend) that signs you in with Google and stores
everything — shifts, logs, photos — in a `WLOG` folder in your
own Google Drive. Built to be hosted on GitHub Pages.

## 1. Firebase setup (one-time, ~5 min)

WLOG signs in via **Firebase Authentication** (Google popup sign-in) —
the same pattern as SplitFree. This still runs on top of a Google
Cloud project, but Firebase manages the sign-in popup and OAuth
client for you, which is far more reliable than wiring one up by hand.

1. Go to https://console.firebase.google.com/ → **Add project**.
   - If you already created a Google Cloud project for WLOG, pick
     "Add Firebase to an existing Google Cloud project" and select
     it — this keeps the Drive API you already enabled.
2. Once the project is created: **Build → Authentication → Get started**.
3. **Sign-in method** tab → **Add new provider → Google → Enable → Save**.
4. **Authentication → Settings → Authorized domains** → **Add domain**
   → enter your GitHub Pages domain exactly, e.g.
   `code-manigopal.github.io` (domain only, no `https://`, no path).
5. Register a web app: **Project settings (gear icon) → General →
   Your apps → Add app → Web (</>together;)**. Name it WLOG, no need
   to set up Hosting. It'll show a `firebaseConfig` object — copy the
   whole thing.
6. Paste those values into `js/config.js` → `FIREBASE_CONFIG`
   (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`).
7. Make sure the **Google Drive API** is still enabled and your
   Walmart email is still on the **Test users** list under
   **APIs & Services → OAuth consent screen** in that same Google
   Cloud project — Firebase's Google sign-in still goes through that
   project's consent screen when requesting the Drive scope, so both
   of those still apply.
8. Because Drive access is a "sensitive" scope, Google will show an
   **"unverified app"** warning on first sign-in. That's expected for
   a personal-use app — click **Advanced → Go to WLOG (unsafe)** to
   continue. This is safe; it's your own app on your own project.

## 2. Deploy to GitHub Pages

1. Put this folder in a repo (or a subfolder of your existing
   `code-manigopal.github.io` repo, e.g. `/worklogger`).
2. Push it. If it's a project subfolder, it'll be live at
   `https://code-manigopal.github.io/worklogger/`.
3. Make sure that exact origin (scheme + host, path doesn't matter
   for "Authorized JavaScript origins") matches what you set in step 1.4.

## 3. First run

- Open the page, click **Sign in with Google**, approve the consent
  screen (it only asks for files *this app* creates — it can't see
  the rest of your Drive).
- On first sign-in it creates in your Drive:
  ```
  WLOG/
    shifts.csv
    work_log.csv
    config.json
    Photos/
  ```
- Open **⚙ (Pay settings)** and set your hourly rate and CPP/EI %
  before relying on the pay estimates. These are flat percentages
  you supply — check current rates at canada.ca; this isn't payroll
  advice.

## 4. Things you'll likely want to rename

- `js/config.js` → `CATEGORIES` — the two activity lists are in
  there as "Receiving & Sorting" / "Reset & Cleanup"; rename the
  keys/labels to whatever actually matches your shift types.
- `js/config.js` → `ROOT_FOLDER_NAME` if you want a different Drive
  folder name.
- `js/config.js` → `EMPLOYERS` — add a second name here if you ever
  pick up another part-time job; it shows as a dropdown on both
  Add Shift and Log Work.
- Pay Settings (⚙) → set your **pay period start date** once (any
  known start-of-period date, usually a Sunday) and its length in
  days (14 for biweekly). The "Pay period" summary toggle uses this
  to work out which window "today" falls into.

## 5. What's new since v1

- **Click any calendar day** to open its detail view: edit or delete
  individual shifts/logs, and view uploaded photos full-size.
- **View Logs** button — search and filter every log entry by
  category, date range, or free text.
- **Week / Pay period / Month** toggle above the calendar, plus an
  always-visible year-to-date line.
- **Annual Summary (Tax)** export — a month-by-month PDF breakdown
  for the current year, useful at tax time (still an estimate, not
  a T4).
- **Shift reminder banner** for today/tomorrow, with an optional
  browser notification if you grant permission.
- **Offline queue** — if a save fails (e.g. spotty signal at work),
  it's kept in the browser's local storage and retried automatically
  next time the app loads, or via the "Retry sync" button in the
  banner. Photo uploads aren't queued this way — if a photo upload
  fails, the whole Log Work save is stopped so you don't lose the
  notes silently; just retry once you're back online.
- **Dark mode** toggle (☾ icon, top right) — saved locally per browser.
- **Unpaid meal break** field on Add Shift — subtracted from paid
  hours everywhere (defaults to 30 min, editable per shift).

## Notes on scope and limits

- This is a fully client-side app — the OAuth token lives only in
  the browser tab and is never sent anywhere but Google's APIs.
- CSV files are read-modify-rewritten on each save. Fine at personal
  scale (hundreds of rows); if it ever grows large, worth switching
  to an append-only pattern.
- Bogle (Walmart's actual brand typeface) isn't licensed for open
  web embedding, so the UI uses Inter as a close, clean substitute.
