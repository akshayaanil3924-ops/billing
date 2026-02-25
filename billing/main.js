const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// DB path: userData in packaged .exe, __dirname in dev
const dbDir = app.isPackaged ? app.getPath('userData') : __dirname;
const dbPath = path.join(dbDir, 'database.sqlite');

function ensureDb() {
  if (app.isPackaged && !fs.existsSync(dbPath)) {
    const seedDb = path.join(process.resourcesPath, 'database.sqlite');
    if (fs.existsSync(seedDb)) fs.copyFileSync(seedDb, dbPath);
  }
}

const sqlite3 = require('sqlite3').verbose();
let db;

function initDb() {
  ensureDb();
  db = new sqlite3.Database(dbPath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360, height: 840, minWidth: 1100, minHeight: 700,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'Fertilizer Billing'
  });
  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
}

function safeAlter(sql) { db.run(sql, () => {}); }

function initDBSchema() {
  db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, brand TEXT, category TEXT, unit TEXT DEFAULT 'kg',
      hsn_code TEXT, gst_percent REAL DEFAULT 0,
      purchase_price REAL NOT NULL, selling_price REAL NOT NULL,
      quantity REAL DEFAULT 0, low_stock_limit INTEGER DEFAULT 10,
      expiry_date TEXT, created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, phone TEXT, village TEXT, address TEXT,
      gstin TEXT, state TEXT,
      total_due REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE,
      date TEXT DEFAULT (datetime('now','localtime')),
      customer_id INTEGER, customer_name TEXT, customer_phone TEXT,
      customer_village TEXT, customer_gstin TEXT, customer_state TEXT,
      place_of_supply TEXT, is_igst INTEGER DEFAULT 0, reference_no TEXT,
      subtotal REAL, discount REAL DEFAULT 0, tax_total REAL DEFAULT 0,
      cgst REAL DEFAULT 0, sgst REAL DEFAULT 0, igst REAL DEFAULT 0,
      round_off REAL DEFAULT 0, grand_total REAL,
      payment_mode TEXT DEFAULT 'Cash',
      amount_paid REAL DEFAULT 0, balance_due REAL DEFAULT 0, notes TEXT,
      irn TEXT, ack_no TEXT, ack_date TEXT,
      ewb_number TEXT, ewb_generated_at TEXT, ewb_valid_until TEXT,
      ewb_transporter TEXT, ewb_transporter_gstin TEXT, ewb_vehicle TEXT,
      ewb_distance REAL, ewb_supply_type TEXT, ewb_transport_mode TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER, product_id INTEGER,
      product_name TEXT, hsn_code TEXT, unit TEXT,
      quantity REAL, price REAL, gst_percent REAL DEFAULT 0,
      gst_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0, sgst_amount REAL DEFAULT 0, igst_amount REAL DEFAULT 0,
      line_total REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER, invoice_id INTEGER,
      amount REAL, mode TEXT DEFAULT 'Cash',
      date TEXT DEFAULT (datetime('now','localtime')), note TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

    // Migrations — safe, silently ignored if column exists
    safeAlter('ALTER TABLE products ADD COLUMN brand TEXT');
    safeAlter('ALTER TABLE products ADD COLUMN category TEXT');
    safeAlter('ALTER TABLE products ADD COLUMN unit TEXT');
    safeAlter('ALTER TABLE products ADD COLUMN low_stock_limit INTEGER DEFAULT 10');
    safeAlter('ALTER TABLE products ADD COLUMN expiry_date TEXT');
    safeAlter('ALTER TABLE products ADD COLUMN created_at TEXT');
    safeAlter('ALTER TABLE customers ADD COLUMN gstin TEXT');
    safeAlter('ALTER TABLE customers ADD COLUMN state TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN customer_id INTEGER');
    safeAlter('ALTER TABLE invoices ADD COLUMN customer_name TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN customer_phone TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN customer_village TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN customer_gstin TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN customer_state TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN place_of_supply TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN is_igst INTEGER DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN reference_no TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN discount REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN tax_total REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN cgst REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN sgst REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN igst REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN round_off REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN payment_mode TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN amount_paid REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN balance_due REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoices ADD COLUMN notes TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN irn TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ack_no TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ack_date TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_number TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_generated_at TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_valid_until TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_transporter TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_transporter_gstin TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_vehicle TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_distance REAL');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_supply_type TEXT');
    safeAlter('ALTER TABLE invoices ADD COLUMN ewb_transport_mode TEXT');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN product_name TEXT');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN hsn_code TEXT');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN unit TEXT');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN gst_percent REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN gst_amount REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN cgst_amount REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN sgst_amount REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN igst_amount REAL DEFAULT 0');
    safeAlter('ALTER TABLE invoice_items ADD COLUMN line_total REAL');

    // Default settings
    const defaults = [
      ['shop_name','My Fertilizer Shop'],['shop_address','Shop Address, City, PIN'],
      ['shop_phone',''],['shop_email',''],['shop_gstin',''],['shop_pan',''],
      ['shop_state','Kerala'],['shop_state_code','32'],
      ['shop_declaration','We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.'],
      ['bank_holder',''],['bank_name',''],['bank_account',''],['bank_ifsc',''],['bank_branch',''],
      ['low_stock_default','10'],['invoice_prefix','INV'],
      ['ewb_username',''],['ewb_password',''],['ewb_client_id',''],['ewb_client_secret',''],
      ['ewb_api_url','https://api.mastersindia.co/mastersindia/v1']
    ];
    defaults.forEach(([k,v]) => db.run('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)',[k,v]));
  });
}

app.whenReady().then(() => { initDb(); initDBSchema(); createWindow(); });
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });

// IPC: Backup
ipcMain.handle('backup-database', async () => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Backup',
    defaultPath: `fertilizer_backup_${new Date().toISOString().split('T')[0]}.sqlite`,
    filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
  });
  if(!filePath) return { success:false, message:'Backup cancelled' };
  fs.copyFileSync(dbPath, filePath);
  return { success:true, message:`✅ Backup saved to: ${filePath}` };
});

// IPC: Restore
ipcMain.handle('restore-database', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Select Backup File', properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
  });
  if(!filePaths||!filePaths.length) return { success:false, message:'Restore cancelled' };
  fs.copyFileSync(filePaths[0], dbPath);
  return { success:true, message:'✅ Restore successful. Reloading...' };
});

// IPC: Print
ipcMain.handle('print-invoice', async (event, html) => {
  const win = new BrowserWindow({ show:false, webPreferences:{ nodeIntegration:false } });
  const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:10px;}@media print{body{margin:0;}}</style></head><body>${html}</body></html>`;
  win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(full));
  win.webContents.on('did-finish-load', () => {
    win.webContents.print({ silent:false, printBackground:true }, () => win.close());
  });
  return { success:true };
});

// IPC: PDF
ipcMain.handle('download-invoice-pdf', async (event, html, invoiceNo) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Invoice PDF', defaultPath: `${invoiceNo}.pdf`,
    filters: [{ name:'PDF Document', extensions:['pdf'] }]
  });
  if(!filePath) return { success:false, message:'Cancelled' };
  return new Promise((resolve) => {
    const pdfWin = new BrowserWindow({ show:false, webPreferences:{ nodeIntegration:false } });
    const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:8px;font-size:12px;}@media print{body{margin:0;}}</style></head><body>${html}</body></html>`;
    pdfWin.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(full));
    pdfWin.webContents.on('did-finish-load', async () => {
      try {
        const pdfData = await pdfWin.webContents.printToPDF({
          printBackground:true, pageSize:'A4',
          margins:{ top:0.3, bottom:0.3, left:0.3, right:0.3 }
        });
        fs.writeFileSync(filePath, pdfData);
        pdfWin.close();
        resolve({ success:true, path:filePath });
      } catch(err) {
        pdfWin.close();
        resolve({ success:false, message:err.message });
      }
    });
  });
});

// IPC: Get DB path (renderer uses this instead of electron.remote which is removed)
ipcMain.handle('get-db-path', () => dbPath);