// main.js — Electron main process (FIXED)
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

let mainWindow;
let lastAutoBackup = null;
const isDev = !app.isPackaged;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// ── DB path ───────────────────────────────────────────────────
const dbPath = isDev
  ? path.join(__dirname, 'database.sqlite')
  : path.join(app.getPath('userData'), 'database.sqlite');

if (!isDev && !fs.existsSync(dbPath)) {
  const bundled = path.join(process.resourcesPath, 'database.sqlite');
  if (fs.existsSync(bundled)) fs.copyFileSync(bundled, dbPath);
  else fs.writeFileSync(dbPath, '');
}

process.env.DB_PATH = dbPath;   // ← renderer reads this

const db     = require('./database/db');
const backup = require('./database/backup');

db.serialize(() => {
  db.run("PRAGMA journal_mode=WAL;");
  db.run("PRAGMA synchronous=FULL;");
});

// ── createWindow ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools(); // remove in production
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App Ready ─────────────────────────────────────────────────
app.whenReady().then(() => {

  try {
    lastAutoBackup = backup.runAutoBackup();
    if (lastAutoBackup && lastAutoBackup.success)
      console.log('[App] Auto backup:', lastAutoBackup.timestamp);
  } catch(e) { console.log('[App] Auto backup skipped:', e.message); }

  try {
    if (backup.isGDriveConnected()) {
      const last  = backup.getLastCloudBackup();
      const today = new Date().toISOString().slice(0, 10);
      const lastDate = last && last.timestamp
        ? new Date(last.timestamp).toISOString().slice(0, 10) : null;
      if (lastDate !== today)
        backup.uploadToGDrive()
          .then(r => { if (r.success) console.log('[App] Cloud backup done'); })
          .catch(e => console.log('[App] Cloud backup skipped:', e.message));
    }
  } catch(e) { console.log('[App] GDrive check skipped:', e.message); }

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, brand TEXT, category TEXT, hsn_code TEXT,
      gst_percent REAL, purchase_price REAL, selling_price REAL,
      quantity INTEGER, unit TEXT, low_stock_alert INTEGER, expiry_date TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT, date TEXT,
      customer_name TEXT, customer_phone TEXT, customer_village TEXT, customer_gstin TEXT,
      subtotal REAL, discount_amount REAL, discount_type TEXT,
      cgst_total REAL, sgst_total REAL, round_off REAL, grand_total REAL,
      payment_mode TEXT, notes TEXT, balance REAL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER, product_id INTEGER, product_name TEXT, hsn_code TEXT,
      unit TEXT, quantity INTEGER, price REAL,
      cgst_percent REAL, sgst_percent REAL, gst_amount REAL, total_amount REAL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS settings ( key TEXT PRIMARY KEY, value TEXT )`);
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT, village TEXT, address TEXT,
      gstin TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE TRIGGER IF NOT EXISTS prevent_invoice_update
      BEFORE UPDATE ON invoices BEGIN
      SELECT RAISE(ABORT,'Invoices cannot be modified'); END;`);
    db.run(`CREATE TRIGGER IF NOT EXISTS prevent_invoice_delete
      BEFORE DELETE ON invoices BEGIN
      SELECT RAISE(ABORT,'Invoices cannot be deleted'); END;`);
  });

  // ── IPC Handlers ────────────────────────────────────────────
  ipcMain.handle('get-db-path', () => dbPath);

  ipcMain.handle('backup-database', () => backup.backupNow());

  ipcMain.handle('get-last-backup-info', () => backup.getLastBackupInfo());

  ipcMain.handle('get-backup-list', () => {
    return { success: true, list: backup.getBackupList() };
  });

  ipcMain.handle('restore-database', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select backup to restore',
      defaultPath: backup.backupDir,
      filters: [{ name: 'SQLite', extensions: ['sqlite'] }],
      properties: ['openFile']
    });
    if (result.canceled) return { success: false, reason: 'Cancelled' };
    return backup.restoreFrom(result.filePaths[0]);
  });

  ipcMain.handle('restore-from-history', (_, fullPath) => backup.restoreFrom(fullPath));

  ipcMain.handle('open-backup-folder', () => {
    shell.openPath(backup.backupDir);
    return { success: true };
  });

  ipcMain.handle('gdrive-status', () => ({
    connected: backup.isGDriveConnected(),
    lastBackup: backup.getLastCloudBackup()
  }));

  ipcMain.handle('gdrive-save-config', (_, clientId, clientSecret) => {
    backup.saveGDriveConfig(clientId, clientSecret);
    return { success: true };
  });

  ipcMain.handle('gdrive-get-auth-url', () => {
    const url = backup.getAuthUrl();
    return { success: !!url, url };
  });

  ipcMain.handle('gdrive-exchange-code', (_, code) => backup.exchangeCode(code));

  ipcMain.handle('gdrive-backup-now', () => backup.uploadToGDrive());

  ipcMain.handle('gdrive-disconnect', () => {
    backup.disconnectGDrive();
    return { success: true };
  });
  
  ipcMain.handle('save-pdf', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Invoice as PDF',
        defaultPath: path.join(app.getPath('documents'), 'invoice.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (result.canceled) return { success: false, reason: 'Cancelled' };
      await mainWindow.webContents.printToPDF({}).then(data => {
        fs.writeFileSync(result.filePath, data);
      });
      return { success: true, path: result.filePath };
    } catch(e) { return { success: false, reason: e.message }; }
  });
  ipcMain.on('get-db-path-sync', (event) => {
  event.returnValue = dbPath;
});

  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });