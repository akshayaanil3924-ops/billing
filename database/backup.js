// backup.js — Database backup and Google Drive integration
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

let gDriveConfig = null;
let gDriveToken = null;

// ── Local Backups ──────────────────────────────────────────────
function runAutoBackup() {
  try {
    const dbPath = process.env.DB_PATH;
    if (!dbPath || !fs.existsSync(dbPath)) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.sqlite`);
    
    fs.copyFileSync(dbPath, backupPath);
    return { success: true, timestamp, path: backupPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function backupNow() {
  try {
    const result = runAutoBackup();
    return result || { success: false, error: 'No database found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getLastBackupInfo() {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
      .sort()
      .reverse();
    
    if (!files.length) return { success: false, data: null };
    
    const lastFile = files[0];
    const fullPath = path.join(backupDir, lastFile);
    const stats = fs.statSync(fullPath);
    
    return {
      success: true,
      data: {
        filename: lastFile,
        timestamp: stats.mtime.toISOString(),
        size: stats.size,
        path: fullPath
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getBackupList() {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
      .map(f => {
        const fullPath = path.join(backupDir, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          timestamp: stats.mtime.toISOString(),
          size: stats.size,
          path: fullPath
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return files;
  } catch (err) {
    console.error('Error listing backups:', err.message);
    return [];
  }
}

function restoreFrom(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }

    const dbPath = process.env.DB_PATH;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safetyBackup = path.join(backupDir, `before-restore-${timestamp}.sqlite`);

    // Create safety backup
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackup);
    }

    // Restore
    fs.copyFileSync(backupPath, dbPath);
    return {
      success: true,
      message: 'Database restored successfully',
      safetyBackup
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Google Drive Integration ───────────────────────────────────
function isGDriveConnected() {
  return !!gDriveToken;
}

function getLastCloudBackup() {
  if (!gDriveToken) return null;
  // Placeholder: would return last cloud backup metadata
  return null;
}

function saveGDriveConfig(clientId, clientSecret) {
  gDriveConfig = { clientId, clientSecret };
  // In production, save securely to settings
}

function getAuthUrl() {
  if (!gDriveConfig) return null;
  // Placeholder: would generate OAuth URL
  return null;
}

function exchangeCode(code) {
  // Placeholder: would exchange auth code for token
  return { success: false, error: 'GDrive not fully configured' };
}

function uploadToGDrive() {
  if (!isGDriveConnected()) {
    return Promise.resolve({ success: false, error: 'GDrive not connected' });
  }
  // Placeholder: would upload to Google Drive
  return Promise.resolve({ success: false, error: 'GDrive upload not implemented' });
}

// ── Exports ────────────────────────────────────────────────────
module.exports = {
  backupDir,
  runAutoBackup,
  backupNow,
  getLastBackupInfo,
  getBackupList,
  restoreFrom,
  isGDriveConnected,
  getLastCloudBackup,
  saveGDriveConfig,
  getAuthUrl,
  exchangeCode,
  uploadToGDrive
};
