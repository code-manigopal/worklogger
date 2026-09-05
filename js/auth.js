// ===========================================================
// Firebase Authentication — Google sign-in via a popup, the
// same pattern used in SplitFree. Far more reliable than a raw
// Google Identity Services token client: real error messages
// instead of a button that silently does nothing.
//
// Firebase modules are loaded with a dynamic import() inside a
// plain script (no <script type="module">), so everything else
// in the app (Drive, App, Calendar, etc.) stays exactly as-is.
// ===========================================================
const Auth = {
  auth: null,
  provider: null,
  _GoogleAuthProvider: null,
  _signInWithPopup: null,
  _signOut: null,

  // Google's Drive-scoped access token isn't persisted by Firebase itself
  // and expires after roughly an hour — cache it ourselves so a page
  // refresh doesn't force a fresh sign-in every single time.
  STORAGE_KEY: "wlog_session",

  saveSession(accessToken, user) {
    const session = {
      accessToken,
      expiresAt: Date.now() + 55 * 60 * 1000,
      name: user.displayName || user.email || "",
      photo: user.photoURL || ""
    };
    try { sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
  },

  loadSession() {
    try {
      const raw = sessionStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.accessToken || Date.now() >= session.expiresAt) {
        sessionStorage.removeItem(this.STORAGE_KEY);
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  },

  clearSession() {
    try { sessionStorage.removeItem(this.STORAGE_KEY); } catch (e) { /* ignore */ }
  },

  async init() {
    // Restore an existing session instantly, with no popup and no
    // waiting on Firebase to load, if one's cached and still valid.
    const session = this.loadSession();
    if (session) {
      Drive.setToken(session.accessToken);
      document.getElementById("userName").textContent = session.name;
      if (session.photo) document.getElementById("userAvatar").src = session.photo;
      document.getElementById("signinScreen").hidden = true;
      document.getElementById("app").hidden = false;
      App.onSignedIn();
    }

    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js");
    const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } =
      await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js");

    this._GoogleAuthProvider = GoogleAuthProvider;
    this._signInWithPopup = signInWithPopup;
    this._signOut = signOut;

    const fbApp = initializeApp(CONFIG.FIREBASE_CONFIG);
    this.auth = getAuth(fbApp);
    this.provider = new GoogleAuthProvider();
    // Extra scope on top of Firebase's default sign-in, so the same
    // popup also grants Drive access to files this app creates.
    this.provider.addScope(CONFIG.DRIVE_SCOPE);
    this.provider.setCustomParameters({ prompt: "consent" });

    document.getElementById("signInBtn").addEventListener("click", () => this.signIn());
    document.getElementById("signOutBtn").addEventListener("click", () => this.signOut());
  },

  async signIn() {
    const errEl = document.getElementById("authError");
    errEl.hidden = true;
    try {
      const result = await this._signInWithPopup(this.auth, this.provider);
      const credential = this._GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (!accessToken) {
        throw new Error("Signed in, but no Drive access token came back — try again.");
      }

      Drive.setToken(accessToken);
      const user = result.user;
      this.saveSession(accessToken, user);
      document.getElementById("userName").textContent = user.displayName || user.email || "";
      if (user.photoURL) document.getElementById("userAvatar").src = user.photoURL;

      document.getElementById("signinScreen").hidden = true;
      document.getElementById("app").hidden = false;
      await App.onSignedIn();
    } catch (err) {
      console.error(err);
      errEl.textContent = "Sign-in failed: " + (err.code || err.message);
      errEl.hidden = false;
    }
  },

  signOut() {
    if (this.auth) this._signOut(this.auth);
    this.clearSession();
    Drive.state.accessToken = null;
    document.getElementById("app").hidden = true;
    document.getElementById("signinScreen").hidden = false;
  }
};
