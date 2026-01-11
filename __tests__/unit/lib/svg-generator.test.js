const SVGGenerator = require('../../../lib/svg-generator');

describe('SVGGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new SVGGenerator();
  });

  describe('Constructor', () => {
    test('uses default options when none provided', () => {
      expect(generator.width).toBe(400);
      expect(generator.height).toBe(400);
      expect(generator.padding).toBe(20);
      expect(generator.strokeWidth).toBe(1.5);
      expect(generator.strokeColor).toBe('#000000');
    });

    test('accepts custom options', () => {
      const customGenerator = new SVGGenerator({
        width: 600,
        height: 800,
        padding: 30,
        strokeWidth: 2,
        strokeColor: '#ff0000'
      });

      expect(customGenerator.width).toBe(600);
      expect(customGenerator.height).toBe(800);
      expect(customGenerator.padding).toBe(30);
      expect(customGenerator.strokeWidth).toBe(2);
      expect(customGenerator.strokeColor).toBe('#ff0000');
    });
  });

  describe('generateSVG', () => {
    test('generates SVG from simple edges', () => {
      const edges = [
        { x1: 0, y1: 0, z1: 0, x2: 10, y2: 0, z2: 0 }
      ];

      const svg = generator.generateSVG(edges);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<line');
      expect(svg).toContain('stroke="#000000"');
    });

    test('returns empty SVG when edges array is empty', () => {
      const svg = generator.generateSVG([]);

      expect(svg).toContain('No preview available');
      expect(svg).toContain('#f0f0f0');
    });

    test('returns empty SVG when edges is null', () => {
      const svg = generator.generateSVG(null);

      expect(svg).toContain('No preview available');
    });

    test('returns empty SVG when edges is undefined', () => {
      const svg = generator.generateSVG(undefined);

      expect(svg).toContain('No preview available');
    });

    test('generates SVG with multiple edges', () => {
      const edges = [
        { x1: 0, y1: 0, z1: 0, x2: 10, y2: 0, z2: 0 },
        { x1: 10, y1: 0, z1: 0, x2: 10, y2: 10, z2: 0 },
        { x1: 10, y1: 10, z1: 0, x2: 0, y2: 10, z2: 0 }
      ];

      const svg = generator.generateSVG(edges);

      // Count line elements (should be 3)
      const lineCount = (svg.match(/<line/g) || []).length;
      expect(lineCount).toBe(3);
    });
  });

  describe('projectEdge', () => {
    test('projects 3D edge to 2D using isometric projection', () => {
      const edge = { x1: 10, y1: 0, z1: 0, x2: 0, y2: 10, z2: 0 };

      const projected = generator.projectEdge(edge);

      expect(projected).toHaveProperty('x1');
      expect(projected).toHaveProperty('y1');
      expect(projected).toHaveProperty('x2');
      expect(projected).toHaveProperty('y2');

      // Verify it uses isometric projection
      const cos30 = Math.sqrt(3) / 2;
      const sin30 = 0.5;

      expect(projected.x1).toBeCloseTo(10 * cos30, 5);
      expect(projected.y1).toBeCloseTo(0 + 10 * sin30, 5);
    });

    test('projects origin point correctly', () => {
      const edge = { x1: 0, y1: 0, z1: 0, x2: 0, y2: 0, z2: 0 };

      const projected = generator.projectEdge(edge);

      expect(projected.x1).toBe(0);
      expect(projected.y1).toBe(0);
      expect(projected.x2).toBe(0);
      expect(projected.y2).toBe(0);
    });

    test('handles negative coordinates', () => {
      const edge = { x1: -10, y1: -10, z1: -10, x2: 10, y2: 10, z2: 10 };

      const projected = generator.projectEdge(edge);

      expect(typeof projected.x1).toBe('number');
      expect(typeof projected.y1).toBe('number');
      expect(isNaN(projected.x1)).toBe(false);
      expect(isNaN(projected.y1)).toBe(false);
    });
  });

  describe('calculateBounds', () => {
    test('calculates bounding box for single edge', () => {
      const edges = [{ x1: 10, y1: 20, x2: 30, y2: 40 }];

      const bounds = generator.calculateBounds(edges);

      expect(bounds.minX).toBe(10);
      expect(bounds.minY).toBe(20);
      expect(bounds.maxX).toBe(30);
      expect(bounds.maxY).toBe(40);
    });

    test('calculates bounding box for multiple edges', () => {
      const edges = [
        { x1: 0, y1: 0, x2: 10, y2: 10 },
        { x1: 5, y1: 5, x2: 20, y2: 25 },
        { x1: -5, y1: 15, x2: 15, y2: 30 }
      ];

      const bounds = generator.calculateBounds(edges);

      expect(bounds.minX).toBe(-5);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(20);
      expect(bounds.maxY).toBe(30);
    });

    test('handles edges with swapped coordinates', () => {
      const edges = [{ x1: 30, y1: 40, x2: 10, y2: 20 }];

      const bounds = generator.calculateBounds(edges);

      expect(bounds.minX).toBe(10);
      expect(bounds.minY).toBe(20);
      expect(bounds.maxX).toBe(30);
      expect(bounds.maxY).toBe(40);
    });
  });

  describe('scaleEdgesToViewBox', () => {
    test('scales edges to fit within viewBox', () => {
      const edges = [{ x1: 0, y1: 0, x2: 100, y2: 100 }];
      const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

      const scaled = generator.scaleEdgesToViewBox(edges, bounds);

      // Should fit within width/height minus padding
      expect(scaled[0].x1).toBeGreaterThanOrEqual(generator.padding);
      expect(scaled[0].y1).toBeGreaterThanOrEqual(generator.padding);
      expect(scaled[0].x2).toBeLessThanOrEqual(generator.width - generator.padding);
      expect(scaled[0].y2).toBeLessThanOrEqual(generator.height - generator.padding);
    });

    test('respects padding configuration', () => {
      const customGenerator = new SVGGenerator({ padding: 50 });
      const edges = [{ x1: 0, y1: 0, x2: 100, y2: 100 }];
      const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

      const scaled = customGenerator.scaleEdgesToViewBox(edges, bounds);

      expect(scaled[0].x1).toBeGreaterThanOrEqual(50);
      expect(scaled[0].y1).toBeGreaterThanOrEqual(50);
    });

    test('maintains aspect ratio', () => {
      const edges = [{ x1: 0, y1: 0, x2: 200, y2: 100 }];
      const bounds = { minX: 0, minY: 0, maxX: 200, maxY: 100 };

      const scaled = generator.scaleEdgesToViewBox(edges, bounds);

      // Width should be scaled same as height (aspect ratio maintained)
      const scaledWidth = scaled[0].x2 - scaled[0].x1;
      const scaledHeight = scaled[0].y2 - scaled[0].y1;
      const ratio = scaledWidth / scaledHeight;

      expect(ratio).toBeCloseTo(2, 1); // Original ratio was 200/100 = 2
    });

    test('centers drawing when bounds are smaller than viewBox', () => {
      const edges = [{ x1: 0, y1: 0, x2: 10, y2: 10 }];
      const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      const scaled = generator.scaleEdgesToViewBox(edges, bounds);

      // Drawing should be centered or at least respecting padding
      expect(scaled[0].x1).toBeGreaterThanOrEqual(generator.padding);
      expect(scaled[0].y1).toBeGreaterThanOrEqual(generator.padding);
    });

    test('handles zero-width bounds', () => {
      const edges = [{ x1: 50, y1: 0, x2: 50, y2: 100 }];
      const bounds = { minX: 50, minY: 0, maxX: 50, maxY: 100 };

      const scaled = generator.scaleEdgesToViewBox(edges, bounds);

      expect(scaled).toHaveLength(1);
      expect(isNaN(scaled[0].x1)).toBe(false);
    });
  });

  describe('generateSVGMarkup', () => {
    test('generates valid SVG markup', () => {
      const edges = [{ x1: 20, y1: 20, x2: 100, y2: 100 }];

      const svg = generator.generateSVGMarkup(edges);

      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain(`viewBox="0 0 ${generator.width} ${generator.height}"`);
      expect(svg).toContain('<line');
      expect(svg).toContain('</svg>');
    });

    test('includes white background rectangle', () => {
      const edges = [{ x1: 0, y1: 0, x2: 10, y2: 10 }];

      const svg = generator.generateSVGMarkup(edges);

      expect(svg).toContain('<rect');
      expect(svg).toContain('fill="#ffffff"');
    });

    test('formats coordinates to 2 decimal places', () => {
      const edges = [{ x1: 10.123456, y1: 20.987654, x2: 30.5, y2: 40.1 }];

      const svg = generator.generateSVGMarkup(edges);

      expect(svg).toContain('x1="10.12"');
      expect(svg).toContain('y1="20.99"');
      expect(svg).toContain('x2="30.50"');
      expect(svg).toContain('y2="40.10"');
    });

    test('applies custom stroke color', () => {
      const customGenerator = new SVGGenerator({ strokeColor: '#ff0000' });
      const edges = [{ x1: 0, y1: 0, x2: 10, y2: 10 }];

      const svg = customGenerator.generateSVGMarkup(edges);

      expect(svg).toContain('stroke="#ff0000"');
    });

    test('applies custom stroke width', () => {
      const customGenerator = new SVGGenerator({ strokeWidth: 3 });
      const edges = [{ x1: 0, y1: 0, x2: 10, y2: 10 }];

      const svg = customGenerator.generateSVGMarkup(edges);

      expect(svg).toContain('stroke-width="3"');
    });

    test('includes stroke-linecap rounded', () => {
      const edges = [{ x1: 0, y1: 0, x2: 10, y2: 10 }];

      const svg = generator.generateSVGMarkup(edges);

      expect(svg).toContain('stroke-linecap="round"');
    });
  });

  describe('generateEmptySVG', () => {
    test('generates placeholder SVG with message', () => {
      const svg = generator.generateEmptySVG();

      expect(svg).toContain('No preview available');
      expect(svg).toContain('<text');
      expect(svg).toContain('text-anchor="middle"');
    });

    test('includes gray background', () => {
      const svg = generator.generateEmptySVG();

      expect(svg).toContain('fill="#f0f0f0"');
    });

    test('uses configured dimensions', () => {
      const customGenerator = new SVGGenerator({ width: 600, height: 800 });
      const svg = customGenerator.generateEmptySVG();

      expect(svg).toContain('viewBox="0 0 600 800"');
      expect(svg).toContain('width="600"');
      expect(svg).toContain('height="800"');
    });
  });
});
