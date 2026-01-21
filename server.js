const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./database/schema');
const {
  getContainerPath,
  getContainerDetails,
  getContainerParts,
  getChildContainers,
  canContainerHoldParts,
  getPartLocations,
  validateContainerHierarchy,
  getContainerTypes,
  getContainerStats
} = require('./database/containerHelpers');

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
        cp.container_id,
        cp.quantity
      FROM parts p
      LEFT JOIN part_categories pc ON p.category_id = pc.id
      LEFT JOIN container_parts cp ON p.part_num = cp.part_num
      WHERE p.part_num LIKE ? OR p.name LIKE ?
      ORDER BY (cp.container_id IS NOT NULL) DESC, p.part_num
      LIMIT ? OFFSET ?
    `);

    let parts = stmt.all(searchPattern, searchPattern, limit, offset);

    // Add container paths for parts that have locations
    parts = parts.map(part => {
      if (part.container_id) {
        part.container_path = getContainerPath(db, part.container_id);
      }
      return part;
    });

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

    // Get all locations for this part using helper function
    part.locations = getPartLocations(db, partNum);

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

// ============================================================================
// CONTAINER MANAGEMENT ENDPOINTS
// ============================================================================

// Get all container types
app.get('/api/container-types', (req, res) => {
  try {
    const types = getContainerTypes(db);
    res.json({ types });
  } catch (error) {
    console.error('Get container types error:', error);
    res.status(500).json({ error: 'Failed to retrieve container types' });
  }
});

// List all root containers (no parent) or children of a specific parent
app.get('/api/containers', (req, res) => {
  try {
    const parentId = req.query.parent_id ? parseInt(req.query.parent_id) : null;
    const containers = getChildContainers(db, parentId);

    // Add stats for each container
    const containersWithStats = containers.map(container => ({
      ...container,
      ...getContainerStats(db, container.id)
    }));

    res.json({ containers: containersWithStats });
  } catch (error) {
    console.error('Get containers error:', error);
    res.status(500).json({ error: 'Failed to retrieve containers' });
  }
});

// Get container details with children and parts
app.get('/api/containers/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const container = getContainerDetails(db, id);

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    // Get child containers
    container.children = getChildContainers(db, id);

    // Get parts if this container can hold parts
    if (container.can_contain_parts) {
      container.parts = getContainerParts(db, id);
    } else {
      container.parts = [];
    }

    // Get stats
    container.stats = getContainerStats(db, id);

    res.json(container);
  } catch (error) {
    console.error('Get container error:', error);
    res.status(500).json({ error: 'Failed to retrieve container' });
  }
});

// Create a new container
app.post('/api/containers', (req, res) => {
  try {
    const { container_id, container_type, parent_id, description } = req.body;

    if (!container_id || !container_type) {
      return res.status(400).json({ error: 'container_id and container_type are required' });
    }

    // Validate parent hierarchy if parent_id is provided
    if (parent_id) {
      const parentContainer = db.prepare(`
        SELECT id FROM containers WHERE id = ?
      `).get(parent_id);

      if (!parentContainer) {
        return res.status(404).json({ error: 'Parent container not found' });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO containers (container_id, container_type, parent_id, description)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      container_id,
      container_type,
      parent_id || null,
      description || ''
    );

    const newContainer = getContainerDetails(db, result.lastInsertRowid);

    res.json({ success: true, container: newContainer });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Container ID already exists' });
    }
    console.error('Create container error:', error);
    res.status(500).json({ error: 'Failed to create container' });
  }
});

// Update a container
app.put('/api/containers/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { container_id, description, parent_id } = req.body;

    // Validate hierarchy if parent_id is being changed
    if (parent_id !== undefined) {
      const validation = validateContainerHierarchy(db, id, parent_id);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    const updates = [];
    const values = [];

    if (container_id !== undefined) {
      updates.push('container_id = ?');
      values.push(container_id);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?');
      values.push(parent_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE containers
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const updatedContainer = getContainerDetails(db, id);
    res.json({ success: true, container: updatedContainer });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Container ID already exists' });
    }
    console.error('Update container error:', error);
    res.status(500).json({ error: 'Failed to update container' });
  }
});

// Delete a container
app.delete('/api/containers/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Check if container exists
    const container = db.prepare(`
      SELECT id FROM containers WHERE id = ?
    `).get(id);

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    // Delete will cascade to children and container_parts due to ON DELETE CASCADE
    const stmt = db.prepare('DELETE FROM containers WHERE id = ?');
    stmt.run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete container error:', error);
    res.status(500).json({ error: 'Failed to delete container' });
  }
});

// ============================================================================
// CONTAINER-PART RELATIONSHIP ENDPOINTS
// ============================================================================

// Assign a part to a container
app.post('/api/containers/:id/parts', (req, res) => {
  try {
    const containerId = parseInt(req.params.id);
    const { part_num, quantity, notes } = req.body;

    if (!part_num) {
      return res.status(400).json({ error: 'part_num is required' });
    }

    // Verify container can hold parts
    if (!canContainerHoldParts(db, containerId)) {
      return res.status(400).json({ error: 'This container type cannot hold parts directly' });
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO container_parts (container_id, part_num, quantity, notes, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(
      containerId,
      part_num,
      quantity || 0,
      notes || null
    );

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Assign part error:', error);
    res.status(500).json({ error: 'Failed to assign part to container' });
  }
});

// Update part quantity/notes in a container
app.put('/api/containers/:containerId/parts/:partNum', (req, res) => {
  try {
    const containerId = parseInt(req.params.containerId);
    const { partNum } = req.params;
    const { quantity, notes } = req.body;

    const stmt = db.prepare(`
      UPDATE container_parts
      SET quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE container_id = ? AND part_num = ?
    `);

    stmt.run(quantity || 0, notes || null, containerId, partNum);

    res.json({ success: true });
  } catch (error) {
    console.error('Update part error:', error);
    res.status(500).json({ error: 'Failed to update part' });
  }
});

// Remove a part from a container
app.delete('/api/containers/:containerId/parts/:partNum', (req, res) => {
  try {
    const containerId = parseInt(req.params.containerId);
    const { partNum } = req.params;

    const stmt = db.prepare(`
      DELETE FROM container_parts
      WHERE container_id = ? AND part_num = ?
    `);

    stmt.run(containerId, partNum);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete part error:', error);
    res.status(500).json({ error: 'Failed to remove part from container' });
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

// Generate printable labels for a container
app.get('/api/containers/:id/labels', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const container = getContainerDetails(db, id);
    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const parts = getContainerParts(db, id);

    const labels = parts.map(part => ({
      container_path: container.path,
      container_id: container.container_id,
      part_num: part.part_num,
      part_name: part.part_name,
      quantity: part.quantity
    }));

    res.json({
      container_id: container.container_id,
      container_path: container.path,
      labels
    });
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
