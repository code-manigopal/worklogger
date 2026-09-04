// ===========================================================
// All Google Drive REST calls live here. Nothing else in the
// app talks to Drive directly.
// ===========================================================
const Drive = {
  state: {
    accessToken: null,
    rootFolderId: null,
    photosFolderId: null,
    shiftsFileId: null,
    logFileId: null,
    configFileId: null
  },

  setToken(token) {
    this.state.accessToken = token;
  },

  async _fetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.state.accessToken}`,
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Drive API ${res.status}: ${body}`);
    }
    return res;
  },

  async findByName(name, parentId, mimeType) {
    const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`;
    const mimeClause = mimeType ? ` and mimeType='${mimeType}'` : "";
    const q = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and trashed=false and ${parentClause}${mimeClause}`);
    const res = await this._fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
    const data = await res.json();
    return data.files && data.files.length ? data.files[0] : null;
  },

  async createFolder(name, parentId) {
    const metadata = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined
    };
    const res = await this._fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata)
    });
    return res.json();
  },

  async ensureFolder(name, parentId) {
    const found = await this.findByName(name, parentId, "application/vnd.google-apps.folder");
    if (found) return found.id;
    const created = await this.createFolder(name, parentId);
    return created.id;
  },

  async createTextFile(name, parentId, content, mimeType) {
    const boundary = "worklogger-boundary";
    const metadata = { name, parents: parentId ? [parentId] : undefined, mimeType };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--`;
    const res = await this._fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body
      }
    );
    return res.json();
  },

  async ensureTextFile(name, parentId, initialContent, mimeType) {
    const found = await this.findByName(name, parentId);
    if (found) return found.id;
    const created = await this.createTextFile(name, parentId, initialContent, mimeType);
    return created.id;
  },

  async readFile(fileId) {
    const res = await this._fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    return res.text();
  },

  async updateTextFile(fileId, content, mimeType) {
    await this._fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": mimeType },
      body: content
    });
  },

  async uploadPhoto(parentId, file) {
    const boundary = "worklogger-photo-boundary";
    const metadata = { name: file.name, parents: [parentId] };
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binaryStr = "";
    for (let i = 0; i < bytes.length; i++) binaryStr += String.fromCharCode(bytes[i]);

    const pre =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${file.type || "image/jpeg"}\r\n\r\n`;
    const post = `\r\n--${boundary}--`;

    const preBytes = new TextEncoder().encode(pre);
    const postBytes = new TextEncoder().encode(post);
    const fullBody = new Uint8Array(preBytes.length + bytes.length + postBytes.length);
    fullBody.set(preBytes, 0);
    fullBody.set(bytes, preBytes.length);
    fullBody.set(postBytes, preBytes.length + bytes.length);

    const res = await this._fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: fullBody
      }
    );
    return res.json();
  },

  // ---- App-level setup ----
  async ensureStructure() {
    const s = this.state;
    s.rootFolderId = await this.ensureFolder(CONFIG.ROOT_FOLDER_NAME, null);
    s.photosFolderId = await this.ensureFolder(CONFIG.PHOTOS_FOLDER_NAME, s.rootFolderId);
    s.shiftsFileId = await this.ensureTextFile(
      CONFIG.SHIFTS_FILE_NAME, s.rootFolderId, CSVUtil.emptyWithHeader(CONFIG.SHIFTS_HEADER), "text/csv"
    );
    s.logFileId = await this.ensureTextFile(
      CONFIG.LOG_FILE_NAME, s.rootFolderId, CSVUtil.emptyWithHeader(CONFIG.LOG_HEADER), "text/csv"
    );
    s.configFileId = await this.ensureTextFile(
      CONFIG.CONFIG_FILE_NAME, s.rootFolderId, JSON.stringify(CONFIG.DEFAULT_PAY_CONFIG), "application/json"
    );
  },

  async loadShifts() {
    const text = await this.readFile(this.state.shiftsFileId);
    return CSVUtil.parse(text);
  },

  async loadLogs() {
    const text = await this.readFile(this.state.logFileId);
    return CSVUtil.parse(text);
  },

  async loadPayConfig() {
    const text = await this.readFile(this.state.configFileId);
    try { return JSON.parse(text); } catch { return { ...CONFIG.DEFAULT_PAY_CONFIG }; }
  },

  async savePayConfig(cfg) {
    await this.updateTextFile(this.state.configFileId, JSON.stringify(cfg), "application/json");
  },

  async appendShift(row) {
    const rows = await this.loadShifts();
    rows.push(row);
    await this.updateTextFile(this.state.shiftsFileId, CSVUtil.stringify(rows, CONFIG.SHIFTS_HEADER), "text/csv");
    return rows;
  },

  async appendLog(row) {
    const rows = await this.loadLogs();
    rows.push(row);
    await this.updateTextFile(this.state.logFileId, CSVUtil.stringify(rows, CONFIG.LOG_HEADER), "text/csv");
    return rows;
  },

  // Full rewrite — used for edits and deletes, where the whole
  // row set (minus/plus the changed row) needs to be persisted.
  async writeShiftsRows(rows) {
    await this.updateTextFile(this.state.shiftsFileId, CSVUtil.stringify(rows, CONFIG.SHIFTS_HEADER), "text/csv");
    return rows;
  },

  async writeLogsRows(rows) {
    await this.updateTextFile(this.state.logFileId, CSVUtil.stringify(rows, CONFIG.LOG_HEADER), "text/csv");
    return rows;
  },

  async ensureDateFolder(dateStr) {
    return this.ensureFolder(dateStr, this.state.photosFolderId);
  },

  // ---- Photo fetch for the lightbox ----
  _photoBlobCache: {},
  async getPhotoBlobUrl(fileId) {
    if (this._photoBlobCache[fileId]) return this._photoBlobCache[fileId];
    const res = await this._fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    this._photoBlobCache[fileId] = url;
    return url;
  }
};
