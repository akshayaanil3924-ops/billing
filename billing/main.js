const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const db   = require('./database/db');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile('index.html');
}

// Must match db.js: db.js lives in ./database/ so file = ./database/database.sqlite
const dbPath = path.join(__dirname, 'database', 'database.sqlite');

app.whenReady().then(() => {

  db.serialize(() => {

    // ── CREATE TABLES (all columns included for fresh installs) ──────────────

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        name             TEXT NOT NULL,
        brand            TEXT,
        category         TEXT,
        unit             TEXT,
        hsn_code         TEXT,
        gst_percent      REAL,
        purchase_price   REAL,
        selling_price    REAL,
        quantity         INTEGER,
        low_stock_alert  INTEGER,
        expiry_date      TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS invoices (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no        TEXT,
        date              TEXT,
        customer_name     TEXT,
        customer_phone    TEXT,
        customer_village  TEXT,
        customer_gstin    TEXT,
        subtotal          REAL,
        discount_amount   REAL,
        discount_type     TEXT,
        cgst_total        REAL,
        sgst_total        REAL,
        round_off         REAL,
        grand_total       REAL,
        payment_mode      TEXT,
        notes             TEXT,
        balance           REAL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id    INTEGER,
        product_id    INTEGER,
        product_name  TEXT,
        hsn_code      TEXT,
        unit          TEXT,
        quantity      INTEGER,
        price         REAL,
        cgst_percent  REAL,
        sgst_percent  REAL,
        gst_amount    REAL,
        total_amount  REAL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT NOT NULL,
        phone   TEXT,
        village TEXT,
        address TEXT,
        gstin   TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // ── MIGRATIONS (safely add missing columns to existing databases) ────────

    const migrations = [
      // products
      `ALTER TABLE products ADD COLUMN brand TEXT`,
      `ALTER TABLE products ADD COLUMN category TEXT`,
      `ALTER TABLE products ADD COLUMN unit TEXT`,
      `ALTER TABLE products ADD COLUMN low_stock_alert INTEGER`,
      `ALTER TABLE products ADD COLUMN expiry_date TEXT`,

      // invoices
      `ALTER TABLE invoices ADD COLUMN customer_name TEXT`,
      `ALTER TABLE invoices ADD COLUMN customer_phone TEXT`,
      `ALTER TABLE invoices ADD COLUMN customer_village TEXT`,
      `ALTER TABLE invoices ADD COLUMN customer_gstin TEXT`,
      `ALTER TABLE invoices ADD COLUMN discount_amount REAL`,
      `ALTER TABLE invoices ADD COLUMN discount_type TEXT`,
      `ALTER TABLE invoices ADD COLUMN cgst_total REAL`,
      `ALTER TABLE invoices ADD COLUMN sgst_total REAL`,
      `ALTER TABLE invoices ADD COLUMN round_off REAL`,
      `ALTER TABLE invoices ADD COLUMN payment_mode TEXT`,
      `ALTER TABLE invoices ADD COLUMN notes TEXT`,
      `ALTER TABLE invoices ADD COLUMN balance REAL`,

      // invoice_items
      `ALTER TABLE invoice_items ADD COLUMN product_name TEXT`,
      `ALTER TABLE invoice_items ADD COLUMN unit TEXT`,
      `ALTER TABLE invoice_items ADD COLUMN cgst_percent REAL`,
      `ALTER TABLE invoice_items ADD COLUMN sgst_percent REAL`,
      `ALTER TABLE invoice_items ADD COLUMN total_amount REAL`,
    ];

    migrations.forEach(sql => db.run(sql, () => {})); // errors = column exists = fine

    // ── TRIGGERS ─────────────────────────────────────────────────────────────

    db.run(`
      CREATE TRIGGER IF NOT EXISTS prevent_invoice_update
      BEFORE UPDATE ON invoices
      BEGIN
        SELECT RAISE(ABORT, 'Invoices cannot be modified');
      END;
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS prevent_invoice_delete
      BEFORE DELETE ON invoices
      BEGIN
        SELECT RAISE(ABORT, 'Invoices cannot be deleted');
      END;
    `);

    // ── Open window ONLY after all migrations are done ────────────────────────
    db.run(`SELECT 1`, () => createWindow());

  });
});

ipcMain.handle('backup-database', async () => {
  const { filePath } = await dialog.showSaveDialog({ defaultPath: 'backup.sqlite' });
  if (filePath) {
    fs.copyFileSync(dbPath, filePath);
    return 'Backup Successful';
  }
  return 'Backup Cancelled';
});

ipcMain.handle('restore-database', async () => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (filePaths.length > 0) {
    fs.copyFileSync(filePaths[0], dbPath);
    return 'Restore Successful. Restart App.';
  }
  return 'Restore Cancelled';
});