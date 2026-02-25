const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// DB sits in the same folder as main.js (project root)
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

module.exports = db;