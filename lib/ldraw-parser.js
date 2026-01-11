const fs = require('fs');
const path = require('path');

/**
 * Parse LDraw .dat file and extract line geometry
 * LDraw format: http://www.ldraw.org/article/218.html
 *
 * Line Type 2: Edge lines (what we want for technical drawings)
 * Format: 2 <colour> x1 y1 z1 x2 y2 z2
 */
class LDrawParser {
  constructor(ldrawLibraryPath = './data/ldraw') {
    this.libraryPath = ldrawLibraryPath;
  }

  /**
   * Parse a .dat file and extract all edges (line type 2)
   */
  parseFile(filename) {
    const filePath = this.resolvePartPath(filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`LDraw file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const edges = [];
    const subfiles = [];
    let partName = '';

    for (let line of lines) {
      line = line.trim();

      // Skip empty lines
      if (!line) continue;

      // Type 0: Comment/meta command
      if (line.startsWith('0')) {
        // Extract part name from first comment line
        if (!partName && line.startsWith('0 ')) {
          partName = line.substring(2).trim();
        }
        continue;
      }

      // Type 1: Sub-file reference (for composite parts)
      if (line.startsWith('1')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 15) {
          const subfile = {
            color: parseInt(parts[1]),
            x: parseFloat(parts[2]),
            y: parseFloat(parts[3]),
            z: parseFloat(parts[4]),
            // Transformation matrix (3x3)
            matrix: [
              parseFloat(parts[5]), parseFloat(parts[6]), parseFloat(parts[7]),
              parseFloat(parts[8]), parseFloat(parts[9]), parseFloat(parts[10]),
              parseFloat(parts[11]), parseFloat(parts[12]), parseFloat(parts[13])
            ],
            filename: parts.slice(14).join(' ')
          };
          subfiles.push(subfile);
        }
        continue;
      }

      // Type 2: Line/Edge (this is what we want!)
      if (line.startsWith('2')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 8) {
          edges.push({
            color: parseInt(parts[1]),
            x1: parseFloat(parts[2]),
            y1: parseFloat(parts[3]),
            z1: parseFloat(parts[4]),
            x2: parseFloat(parts[5]),
            y2: parseFloat(parts[6]),
            z2: parseFloat(parts[7])
          });
        }
      }
    }

    return {
      partName,
      edges,
      subfiles
    };
  }

  /**
   * Recursively parse a part and all its subfiles
   */
  parsePartRecursive(filename, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) {
      console.warn(`Max recursion depth reached for ${filename}`);
      return { edges: [], subfiles: [] };
    }

    try {
      const parsed = this.parseFile(filename);
      let allEdges = [...parsed.edges];

      // Recursively parse subfiles
      for (const subfile of parsed.subfiles) {
        const subParsed = this.parsePartRecursive(subfile.filename, depth + 1, maxDepth);

        // Transform subfile edges using the transformation matrix
        const transformedEdges = subParsed.edges.map(edge =>
          this.transformEdge(edge, subfile)
        );

        allEdges = allEdges.concat(transformedEdges);
      }

      return {
        partName: parsed.partName,
        edges: allEdges
      };
    } catch (error) {
      console.error(`Error parsing ${filename}:`, error.message);
      return { edges: [] };
    }
  }

  /**
   * Transform an edge using a subfile's transformation matrix
   */
  transformEdge(edge, transform) {
    const { x, y, z, matrix } = transform;

    // Transform point 1
    const tx1 = edge.x1 * matrix[0] + edge.y1 * matrix[1] + edge.z1 * matrix[2] + x;
    const ty1 = edge.x1 * matrix[3] + edge.y1 * matrix[4] + edge.z1 * matrix[5] + y;
    const tz1 = edge.x1 * matrix[6] + edge.y1 * matrix[7] + edge.z1 * matrix[8] + z;

    // Transform point 2
    const tx2 = edge.x2 * matrix[0] + edge.y2 * matrix[1] + edge.z2 * matrix[2] + x;
    const ty2 = edge.x2 * matrix[3] + edge.y2 * matrix[4] + edge.z2 * matrix[5] + y;
    const tz2 = edge.x2 * matrix[6] + edge.y2 * matrix[7] + edge.z2 * matrix[8] + z;

    return {
      color: edge.color,
      x1: tx1, y1: ty1, z1: tz1,
      x2: tx2, y2: ty2, z2: tz2
    };
  }

  /**
   * Resolve part filename to full path
   * LDraw parts can be in different directories (parts/, p/, etc.)
   */
  resolvePartPath(filename) {
    // Normalize path separators (LDraw uses backslashes, but we need forward slashes)
    const normalizedFilename = filename.replace(/\\/g, '/').toLowerCase();

    // Remove .dat extension if present, we'll add it back
    const baseFilename = normalizedFilename.replace(/\.dat$/, '');

    const possiblePaths = [
      path.join(this.libraryPath, 'parts', `${baseFilename}.dat`),
      path.join(this.libraryPath, 'p', `${baseFilename}.dat`),
      path.join(this.libraryPath, 'parts', 's', `${baseFilename}.dat`),
      path.join(this.libraryPath, `${baseFilename}.dat`)
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    // If not found, return the most common location
    return path.join(this.libraryPath, 'parts', `${baseFilename}.dat`);
  }
}

module.exports = LDrawParser;
