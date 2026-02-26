// ─────────────────────────────────────────────
//  SMART DATABASE FIX — fixes ALL tables
//  Run from your project root:  node fix-database.js
// ─────────────────────────────────────────────

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

function findSqliteFiles(dir, depth = 0) {
  if (depth > 3) return [];
  let found = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        found = found.concat(findSqliteFiles(full, depth + 1));
      } else if (entry.isFile() && entry.name.endsWith('.sqlite')) {
        found.push(full);
      }
    }
  } catch {}
  return found;
}

const files = findSqliteFiles(__dirname);

if (files.length === 0) {
  console.error('❌ No .sqlite files found! Run this from your project root folder.');
  process.exit(1);
}

console.log(`\n🔍 Found ${files.length} database file(s):`);
files.forEach((f, i) => console.log(`  [${i + 1}] ${f}`));

// ── All missing columns per table
const migrations = [
  // products table
  { table: 'products',      name: 'brand',             type: 'TEXT'    },
  { table: 'products',      name: 'category',          type: 'TEXT'    },
  { table: 'products',      name: 'unit',              type: 'TEXT'    },
  { table: 'products',      name: 'low_stock_alert',   type: 'INTEGER' },
  { table: 'products',      name: 'expiry_date',       type: 'TEXT'    },

  // invoices table
  { table: 'invoices',      name: 'customer_name',     type: 'TEXT'    },
  { table: 'invoices',      name: 'customer_phone',    type: 'TEXT'    },
  { table: 'invoices',      name: 'customer_village',  type: 'TEXT'    },
  { table: 'invoices',      name: 'customer_gstin',    type: 'TEXT'    },
  { table: 'invoices',      name: 'discount_amount',   type: 'REAL'    },
  { table: 'invoices',      name: 'discount_type',     type: 'TEXT'    },
  { table: 'invoices',      name: 'cgst_total',        type: 'REAL'    },
  { table: 'invoices',      name: 'sgst_total',        type: 'REAL'    },
  { table: 'invoices',      name: 'round_off',         type: 'REAL'    },
  { table: 'invoices',      name: 'payment_mode',      type: 'TEXT'    },
  { table: 'invoices',      name: 'notes',             type: 'TEXT'    },
  { table: 'invoices',      name: 'balance',           type: 'REAL'    },

  // invoice_items table
  { table: 'invoice_items', name: 'product_name',      type: 'TEXT'    },
  { table: 'invoice_items', name: 'unit',              type: 'TEXT'    },
  { table: 'invoice_items', name: 'cgst_percent',      type: 'REAL'    },
  { table: 'invoice_items', name: 'sgst_percent',      type: 'REAL'    },
  { table: 'invoice_items', name: 'total_amount',      type: 'REAL'    },
];

files.forEach(dbFile => {
  console.log(`\n📂 Fixing: ${dbFile}`);
  const db = new sqlite3.Database(dbFile);

  db.serialize(() => {
    migrations.forEach(({ table, name, type }) => {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`, err => {
        if (!err) {
          console.log(`  ✅ [${table}] Added: ${name}`);
        } else if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
          console.log(`  ⚠️  [${table}] Already exists: ${name}`);
        } else if (err.message.includes('no such table')) {
          // table doesn't exist yet — will be created by app on next launch
        } else {
          console.log(`  ❌ [${table}] Error on ${name}: ${err.message}`);
        }
      });
    });

    // Print final column list for each table
    ['products', 'invoices', 'invoice_items'].forEach(table => {
      db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (!err && rows && rows.length) {
          console.log(`\n  📋 ${table}: ${rows.map(r => r.name).join(', ')}`);
        }
      });
    });

    db.run(`SELECT 1`, () => {
      db.close(() => console.log(`\n  ✔ Done: ${path.basename(dbFile)}`));
    });
  });
});

setTimeout(() => {
  console.log('\n🎉 All done! Restart your Electron app now.\n');
}, 2000);