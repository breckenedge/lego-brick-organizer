const Database = require('better-sqlite3');
const path = require('path');

function initializeDatabase(dbPath = './data/lego-parts.db') {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Create parts table (from Rebrickable data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS parts (
      part_num TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id INTEGER,
      material TEXT,
      part_img_url TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(name);
    CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category_id);
  `);

  // Create part categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS part_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  // Create bins table (physical storage containers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bins (
      bin_id TEXT PRIMARY KEY,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create slots table (locations within bins)
  db.exec(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bin_id TEXT NOT NULL,
      slot_number INTEGER NOT NULL,
      part_num TEXT,
      quantity INTEGER DEFAULT 0,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bin_id) REFERENCES bins(bin_id),
      FOREIGN KEY (part_num) REFERENCES parts(part_num),
      UNIQUE(bin_id, slot_number)
    );

    CREATE INDEX IF NOT EXISTS idx_slots_bin ON slots(bin_id);
    CREATE INDEX IF NOT EXISTS idx_slots_part ON slots(part_num);
  `);

  // Create table for cached SVG line drawings
  db.exec(`
    CREATE TABLE IF NOT EXISTS part_drawings (
      part_num TEXT PRIMARY KEY,
      svg_data TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (part_num) REFERENCES parts(part_num)
    );
  `);

  console.log('Database initialized successfully');
  return db;
}

module.exports = { initializeDatabase };
