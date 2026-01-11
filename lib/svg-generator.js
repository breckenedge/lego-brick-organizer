/**
 * Generate SVG line drawings from LDraw edge data
 * Projects 3D edges to 2D using orthographic projection
 */
class SVGGenerator {
  constructor(options = {}) {
    this.width = options.width || 400;
    this.height = options.height || 400;
    this.padding = options.padding || 20;
    this.strokeWidth = options.strokeWidth || 1.5;
    this.strokeColor = options.strokeColor || '#000000';
  }

  /**
   * Generate SVG from parsed LDraw edges
   */
  generateSVG(edges) {
    if (!edges || edges.length === 0) {
      return this.generateEmptySVG();
    }

    // Project 3D points to 2D (isometric-style projection)
    const projectedEdges = edges.map(edge => this.projectEdge(edge));

    // Calculate bounding box
    const bounds = this.calculateBounds(projectedEdges);

    // Scale and translate to fit viewBox
    const scaledEdges = this.scaleEdgesToViewBox(projectedEdges, bounds);

    // Generate SVG markup
    return this.generateSVGMarkup(scaledEdges);
  }

  /**
   * Project 3D edge to 2D using isometric projection
   * This gives a nice technical drawing appearance
   */
  projectEdge(edge) {
    // Isometric projection matrix
    // Using standard 30° angle for isometric view
    const cos30 = Math.sqrt(3) / 2;
    const sin30 = 0.5;

    // Project point 1
    const x1 = edge.x1 * cos30 - edge.z1 * cos30;
    const y1 = edge.y1 + edge.x1 * sin30 + edge.z1 * sin30;

    // Project point 2
    const x2 = edge.x2 * cos30 - edge.z2 * cos30;
    const y2 = edge.y2 + edge.x2 * sin30 + edge.z2 * sin30;

    return { x1, y1, x2, y2 };
  }

  /**
   * Calculate bounding box of all projected edges
   */
  calculateBounds(edges) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const edge of edges) {
      minX = Math.min(minX, edge.x1, edge.x2);
      minY = Math.min(minY, edge.y1, edge.y2);
      maxX = Math.max(maxX, edge.x1, edge.x2);
      maxY = Math.max(maxY, edge.y1, edge.y2);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Scale edges to fit within viewBox with padding
   */
  scaleEdgesToViewBox(edges, bounds) {
    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;

    // Calculate scale factor to fit in viewBox (with padding)
    const availableWidth = this.width - 2 * this.padding;
    const availableHeight = this.height - 2 * this.padding;

    const scaleX = boundsWidth > 0 ? availableWidth / boundsWidth : 1;
    const scaleY = boundsHeight > 0 ? availableHeight / boundsHeight : 1;
    const scale = Math.min(scaleX, scaleY);

    // Center the drawing
    const offsetX = this.padding + (availableWidth - boundsWidth * scale) / 2;
    const offsetY = this.padding + (availableHeight - boundsHeight * scale) / 2;

    return edges.map(edge => ({
      x1: (edge.x1 - bounds.minX) * scale + offsetX,
      y1: (edge.y1 - bounds.minY) * scale + offsetY,
      x2: (edge.x2 - bounds.minX) * scale + offsetX,
      y2: (edge.y2 - bounds.minY) * scale + offsetY
    }));
  }

  /**
   * Generate SVG markup from scaled edges
   */
  generateSVGMarkup(edges) {
    const lines = edges.map(edge =>
      `<line x1="${edge.x1.toFixed(2)}" y1="${edge.y1.toFixed(2)}" ` +
      `x2="${edge.x2.toFixed(2)}" y2="${edge.y2.toFixed(2)}" ` +
      `stroke="${this.strokeColor}" stroke-width="${this.strokeWidth}" ` +
      `stroke-linecap="round"/>`
    ).join('\n    ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g>
    ${lines}
  </g>
</svg>`;
  }

  /**
   * Generate placeholder SVG when no edges available
   */
  generateEmptySVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">
    No preview available
  </text>
</svg>`;
  }
}

module.exports = SVGGenerator;
