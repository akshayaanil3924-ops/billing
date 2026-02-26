const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');

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

app.whenReady().then(() => {

 db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hsn_code TEXT,
    gst_percent REAL,
    purchase_price REAL,
    selling_price REAL,
    quantity INTEGER,
    low_stock_alert INTEGER
  )
`);

  // Migration: add low_stock_alert to existing databases that don't have it yet
  db.run(`ALTER TABLE products ADD COLUMN low_stock_alert INTEGER`, (err) => {
    // Ignore error — it just means the column already exists
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT,
      date TEXT,
      subtotal REAL,
      grand_total REAL
    )
  `);


   
 db.run(`
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    product_id INTEGER,
    hsn_code TEXT,
    quantity INTEGER,
    price REAL,
    gst_amount REAL
  )
`);
  createWindow();
});

const dbPath = path.join(__dirname, 'database.sqlite');

ipcMain.handle('backup-database', async () => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: 'backup.sqlite'
  });

  if (filePath) {
    fs.copyFileSync(dbPath, filePath);
    return "Backup Successful";
  }

  return "Backup Cancelled";
});

ipcMain.handle('restore-database', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile']
  });

  if (filePaths.length > 0) {
    fs.copyFileSync(filePaths[0], dbPath);
    return "Restore Successful. Restart App.";
  }

  return "Restore Cancelled";
});

// Save invoice as A5 landscape PDF (= half of A4)
ipcMain.handle('save-pdf', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: 'invoice.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) return { cancelled: true };

  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A5',    // A5 = exactly half of A4 — no custom dimensions needed
      landscape: true,   // landscape = 210mm wide x 148mm tall
      margins: { marginType: 'none' }
    });
    fs.writeFileSync(filePath, pdfData);
    return { success: true, filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
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