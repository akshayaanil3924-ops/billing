// database/backup.js
const fs   = require('fs');
const path = require('path');
const { app } = require('electron');

const dbPath    = process.env.DB_PATH;
const backupDir = path.join(app.getPath('userData'), 'backups');
const cfgPath   = path.join(app.getPath('userData'), 'gdrive-config.json');
const cloudPath = path.join(app.getPath('userData'), 'last-cloud-backup.json');

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function getBackupList() {
  try {
    return fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.sqlite'))
      .sort().reverse()
      .map(f => {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        const sizeKB = (stat.size / 1024).toFixed(1) + ' KB';
        const createdAt = stat.mtime.toLocaleString('en-IN');
        const isAuto   = f.startsWith('backup-');
        const isSafety = f.startsWith('safety-');
        return { name: f, fullPath, createdAt, size: sizeKB, isAuto, isSafety };
      });
  } catch { return []; }
}
function runAutoBackup() {
  try {
    if (!fs.existsSync(dbPath)) return { success: false };
    const dest = path.join(backupDir, `backup-${ts()}.sqlite`);
    fs.copyFileSync(dbPath, dest);
    // Keep only 30 most recent
    getBackupList().slice(30).forEach(b => { try { fs.unlinkSync(b.fullPath); } catch {} });
    return { success: true, timestamp: new Date().toISOString() };
  } catch (e) { return { success: false, reason: e.message }; }
}

function backupNow()         { return runAutoBackup(); }
function getLastBackupInfo() { const l = getBackupList(); return l[0] || null; }

function restoreFrom(src) {
  try { fs.copyFileSync(src, dbPath); return { success: true }; }
  catch (e) { return { success: false, reason: e.message }; }
}

function isGDriveConnected() {
  try { const c = JSON.parse(fs.readFileSync(cfgPath,'utf8')); return !!(c && c.access_token); }
  catch { return false; }
}
function getGDriveConfig() {
  try { return JSON.parse(fs.readFileSync(cfgPath,'utf8')); } catch { return null; }
}
function saveGDriveConfig(id, secret) {
  const c = getGDriveConfig() || {};
  fs.writeFileSync(cfgPath, JSON.stringify({ ...c, client_id: id, client_secret: secret }, null, 2));
}
function getAuthUrl() {
  const c = getGDriveConfig();
  if (!c || !c.client_id) return null;
  const p = new URLSearchParams({ client_id: c.client_id, redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    response_type: 'code', scope: 'https://www.googleapis.com/auth/drive.file', access_type: 'offline' });
  return `https://accounts.google.com/o/oauth2/auth?${p}`;
}
async function exchangeCode(code) {
  const c = getGDriveConfig();
  if (!c) return { success: false, reason: 'No config' };
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', { method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams({ code, client_id: c.client_id, client_secret: c.client_secret,
        redirect_uri:'urn:ietf:wg:oauth:2.0:oob', grant_type:'authorization_code' }) });
    const d = await r.json();
    if (d.error) return { success: false, reason: d.error_description };
    fs.writeFileSync(cfgPath, JSON.stringify({ ...c, ...d }, null, 2));
    return { success: true };
  } catch(e) { return { success: false, reason: e.message }; }
}
async function uploadToGDrive() {
  if (!isGDriveConnected()) return { success: false, reason: 'Not connected' };
  try {
    const c = getGDriveConfig();
    const fileData = fs.readFileSync(dbPath);
    const meta = JSON.stringify({ name: 'fertilizer-backup.sqlite' });
    const b = '---boundary123';
    const body = Buffer.concat([
      Buffer.from(`--${b}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${b}\r\nContent-Type: application/octet-stream\r\n\r\n`),
      fileData, Buffer.from(`\r\n--${b}--`)]);
    const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method:'POST', headers:{ Authorization:`Bearer ${c.access_token}`,
        'Content-Type':`multipart/related; boundary="${b}"` }, body });
    if (!r.ok) return { success: false, reason: 'HTTP ' + r.status };
    const info = { timestamp: new Date().toISOString() };
    fs.writeFileSync(cloudPath, JSON.stringify(info));
    return { success: true };
  } catch(e) { return { success: false, reason: e.message }; }
}
function getLastCloudBackup() {
  try { return JSON.parse(fs.readFileSync(cloudPath,'utf8')); } catch { return null; }
}
function disconnectGDrive() {
  [cfgPath, cloudPath].forEach(p => { try { if(fs.existsSync(p)) fs.unlinkSync(p); } catch{} });
}

module.exports = { runAutoBackup, backupNow, getLastBackupInfo, getBackupList, backupDir,
  restoreFrom, isGDriveConnected, saveGDriveConfig, getAuthUrl, exchangeCode,
  uploadToGDrive, getLastCloudBackup, disconnectGDrive };