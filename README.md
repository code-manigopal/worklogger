# WLOG — Setup

A static site (no backend) that signs you in with Google and stores
everything — shifts, logs, photos — in a `WLOG` folder in your
own Google Drive. Built to be hosted on GitHub Pages.

## 1. Google Cloud setup (one-time, ~5 min)

1. Go to https://console.cloud.google.com/ and create a new project
   (or reuse one).
2. **APIs & Services → Library** → search "Google Drive API" → **Enable**.
3. **APIs & Services → OAuth consent screen**:
   - User type: External (unless you have a Workspace org).
   - Fill in app name, your email, etc.
   - Scopes: add `.../auth/drive.file` (and `email`, `profile`, `openid`).
   - Add yourself as a test user if the app stays in "Testing" mode
     (fine for personal use — no need to publish it).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized JavaScript origins: add your GitHub Pages URL, e.g.
     `https://code-manigopal.github.io`
     (no path, no trailing slash).
   - No redirect URI needed — this uses the token-client flow.
5. Copy the generated **Client ID** into `js/config.js`:
   ```js
   GOOGLE_CLIENT_ID: "xxxxxxxx.apps.googleusercontent.com",
   ```

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
