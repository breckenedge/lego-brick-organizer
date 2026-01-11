const LDrawParser = require('../../../lib/ldraw-parser');

// Mock the fs module
jest.mock('fs');
const fs = require('fs');

describe('LDrawParser', () => {
  let parser;

  beforeEach(() => {
    parser = new LDrawParser('./test-ldraw');
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('parseFile', () => {
    test('parses simple file with Type 2 lines (edges)', () => {
      const fileContent = `0 Simple Brick
2 24 0 0 0 10 0 0
2 24 10 0 0 10 10 0
2 24 10 10 0 0 10 0`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = parser.parseFile('test.dat');

      expect(result.partName).toBe('Simple Brick');
      expect(result.edges).toHaveLength(3);
      expect(result.edges[0]).toEqual({
        color: 24,
        x1: 0, y1: 0, z1: 0,
        x2: 10, y2: 0, z2: 0
      });
    });

    test('extracts part name from Type 0 comment lines', () => {
      const fileContent = `0 Test Part Name
0 Author: Test Author
2 24 0 0 0 10 10 10`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = parser.parseFile('test.dat');

      expect(result.partName).toBe('Test Part Name');
    });

    test('parses file with Type 1 subfile references', () => {
      const fileContent = `0 Brick with Subfile
1 16 0 0 0 1 0 0 0 1 0 0 0 1 subpart.dat
2 24 0 0 0 20 0 0`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = parser.parseFile('test.dat');

      expect(result.subfiles).toHaveLength(1);
      expect(result.subfiles[0]).toEqual({
        color: 16,
        x: 0, y: 0, z: 0,
        matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        filename: 'subpart.dat'
      });
      expect(result.edges).toHaveLength(1);
    });

    test('handles empty file correctly', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('');

      const result = parser.parseFile('empty.dat');

      expect(result.edges).toHaveLength(0);
      expect(result.subfiles).toHaveLength(0);
      expect(result.partName).toBe('');
    });

    test('skips empty lines', () => {
      const fileContent = `0 Part with empty lines

2 24 0 0 0 10 10 10

2 24 10 10 10 20 20 20`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = parser.parseFile('test.dat');

      expect(result.edges).toHaveLength(2);
    });

    test('throws error when file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => {
        parser.parseFile('nonexistent.dat');
      }).toThrow('LDraw file not found');
    });

    test('handles file with only comments', () => {
      const fileContent = `0 Part Name
0 Author: Someone
0 !LICENSE Redistributable under CCAL version 2.0`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = parser.parseFile('test.dat');

      expect(result.partName).toBe('Part Name');
      expect(result.edges).toHaveLength(0);
      expect(result.subfiles).toHaveLength(0);
    });
  });

  describe('resolvePartPath', () => {
    test('resolves file in parts/ directory', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('parts/test.dat') && !path.includes('/s/');
      });

      const result = parser.resolvePartPath('test.dat');

      expect(result).toContain('parts');
      expect(result).toContain('test.dat');
    });

    test('resolves file in p/ directory', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('p/test.dat');
      });

      const result = parser.resolvePartPath('test.dat');

      expect(result).toContain('p');
      expect(result).toContain('test.dat');
    });

    test('resolves file in parts/s/ directory', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('parts/s/test.dat');
      });

      const result = parser.resolvePartPath('test.dat');

      expect(result).toContain('parts');
      expect(result).toContain('s');
      expect(result).toContain('test.dat');
    });

    test('handles filename with .dat extension already present', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('parts/test.dat');
      });

      const result = parser.resolvePartPath('test.dat');

      // Should not have double .dat extension
      expect(result).not.toContain('.dat.dat');
    });

    test('normalizes backslash to forward slash', () => {
      fs.existsSync.mockImplementation((path) => {
        return path.includes('p/subpart.dat');
      });

      const result = parser.resolvePartPath('p\\subpart.dat');

      expect(result).toContain('p/subpart.dat');
      expect(result).not.toContain('\\');
    });

    test('returns default path when file not found', () => {
      fs.existsSync.mockReturnValue(false);

      const result = parser.resolvePartPath('nonexistent.dat');

      expect(result).toContain('parts');
      expect(result).toContain('nonexistent.dat');
    });
  });

  describe('transformEdge', () => {
    test('applies identity transformation correctly', () => {
      const edge = {
        color: 24,
        x1: 1, y1: 2, z1: 3,
        x2: 4, y2: 5, z2: 6
      };

      const transform = {
        x: 0, y: 0, z: 0,
        matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] // Identity matrix
      };

      const result = parser.transformEdge(edge, transform);

      expect(result).toEqual({
        color: 24,
        x1: 1, y1: 2, z1: 3,
        x2: 4, y2: 5, z2: 6
      });
    });

    test('applies translation transformation', () => {
      const edge = {
        color: 24,
        x1: 0, y1: 0, z1: 0,
        x2: 10, y2: 10, z2: 10
      };

      const transform = {
        x: 5, y: 10, z: 15,
        matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] // Identity matrix with translation
      };

      const result = parser.transformEdge(edge, transform);

      expect(result.x1).toBe(5);
      expect(result.y1).toBe(10);
      expect(result.z1).toBe(15);
      expect(result.x2).toBe(15);
      expect(result.y2).toBe(20);
      expect(result.z2).toBe(25);
    });

    test('applies scale transformation', () => {
      const edge = {
        color: 24,
        x1: 1, y1: 1, z1: 1,
        x2: 2, y2: 2, z2: 2
      };

      const transform = {
        x: 0, y: 0, z: 0,
        matrix: [2, 0, 0, 0, 2, 0, 0, 0, 2] // 2x scale
      };

      const result = parser.transformEdge(edge, transform);

      expect(result.x1).toBe(2);
      expect(result.y1).toBe(2);
      expect(result.z1).toBe(2);
      expect(result.x2).toBe(4);
      expect(result.y2).toBe(4);
      expect(result.z2).toBe(4);
    });

    test('preserves edge color', () => {
      const edge = {
        color: 16,
        x1: 0, y1: 0, z1: 0,
        x2: 10, y2: 10, z2: 10
      };

      const transform = {
        x: 5, y: 5, z: 5,
        matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1]
      };

      const result = parser.transformEdge(edge, transform);

      expect(result.color).toBe(16);
    });
  });

  describe('parsePartRecursive', () => {
    test('parses part without subfiles', () => {
      const fileContent = `0 Simple Part
2 24 0 0 0 10 10 10`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      const result = parser.parsePartRecursive('test.dat');

      expect(result.partName).toBe('Simple Part');
      expect(result.edges).toHaveLength(1);
    });

    test('stops at max recursion depth', () => {
      const fileContent = `0 Recursive Part
1 16 0 0 0 1 0 0 0 1 0 0 0 1 test.dat
2 24 0 0 0 10 10 10`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(fileContent);

      // Mock console.warn to verify warning message
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = parser.parsePartRecursive('test.dat', 0, 1);

      expect(warnSpy).toHaveBeenCalled();
      expect(result.edges.length).toBeGreaterThan(0);

      warnSpy.mockRestore();
    });

    test('handles parse errors gracefully', () => {
      fs.existsSync.mockReturnValue(false);

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = parser.parsePartRecursive('nonexistent.dat');

      expect(result.edges).toHaveLength(0);
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
