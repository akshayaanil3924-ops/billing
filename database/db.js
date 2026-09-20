const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// The main process sets DB_PATH before loading this module. Using it keeps the
// development and installed app pointed at the same database.
const dbPath = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database error:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

module.exports = db;
