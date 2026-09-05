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

  async init() {
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
    Drive.state.accessToken = null;
    document.getElementById("app").hidden = true;
    document.getElementById("signinScreen").hidden = false;
  }
};
