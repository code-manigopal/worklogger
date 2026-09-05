// ===========================================================
// Google Identity Services — token client requests a Drive
// access token directly in the browser. No server, no secret.
// ===========================================================
const Auth = {
  tokenClient: null,

  init() {
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: CONFIG.DRIVE_SCOPE,
      callback: (response) => this.handleTokenResponse(response)
    });

    document.getElementById("signInBtn").addEventListener("click", () => {
      this.tokenClient.requestAccessToken({ prompt: "consent" });
    });

    document.getElementById("signOutBtn").addEventListener("click", () => this.signOut());
  },

  async handleTokenResponse(response) {
    const errEl = document.getElementById("authError");
    if (response.error) {
      errEl.textContent = "Sign-in failed: " + response.error;
      errEl.hidden = false;
      return;
    }
    Drive.setToken(response.access_token);

    try {
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${response.access_token}` }
      });
      const profile = await profileRes.json();
      document.getElementById("userName").textContent = profile.name || profile.email || "";
      if (profile.picture) document.getElementById("userAvatar").src = profile.picture;
    } catch (e) {
      // Non-fatal — Drive access still works without the profile fetch.
    }

    document.getElementById("signinScreen").hidden = true;
    document.getElementById("app").hidden = false;
    await App.onSignedIn();
  },

  signOut() {
    if (Drive.state.accessToken) {
      google.accounts.oauth2.revoke(Drive.state.accessToken, () => {});
    }
    Drive.state.accessToken = null;
    document.getElementById("app").hidden = true;
    document.getElementById("signinScreen").hidden = false;
  }
};
