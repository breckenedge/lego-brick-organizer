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

  // Create container types table (defines types of containers and their rules)
  db.exec(`
    CREATE TABLE IF NOT EXISTS container_types (
      type_name TEXT PRIMARY KEY,
      abbreviation_prefix TEXT NOT NULL,
      can_contain_parts INTEGER NOT NULL DEFAULT 0,
      description TEXT
    );
  `);

  // Create containers table (hierarchical storage containers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS containers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      container_id TEXT UNIQUE NOT NULL,
      container_type TEXT NOT NULL,
      parent_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES containers(id) ON DELETE CASCADE,
      FOREIGN KEY (container_type) REFERENCES container_types(type_name)
    );

    CREATE INDEX IF NOT EXISTS idx_containers_parent ON containers(parent_id);
    CREATE INDEX IF NOT EXISTS idx_containers_type ON containers(container_type);
  `);

  // Create container_parts table (maps parts to containers, replaces slots)
  db.exec(`
    CREATE TABLE IF NOT EXISTS container_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      container_id INTEGER NOT NULL,
      part_num TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
      FOREIGN KEY (part_num) REFERENCES parts(part_num) ON DELETE CASCADE,
      UNIQUE(container_id, part_num)
    );

    CREATE INDEX IF NOT EXISTS idx_container_parts_container ON container_parts(container_id);
    CREATE INDEX IF NOT EXISTS idx_container_parts_part ON container_parts(part_num);
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

  // Insert default container types if they don't exist
  const insertContainerType = db.prepare(`
    INSERT OR IGNORE INTO container_types (type_name, abbreviation_prefix, can_contain_parts, description)
    VALUES (?, ?, ?, ?)
  `);

  const defaultTypes = [
    ['Bookshelf', 'BS', 0, 'Large storage unit that contains other containers'],
    ['SmallPartsBin', 'SPB', 0, 'Small parts organizer bin that contains individual bins'],
    ['Bin', 'BIN', 1, 'Individual storage bin that can contain parts'],
    ['Drawer', 'DRW', 1, 'Drawer that can contain parts'],
    ['Box', 'BOX', 1, 'Box that can contain parts'],
    ['Shelf', 'SHF', 0, 'Shelf that contains other containers']
  ];

  for (const [type_name, prefix, can_contain, desc] of defaultTypes) {
    insertContainerType.run(type_name, prefix, can_contain, desc);
  }

  console.log('Database initialized successfully');
  return db;
}

module.exports = { initializeDatabase };
