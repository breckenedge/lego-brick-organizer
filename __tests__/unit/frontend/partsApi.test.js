/**
 * @jest-environment jsdom
 */

import { PartsAPI } from '../../../public/js/api/partsApi.js';

describe('PartsAPI', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('searchParts', () => {
    test('should search for parts with query', async () => {
      const mockResponse = { parts: [{ part_num: '3001', name: 'Brick 2 x 4' }] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await PartsAPI.searchParts('brick', 10);

      expect(global.fetch).toHaveBeenCalledWith('/api/parts/search?q=brick&limit=10');
      expect(result).toEqual(mockResponse);
    });

    test('should handle search errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(PartsAPI.searchParts('test')).rejects.toThrow();
    });
  });

  describe('getAllBins', () => {
    test('should fetch all bins', async () => {
      const mockResponse = { bins: [{ bin_id: 'A1', slot_count: 10 }] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await PartsAPI.getAllBins();

      expect(global.fetch).toHaveBeenCalledWith('/api/bins');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getBinDetails', () => {
    test('should fetch bin details', async () => {
      const mockResponse = { bin_id: 'A1', slots: [] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await PartsAPI.getBinDetails('A1');

      expect(global.fetch).toHaveBeenCalledWith('/api/bins/A1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createBin', () => {
    test('should create a new bin', async () => {
      const mockResponse = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await PartsAPI.createBin('A1', 'Test Bin');

      expect(global.fetch).toHaveBeenCalledWith('/api/bins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bin_id: 'A1', description: 'Test Bin' })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createSlot', () => {
    test('should create a new slot', async () => {
      const mockResponse = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await PartsAPI.createSlot('A1', 1, '3001', 10, 'Test note');

      expect(global.fetch).toHaveBeenCalledWith('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bin_id: 'A1',
          slot_number: 1,
          part_num: '3001',
          quantity: 10,
          notes: 'Test note'
        })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateSlot', () => {
    test('should update an existing slot', async () => {
      const mockResponse = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await PartsAPI.updateSlot(1, '3001', 10, 'Updated note');

      expect(global.fetch).toHaveBeenCalledWith('/api/slots/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_num: '3001',
          quantity: 10,
          notes: 'Updated note'
        })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteSlot', () => {
    test('should delete a slot', async () => {
      const mockResponse = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await PartsAPI.deleteSlot(1);

      expect(global.fetch).toHaveBeenCalledWith('/api/slots/1', {
        method: 'DELETE'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPartDrawingURL', () => {
    test('should return correct drawing URL', () => {
      const url = PartsAPI.getPartDrawingURL('3001');
      expect(url).toBe('/api/parts/3001/drawing');
    });
  });
});
