// database/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('[DB] Failed to open:', err.message);
  else console.log('[DB] Connected to', dbPath);
});

module.exports = db;