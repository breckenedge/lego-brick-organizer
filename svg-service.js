const express = require('express');
const { initializeDatabase } = require('./database/schema');
const LDrawParser = require('./lib/ldraw-parser');
const SVGGenerator = require('./lib/svg-generator');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Initialize database
let db;
try {
  db = initializeDatabase();
  console.log('SVG Service: Database initialized');
} catch (error) {
  console.error('SVG Service: Failed to initialize database:', error);
  process.exit(1);
}

// Initialize LDraw parser
const ldrawParser = new LDrawParser('./data/ldraw');
const svgGenerator = new SVGGenerator();

// ============================================================================
// Health check endpoint
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'svg-generator' });
});

// ============================================================================
// SVG Generation endpoint
// ============================================================================

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

// ============================================================================
// Start server
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`SVG Generation Service`);
  console.log(`Running on: http://localhost:${PORT}`);
  console.log(`=================================\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nSVG Service: Shutting down gracefully...');
  if (db) {
    db.close();
  }
  process.exit(0);
});
