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

  // Container Type endpoints
  static async getContainerTypes() {
    return this.request('/api/container-types');
  }

  // Container endpoints
  static async getContainers(parentId = null) {
    const url = parentId ? `/api/containers?parent_id=${parentId}` : '/api/containers';
    return this.request(url);
  }

  static async getContainerDetails(containerId) {
    return this.request(`/api/containers/${containerId}`);
  }

  static async createContainer(containerId, containerType, parentId = null, description = '') {
    return this.request('/api/containers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ container_id: containerId, container_type: containerType, parent_id: parentId, description })
    });
  }

  static async updateContainer(id, updates) {
    return this.request(`/api/containers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  }

  static async deleteContainer(id) {
    return this.request(`/api/containers/${id}`, {
      method: 'DELETE'
    });
  }

  static async getContainerLabels(containerId) {
    return this.request(`/api/containers/${containerId}/labels`);
  }

  // Container-Part relationship endpoints
  static async assignPartToContainer(containerId, partNum, quantity = 0, notes = '') {
    return this.request(`/api/containers/${containerId}/parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part_num: partNum, quantity, notes })
    });
  }

  static async updateContainerPart(containerId, partNum, quantity, notes) {
    return this.request(`/api/containers/${containerId}/parts/${partNum}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, notes })
    });
  }

  static async removePartFromContainer(containerId, partNum) {
    return this.request(`/api/containers/${containerId}/parts/${partNum}`, {
      method: 'DELETE'
    });
  }
}
