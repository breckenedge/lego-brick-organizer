// API Service Layer
export class PartsAPI {
  static async request(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Parts endpoints
  static async searchParts(query, limit = 50) {
    return this.request(`/api/parts/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  static getPartDrawingURL(partNum) {
    return `/api/parts/${partNum}/drawing`;
  }

  // Bins endpoints
  static async getAllBins() {
    return this.request('/api/bins');
  }

  static async getBinDetails(binId) {
    return this.request(`/api/bins/${binId}`);
  }

  static async createBin(binId, description) {
    return this.request('/api/bins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bin_id: binId, description })
    });
  }

  static async getBinLabels(binId) {
    return this.request(`/api/bins/${binId}/labels`);
  }

  // Slots endpoints
  static async createSlot(binId, slotNumber) {
    return this.request('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bin_id: binId, slot_number: slotNumber })
    });
  }

  static async deleteSlot(slotId) {
    return this.request(`/api/slots/${slotId}`, {
      method: 'DELETE'
    });
  }

  // Slot parts endpoints (for managing parts within a slot)
  static async addPartToSlot(slotId, partNum, quantity = 0, notes = '') {
    return this.request(`/api/slots/${slotId}/parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part_num: partNum, quantity, notes })
    });
  }

  static async updateSlotPart(slotId, partId, quantity, notes) {
    return this.request(`/api/slots/${slotId}/parts/${partId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, notes })
    });
  }

  static async removePartFromSlot(slotId, partId) {
    return this.request(`/api/slots/${slotId}/parts/${partId}`, {
      method: 'DELETE'
    });
  }
}
