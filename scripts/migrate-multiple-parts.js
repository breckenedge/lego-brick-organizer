#!/usr/bin/env node

/**
 * Migration script: Enable multiple parts per slot
 *
 * This script migrates the database schema to support multiple LEGO parts
 * being stored in a single slot. It creates a new slot_parts table and
 * migrates existing data.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || './data/lego-parts.db';

console.log('===========================================');
console.log('Migration: Multiple Parts Per Slot');
console.log('===========================================\n');

try {
  const db = new Database(dbPath);
  console.log(`Connected to database: ${dbPath}`);

  // Start transaction
  db.exec('BEGIN TRANSACTION');

  console.log('\n1. Creating new slot_parts table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS slot_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL,
      part_num TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      notes TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE,
      FOREIGN KEY (part_num) REFERENCES parts(part_num),
      UNIQUE(slot_id, part_num)
    );
  `);
  console.log('   ✓ slot_parts table created');

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_slot_parts_slot ON slot_parts(slot_id);
    CREATE INDEX IF NOT EXISTS idx_slot_parts_part ON slot_parts(part_num);
  `);
  console.log('   ✓ Indexes created');

  // Check if we need to migrate data
  const hasOldColumns = db.prepare(`
    SELECT COUNT(*) as count
    FROM pragma_table_info('slots')
    WHERE name IN ('part_num', 'quantity', 'notes')
  `).get().count;

  if (hasOldColumns > 0) {
    console.log('\n2. Migrating existing data...');

    // Migrate existing slot assignments to the new table
    const existingSlots = db.prepare(`
      SELECT id, part_num, quantity, notes
      FROM slots
      WHERE part_num IS NOT NULL
    `).all();

    if (existingSlots.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO slot_parts (slot_id, part_num, quantity, notes)
        VALUES (?, ?, ?, ?)
      `);

      for (const slot of existingSlots) {
        insertStmt.run(slot.id, slot.part_num, slot.quantity || 0, slot.notes);
      }

      console.log(`   ✓ Migrated ${existingSlots.length} part assignments`);
    } else {
      console.log('   ✓ No existing data to migrate');
    }

    console.log('\n3. Restructuring slots table...');

    // Create new slots table without part-specific columns
    db.exec(`
      CREATE TABLE slots_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bin_id TEXT NOT NULL,
        slot_number INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bin_id) REFERENCES bins(bin_id),
        UNIQUE(bin_id, slot_number)
      );
    `);

    // Copy data to new table
    db.exec(`
      INSERT INTO slots_new (id, bin_id, slot_number, updated_at)
      SELECT id, bin_id, slot_number, updated_at
      FROM slots;
    `);

    // Drop old table and rename new one
    db.exec('DROP TABLE slots');
    db.exec('ALTER TABLE slots_new RENAME TO slots');

    // Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_slots_bin ON slots(bin_id);
    `);

    console.log('   ✓ Slots table restructured');
  } else {
    console.log('\n2. Schema already migrated (skipping data migration)');
  }

  // Commit transaction
  db.exec('COMMIT');

  console.log('\n===========================================');
  console.log('Migration completed successfully!');
  console.log('===========================================\n');

  db.close();
  process.exit(0);

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error('\nRolling back changes...');

  try {
    const db = new Database(dbPath);
    db.exec('ROLLBACK');
    db.close();
    console.log('Rollback complete.');
  } catch (rollbackError) {
    console.error('Rollback failed:', rollbackError.message);
  }

  process.exit(1);
}
