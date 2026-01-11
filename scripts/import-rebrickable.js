const fs = require('fs');
const path = require('path');
const https = require('https');
const { parse } = require('csv-parse');
const { initializeDatabase } = require('../database/schema');

/**
 * Import Rebrickable parts data into SQLite database
 * Downloads from: https://rebrickable.com/downloads/
 *
 * Required files:
 * - parts.csv.gz
 * - part_categories.csv.gz
 */

const REBRICKABLE_BASE_URL = 'https://cdn.rebrickable.com/media/downloads';
const DATA_DIR = './data/downloads';

async function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);

    const file = fs.createWriteStream(destination);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Downloaded to ${destination}`);
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded to ${destination}`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = fs.createReadStream(filePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
    );

    parser.on('data', (record) => {
      records.push(record);
    });

    parser.on('end', () => {
      resolve(records);
    });

    parser.on('error', reject);
  });
}

async function importPartCategories(db, records) {
  console.log(`Importing ${records.length} part categories...`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO part_categories (id, name)
    VALUES (?, ?)
  `);

  const insertMany = db.transaction((categories) => {
    for (const category of categories) {
      insert.run(category.id, category.name);
    }
  });

  insertMany(records);
  console.log('Part categories imported successfully');
}

async function importParts(db, records) {
  console.log(`Importing ${records.length} parts...`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO parts (part_num, name, category_id, material, part_img_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((parts) => {
    for (const part of parts) {
      insert.run(
        part.part_num,
        part.name,
        part.part_cat_id || null,
        part.part_material || null,
        part.part_img_url || null
      );
    }
  });

  insertMany(records);
  console.log('Parts imported successfully');
}

async function main() {
  try {
    // Create data directory
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Ensure database directory exists
    const dbDir = './data';
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database
    console.log('Initializing database...');
    const db = initializeDatabase();

    // Download files (commented out - user should download manually)
    console.log('\n=== MANUAL DOWNLOAD REQUIRED ===');
    console.log('Please download the following files from https://rebrickable.com/downloads/:');
    console.log('1. parts.csv (or parts.csv.gz)');
    console.log('2. part_categories.csv (or part_categories.csv.gz)');
    console.log(`Save them to: ${path.resolve(DATA_DIR)}`);
    console.log('\nIf you have .gz files, extract them first.');
    console.log('================================\n');

    // Check if files exist
    const partsFile = path.join(DATA_DIR, 'parts.csv');
    const categoriesFile = path.join(DATA_DIR, 'part_categories.csv');

    if (!fs.existsSync(categoriesFile)) {
      console.error(`File not found: ${categoriesFile}`);
      console.log('Please download part_categories.csv first.');
      return;
    }

    if (!fs.existsSync(partsFile)) {
      console.error(`File not found: ${partsFile}`);
      console.log('Please download parts.csv first.');
      return;
    }

    // Import part categories
    console.log('\nImporting part categories...');
    const categories = await parseCSV(categoriesFile);
    await importPartCategories(db, categories);

    // Import parts
    console.log('\nImporting parts...');
    const parts = await parseCSV(partsFile);
    await importParts(db, parts);

    // Show statistics
    const stats = db.prepare('SELECT COUNT(*) as count FROM parts').get();
    const categoryStats = db.prepare('SELECT COUNT(*) as count FROM part_categories').get();

    console.log('\n=== Import Complete ===');
    console.log(`Total parts: ${stats.count}`);
    console.log(`Total categories: ${categoryStats.count}`);
    console.log('=======================\n');

    db.close();
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { importParts, importPartCategories };
