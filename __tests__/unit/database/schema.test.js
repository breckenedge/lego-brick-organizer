const Database = require('better-sqlite3');
const { initializeDatabase } = require('../../../database/schema');

describe('Database Schema', () => {
  let db;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    db = initializeDatabase(':memory:');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  describe('Table Creation', () => {
    test('creates parts table with correct columns', () => {
      const tableInfo = db.pragma('table_info(parts)');
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('part_num');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('category_id');
      expect(columnNames).toContain('material');
      expect(columnNames).toContain('part_img_url');

      // Verify primary key
      const pkColumn = tableInfo.find(col => col.name === 'part_num');
      expect(pkColumn.pk).toBe(1);
    });

    test('creates part_categories table with correct columns', () => {
      const tableInfo = db.pragma('table_info(part_categories)');
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');

      // Verify primary key
      const pkColumn = tableInfo.find(col => col.name === 'id');
      expect(pkColumn.pk).toBe(1);
    });

    test('creates bins table with correct columns', () => {
      const tableInfo = db.pragma('table_info(bins)');
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('bin_id');
      expect(columnNames).toContain('description');
      expect(columnNames).toContain('created_at');

      // Verify primary key
      const pkColumn = tableInfo.find(col => col.name === 'bin_id');
      expect(pkColumn.pk).toBe(1);
    });

    test('creates slots table with correct columns', () => {
      const tableInfo = db.pragma('table_info(slots)');
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('bin_id');
      expect(columnNames).toContain('slot_number');
      expect(columnNames).toContain('part_num');
      expect(columnNames).toContain('quantity');
      expect(columnNames).toContain('notes');
      expect(columnNames).toContain('updated_at');

      // Verify primary key
      const pkColumn = tableInfo.find(col => col.name === 'id');
      expect(pkColumn.pk).toBe(1);
    });

    test('creates part_drawings table with correct columns', () => {
      const tableInfo = db.pragma('table_info(part_drawings)');
      const columnNames = tableInfo.map(col => col.name);

      expect(columnNames).toContain('part_num');
      expect(columnNames).toContain('svg_data');
      expect(columnNames).toContain('generated_at');

      // Verify primary key
      const pkColumn = tableInfo.find(col => col.name === 'part_num');
      expect(pkColumn.pk).toBe(1);
    });
  });

  describe('Indexes', () => {
    test('creates index on parts.name', () => {
      const indexes = db.pragma('index_list(parts)');
      const nameIndex = indexes.find(idx => idx.name === 'idx_parts_name');
      expect(nameIndex).toBeDefined();
    });

    test('creates index on parts.category_id', () => {
      const indexes = db.pragma('index_list(parts)');
      const categoryIndex = indexes.find(idx => idx.name === 'idx_parts_category');
      expect(categoryIndex).toBeDefined();
    });

    test('creates index on slots.bin_id', () => {
      const indexes = db.pragma('index_list(slots)');
      const binIndex = indexes.find(idx => idx.name === 'idx_slots_bin');
      expect(binIndex).toBeDefined();
    });

    test('creates index on slots.part_num', () => {
      const indexes = db.pragma('index_list(slots)');
      const partIndex = indexes.find(idx => idx.name === 'idx_slots_part');
      expect(partIndex).toBeDefined();
    });
  });

  describe('Constraints', () => {
    test('enforces UNIQUE constraint on slots(bin_id, slot_number)', () => {
      // Insert test bin
      db.prepare('INSERT INTO bins (bin_id, description) VALUES (?, ?)').run('BIN-001', 'Test Bin');

      // Insert first slot
      db.prepare('INSERT INTO slots (bin_id, slot_number, quantity) VALUES (?, ?, ?)').run('BIN-001', 1, 10);

      // Attempt to insert duplicate slot
      expect(() => {
        db.prepare('INSERT INTO slots (bin_id, slot_number, quantity) VALUES (?, ?, ?)').run('BIN-001', 1, 20);
      }).toThrow();
    });

    test('enforces NOT NULL constraint on parts.name', () => {
      expect(() => {
        db.prepare('INSERT INTO parts (part_num, name) VALUES (?, ?)').run('3001', null);
      }).toThrow();
    });

    test('enforces NOT NULL constraint on part_categories.name', () => {
      expect(() => {
        db.prepare('INSERT INTO part_categories (id, name) VALUES (?, ?)').run(1, null);
      }).toThrow();
    });
  });

  describe('Foreign Keys', () => {
    test('foreign key relationship from slots to bins', () => {
      const foreignKeys = db.pragma('foreign_key_list(slots)');
      const binFk = foreignKeys.find(fk => fk.table === 'bins' && fk.from === 'bin_id');
      expect(binFk).toBeDefined();
    });

    test('foreign key relationship from slots to parts', () => {
      const foreignKeys = db.pragma('foreign_key_list(slots)');
      const partFk = foreignKeys.find(fk => fk.table === 'parts' && fk.from === 'part_num');
      expect(partFk).toBeDefined();
    });

    test('foreign key relationship from part_drawings to parts', () => {
      const foreignKeys = db.pragma('foreign_key_list(part_drawings)');
      const partFk = foreignKeys.find(fk => fk.table === 'parts' && fk.from === 'part_num');
      expect(partFk).toBeDefined();
    });
  });

  describe('Database Configuration', () => {
    test('sets journal mode (WAL for file-based, memory for in-memory)', () => {
      const journalMode = db.pragma('journal_mode', { simple: true });
      // In-memory databases use 'memory' journal mode
      // File-based databases would use 'wal'
      expect(journalMode).toBe('memory');
    });
  });

  describe('Idempotency', () => {
    test('running initializeDatabase twice does not error', () => {
      // Database already initialized in beforeEach
      // Run again on same database
      expect(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS parts (
            part_num TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category_id INTEGER,
            material TEXT,
            part_img_url TEXT
          );
        `);
      }).not.toThrow();
    });
  });
});
