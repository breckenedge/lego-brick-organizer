const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./database/schema');

const app = express();
const PORT = process.env.PORT || 3000;
const SVG_SERVICE_URL = process.env.SVG_SERVICE_URL || 'http://localhost:3001';

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
        sp.quantity
      FROM parts p
      LEFT JOIN part_categories pc ON p.category_id = pc.id
      LEFT JOIN slot_parts sp ON p.part_num = sp.part_num
      LEFT JOIN slots s ON sp.slot_id = s.id
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
      SELECT s.bin_id, s.slot_number, sp.quantity, sp.notes
      FROM slot_parts sp
      JOIN slots s ON sp.slot_id = s.id
      WHERE sp.part_num = ?
      ORDER BY s.bin_id, s.slot_number
    `);

    part.locations = locationsStmt.all(partNum);

    res.json(part);
  } catch (error) {
    console.error('Get part error:', error);
    res.status(500).json({ error: 'Failed to retrieve part' });
  }
});

// Proxy SVG drawing requests to the SVG service
app.get('/api/parts/:partNum/drawing', async (req, res) => {
  try {
    const { partNum } = req.params;
    const svgUrl = `${SVG_SERVICE_URL}/api/parts/${partNum}/drawing`;

    const response = await fetch(svgUrl);

    if (!response.ok) {
      throw new Error(`SVG service responded with status ${response.status}`);
    }

    const svgData = await response.text();
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svgData);
  } catch (error) {
    console.error('Failed to fetch drawing from SVG service:', error);
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
        s.updated_at
      FROM slots s
      WHERE s.bin_id = ?
      ORDER BY s.slot_number
    `);

    bin.slots = slotsStmt.all(binId);

    // For each slot, get all parts assigned to it
    const partsStmt = db.prepare(`
      SELECT
        sp.id,
        sp.part_num,
        p.name as part_name,
        sp.quantity,
        sp.notes,
        sp.added_at
      FROM slot_parts sp
      JOIN parts p ON sp.part_num = p.part_num
      WHERE sp.slot_id = ?
      ORDER BY sp.added_at
    `);

    for (const slot of bin.slots) {
      slot.parts = partsStmt.all(slot.id);
    }

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

// Create or get a slot
app.post('/api/slots', (req, res) => {
  try {
    const { bin_id, slot_number } = req.body;

    if (!bin_id || slot_number === undefined) {
      return res.status(400).json({ error: 'bin_id and slot_number are required' });
    }

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO slots (bin_id, slot_number, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(bin_id, slot_number);

    // Get the slot id
    const getStmt = db.prepare(`
      SELECT id FROM slots WHERE bin_id = ? AND slot_number = ?
    `);

    const slot = getStmt.get(bin_id, slot_number);

    res.json({ success: true, id: slot.id });
  } catch (error) {
    console.error('Create slot error:', error);
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

// Add a part to a slot
app.post('/api/slots/:slotId/parts', (req, res) => {
  try {
    const { slotId } = req.params;
    const { part_num, quantity, notes } = req.body;

    if (!part_num) {
      return res.status(400).json({ error: 'part_num is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO slot_parts (slot_id, part_num, quantity, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(slot_id, part_num) DO UPDATE SET
        quantity = excluded.quantity,
        notes = excluded.notes,
        added_at = CURRENT_TIMESTAMP
    `);

    const result = stmt.run(slotId, part_num, quantity || 0, notes || null);

    // Update slot's updated_at timestamp
    db.prepare('UPDATE slots SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(slotId);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Add part to slot error:', error);
    res.status(500).json({ error: 'Failed to add part to slot' });
  }
});

// Update a part in a slot
app.put('/api/slots/:slotId/parts/:partId', (req, res) => {
  try {
    const { slotId, partId } = req.params;
    const { quantity, notes } = req.body;

    const stmt = db.prepare(`
      UPDATE slot_parts
      SET quantity = ?, notes = ?, added_at = CURRENT_TIMESTAMP
      WHERE id = ? AND slot_id = ?
    `);

    stmt.run(quantity || 0, notes || null, partId, slotId);

    // Update slot's updated_at timestamp
    db.prepare('UPDATE slots SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(slotId);

    res.json({ success: true });
  } catch (error) {
    console.error('Update part error:', error);
    res.status(500).json({ error: 'Failed to update part' });
  }
});

// Remove a part from a slot
app.delete('/api/slots/:slotId/parts/:partId', (req, res) => {
  try {
    const { slotId, partId } = req.params;

    const stmt = db.prepare('DELETE FROM slot_parts WHERE id = ? AND slot_id = ?');
    stmt.run(partId, slotId);

    // Update slot's updated_at timestamp
    db.prepare('UPDATE slots SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(slotId);

    res.json({ success: true });
  } catch (error) {
    console.error('Remove part error:', error);
    res.status(500).json({ error: 'Failed to remove part' });
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
        sp.part_num,
        p.name as part_name,
        sp.quantity
      FROM slots s
      JOIN slot_parts sp ON s.id = sp.slot_id
      LEFT JOIN parts p ON sp.part_num = p.part_num
      WHERE s.bin_id = ?
      ORDER BY s.slot_number, sp.added_at
    `);

    const labels = stmt.all(binId);

    res.json({ bin_id: binId, labels });
  } catch (error) {
    console.error('Generate labels error:', error);
    res.status(500).json({ error: 'Failed to generate labels' });
  }
});

// ============================================================================
// Static routes - Serve SPA for all non-API routes
// ============================================================================

// Catch-all route for client-side routing (serves index.html for all non-API routes)
app.get(/^\/(?!api).*/, (req, res) => {
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
