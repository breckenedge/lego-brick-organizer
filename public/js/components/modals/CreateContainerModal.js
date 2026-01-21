// Create Container Modal Component
import { Modal } from '../base/Modal.js';
import { PartsAPI } from '../../api/partsApi.js';

export class CreateContainerModal extends Modal {
  constructor() {
    super('create-bin-modal'); // Reusing the existing modal ID
    this.parentId = null;
    this.containerTypes = [];
    this.setupSaveButton();
    this.loadContainerTypes();
  }

  async loadContainerTypes() {
    try {
      const data = await PartsAPI.getContainerTypes();
      this.containerTypes = data.types;
    } catch (error) {
      console.error('Load container types error:', error);
    }
  }

  setupSaveButton() {
    const saveBtn = document.getElementById('save-bin-btn');
    this.addEventListener(saveBtn, 'click', async () => {
      await this.createContainer();
    });
  }

  open(options = {}) {
    this.parentId = options.parentId || null;
    super.open();
  }

  onOpen() {
    this.clearForm(['new-bin-id', 'new-bin-description']);

    // Update form to show container type selector
    const modal = document.getElementById(this.modalId);
    const form = modal.querySelector('.modal-form');

    // Check if we need to update the form HTML
    if (!document.getElementById('new-container-type')) {
      // Replace the slots input with container type selector
      const slotsGroup = Array.from(form.children).find(el =>
        el.querySelector('#new-bin-slots')
      );

      if (slotsGroup) {
        slotsGroup.innerHTML = `
          <label for="new-container-type">Container Type:</label>
          <select id="new-container-type" required>
            <option value="">Select type...</option>
          </select>
        `;
      }
    }

    // Populate container types
    const typeSelect = document.getElementById('new-container-type');
    if (typeSelect && this.containerTypes.length > 0) {
      typeSelect.innerHTML = `
        <option value="">Select type...</option>
        ${this.containerTypes.map(type => `
          <option value="${type.type_name}">${type.type_name} (${type.abbreviation_prefix}) - ${type.description}</option>
        `).join('')}
      `;
    }

    // Update modal title
    const title = modal.querySelector('.modal-title');
    if (title) {
      title.textContent = this.parentId ? 'Create Sub-Container' : 'Create New Container';
    }
  }

  async createContainer() {
    const containerId = document.getElementById('new-bin-id').value.trim();
    const description = document.getElementById('new-bin-description').value.trim();
    const containerType = document.getElementById('new-container-type')?.value;

    if (!containerId) {
      alert('Please enter a container ID');
      return;
    }

    if (!containerType) {
      alert('Please select a container type');
      return;
    }

    try {
      await PartsAPI.createContainer(containerId, containerType, this.parentId, description);

      this.close();
      this.emit('container-created', { containerId, parentId: this.parentId });
    } catch (error) {
      console.error('Create container error:', error);
      alert('Error creating container. The container ID might already exist.');
    }
  }
}
