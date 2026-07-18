// Rhythm · Google Drive backup
// Talks to Drive straight from the browser with the drive.file scope,
// so Rhythm can only ever see the one backup file it created itself.

import { store } from './store.js';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'rhythm-backup.json';

let accessToken = null;
let tokenExpiry = 0;

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not reach Google. Are you online?'));
    document.head.append(s);
  });
}

async function getToken() {
  if (accessToken && Date.now() < tokenExpiry - 60_000) return accessToken;
  const clientId = store.state.settings.driveClientId;
  if (!clientId) throw new Error('Add your Google Client ID in Settings first.');
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) return reject(new Error('Google sign-in was cancelled.'));
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
        resolve(accessToken);
      },
    });
    client.requestAccessToken();
  });
}

async function api(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`https://www.googleapis.com${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`Drive said no (${res.status}). Try again.`);
  return res;
}

async function findBackupFile() {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const res = await api(`/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`);
  const data = await res.json();
  return data.files && data.files.length ? data.files[0] : null;
}

export async function driveBackup() {
  const existing = await findBackupFile();
  const content = store.exportJSON();

  if (existing) {
    await api(`/upload/drive/v3/files/${existing.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    });
  } else {
    const boundary = 'rhythm' + Date.now();
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }) + '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      content + '\r\n' +
      `--${boundary}--`;
    await api('/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
  }
}

export async function driveRestore() {
  const existing = await findBackupFile();
  if (!existing) throw new Error('No Rhythm backup found in your Drive yet.');
  const res = await api(`/drive/v3/files/${existing.id}?alt=media`);
  const text = await res.text();
  store.importJSON(text);
}
