const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./database/schema');
const LDrawParser = require('./lib/ldraw-parser');
const SVGGenerator = require('./lib/svg-generator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize database
let db;
try {
  db = initializeDatabase();
  console.log('Database initialized');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Initialize LDraw parser
const ldrawParser = new LDrawParser('./data/ldraw');
const svgGenerator = new SVGGenerator();

// ============================================================================
// API ROUTES
// ============================================================================

// Search parts by name or part number
app.get('/api/parts/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (!query) {
      return res.json({ parts: [], total: 0 });
    }

    // Search by part number or name
    const searchPattern = `%${query}%`;
    const stmt = db.prepare(`
      SELECT
        p.part_num,
        p.name,
        p.category_id,
        pc.name as category_name,
        p.part_img_url,
        s.bin_id,
        s.slot_number,
        s.quantity
      FROM parts p
      LEFT JOIN part_categories pc ON p.category_id = pc.id
      LEFT JOIN slots s ON p.part_num = s.part_num
      WHERE p.part_num LIKE ? OR p.name LIKE ?
      ORDER BY (s.bin_id IS NOT NULL) DESC, p.part_num
      LIMIT ? OFFSET ?
    `);

    const parts = stmt.all(searchPattern, searchPattern, limit, offset);

    // Get total count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM parts
      WHERE part_num LIKE ? OR name LIKE ?
    `);
    const { total } = countStmt.get(searchPattern, searchPattern);

    res.json({ parts, total, query, limit, offset });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get part by part number
app.get('/api/parts/:partNum', (req, res) => {
  try {
    const { partNum } = req.params;

    const stmt = db.prepare(`
      SELECT
        p.part_num,
        p.name,
        p.category_id,
        pc.name as category_name,
        p.material,
        p.part_img_url
      FROM parts p
      LEFT JOIN part_categories pc ON p.category_id = pc.id
      WHERE p.part_num = ?
    `);

    const part = stmt.get(partNum);

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    // Get all locations for this part
    const locationsStmt = db.prepare(`
      SELECT bin_id, slot_number, quantity, notes
      FROM slots
      WHERE part_num = ?
      ORDER BY bin_id, slot_number
    `);

    part.locations = locationsStmt.all(partNum);

    res.json(part);
  } catch (error) {
    console.error('Get part error:', error);
    res.status(500).json({ error: 'Failed to retrieve part' });
  }
});

// Get or generate SVG drawing for a part
app.get('/api/parts/:partNum/drawing', (req, res) => {
  try {
    const { partNum } = req.params;

    // Check if we have a cached drawing
    const cached = db.prepare(`
      SELECT svg_data FROM part_drawings WHERE part_num = ?
    `).get(partNum);

    if (cached) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(cached.svg_data);
    }

    // Generate new drawing from LDraw file
    try {
      const parsed = ldrawParser.parsePartRecursive(`${partNum}.dat`);
      const svg = svgGenerator.generateSVG(parsed.edges);

      // Cache the SVG
      db.prepare(`
        INSERT OR REPLACE INTO part_drawings (part_num, svg_data)
        VALUES (?, ?)
      `).run(partNum, svg);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch (ldrawError) {
      console.warn(`LDraw file not found for ${partNum}, using placeholder`);

      // Generate placeholder SVG
      const svg = svgGenerator.generateEmptySVG();
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    }
  } catch (error) {
    console.error('Drawing generation error:', error);
    res.status(500).json({ error: 'Failed to generate drawing' });
  }
});

// List all bins
app.get('/api/bins', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT
        b.bin_id,
        b.description,
        b.created_at,
        COUNT(s.id) as slot_count,
        SUM(CASE WHEN s.part_num IS NOT NULL THEN 1 ELSE 0 END) as filled_slots
      FROM bins b
      LEFT JOIN slots s ON b.bin_id = s.bin_id
      GROUP BY b.bin_id
      ORDER BY b.bin_id
    `);

    const bins = stmt.all();
    res.json({ bins });
  } catch (error) {
    console.error('Get bins error:', error);
    res.status(500).json({ error: 'Failed to retrieve bins' });
  }
});

// Get bin details with all slots
app.get('/api/bins/:binId', (req, res) => {
  try {
    const { binId } = req.params;

    const binStmt = db.prepare(`
      SELECT * FROM bins WHERE bin_id = ?
    `);

    const bin = binStmt.get(binId);

    if (!bin) {
      return res.status(404).json({ error: 'Bin not found' });
    }

    // Get all slots in this bin
    const slotsStmt = db.prepare(`
      SELECT
        s.id,
        s.slot_number,
        s.part_num,
        p.name as part_name,
        s.quantity,
        s.notes,
        s.updated_at
      FROM slots s
      LEFT JOIN parts p ON s.part_num = p.part_num
      WHERE s.bin_id = ?
      ORDER BY s.slot_number
    `);

    bin.slots = slotsStmt.all(binId);

    res.json(bin);
  } catch (error) {
    console.error('Get bin error:', error);
    res.status(500).json({ error: 'Failed to retrieve bin' });
  }
});

// Create a new bin
app.post('/api/bins', (req, res) => {
  try {
    const { bin_id, description } = req.body;

    if (!bin_id) {
      return res.status(400).json({ error: 'bin_id is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO bins (bin_id, description)
      VALUES (?, ?)
    `);

    stmt.run(bin_id, description || '');

    res.json({ success: true, bin_id });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Bin ID already exists' });
    }
    console.error('Create bin error:', error);
    res.status(500).json({ error: 'Failed to create bin' });
  }
});

// Assign part to a slot
app.post('/api/slots', (req, res) => {
  try {
    const { bin_id, slot_number, part_num, quantity, notes } = req.body;

    if (!bin_id || slot_number === undefined) {
      return res.status(400).json({ error: 'bin_id and slot_number are required' });
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO slots (bin_id, slot_number, part_num, quantity, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      bin_id,
      slot_number,
      part_num || null,
      quantity || 0,
      notes || null
    );

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Assign slot error:', error);
    res.status(500).json({ error: 'Failed to assign slot' });
  }
});

// Update slot
app.put('/api/slots/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { part_num, quantity, notes } = req.body;

    const stmt = db.prepare(`
      UPDATE slots
      SET part_num = ?, quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(part_num || null, quantity || 0, notes || null, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Update slot error:', error);
    res.status(500).json({ error: 'Failed to update slot' });
  }
});

// Delete slot assignment
app.delete('/api/slots/:id', (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('DELETE FROM slots WHERE id = ?');
    stmt.run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

// Get categories for filtering
app.get('/api/categories', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT
        pc.id,
        pc.name,
        COUNT(p.part_num) as part_count
      FROM part_categories pc
      LEFT JOIN parts p ON pc.id = p.category_id
      GROUP BY pc.id
      ORDER BY pc.name
    `);

    const categories = stmt.all();
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// Generate printable labels for a bin
app.get('/api/bins/:binId/labels', (req, res) => {
  try {
    const { binId } = req.params;

    const stmt = db.prepare(`
      SELECT
        s.slot_number,
        s.part_num,
        p.name as part_name,
        s.quantity
      FROM slots s
      LEFT JOIN parts p ON s.part_num = p.part_num
      WHERE s.bin_id = ? AND s.part_num IS NOT NULL
      ORDER BY s.slot_number
    `);

    const labels = stmt.all(binId);

    res.json({ bin_id: binId, labels });
  } catch (error) {
    console.error('Generate labels error:', error);
    res.status(500).json({ error: 'Failed to generate labels' });
  }
});

// ============================================================================
// Static routes
// ============================================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// Start server
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`LEGO Parts Organizer Server`);
  console.log(`Running on: http://localhost:${PORT}`);
  console.log(`=================================\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  if (db) {
    db.close();
  }
  process.exit(0);
});
