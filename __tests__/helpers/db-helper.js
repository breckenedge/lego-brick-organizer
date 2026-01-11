const Database = require('better-sqlite3');
const { initializeDatabase } = require('../../database/schema');

/**
 * Create an in-memory test database
 * @returns {Database} SQLite database instance
 */
function createTestDatabase() {
  const db = new Database(':memory:');
  initializeDatabase(':memory:');
  return db;
}

/**
 * Close a database connection
 * @param {Database} db - Database instance to close
 */
function closeTestDatabase(db) {
  if (db && db.open) {
    db.close();
  }
}

module.exports = {
  createTestDatabase,
  closeTestDatabase
};
