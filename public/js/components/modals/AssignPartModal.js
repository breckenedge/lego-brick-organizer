// Assign Part Modal Component
import { Modal } from '../base/Modal.js';
import { PartsAPI } from '../../api/partsApi.js';
import { Autocomplete } from '../ui/Autocomplete.js';

export class AssignPartModal extends Modal {
  constructor() {
    super('assign-part-modal');
    this.currentContainer = null;
    this.autocomplete = new Autocomplete('assign-part-num', 'part-suggestions');
    this.setupSaveButton();
  }

  setupSaveButton() {
    const saveBtn = document.getElementById('save-assignment-btn');
    this.addEventListener(saveBtn, 'click', async () => {
      await this.saveAssignment();
    });
  }

  openForContainer(containerId) {
    this.currentContainer = { containerId };

    const slotInfo = this.modalElement.querySelector('.slot-info');
    if (slotInfo) {
      slotInfo.textContent = `Container ID: ${containerId}`;
    }

    this.clearForm(['assign-part-num', 'assign-notes']);
    document.getElementById('assign-quantity').value = '0';
    this.autocomplete.clear();

    this.open();
  }

  // Legacy method for backwards compatibility
  openForSlot(binId, slotNumber, slotId) {
    this.openForContainer(binId);
  }

  async saveAssignment() {
    const partNum = document.getElementById('assign-part-num').value.trim();
    const quantity = parseInt(document.getElementById('assign-quantity').value);
    const notes = document.getElementById('assign-notes').value.trim();

    if (!partNum) {
      alert('Please enter a part number');
      return;
    }

    try {
      await PartsAPI.assignPartToContainer(
        this.currentContainer.containerId,
        partNum,
        quantity,
        notes
      );

      this.close();
      this.emit('part-assigned', { containerId: this.currentContainer.containerId });
    } catch (error) {
      console.error('Save assignment error:', error);
      alert('Error saving assignment. Make sure the part number exists and the container can hold parts.');
    }
  }
}
