// Create Bin Modal Component
import { Modal } from '../base/Modal.js';
import { PartsAPI } from '../../api/partsApi.js';

export class CreateBinModal extends Modal {
  constructor() {
    super('create-bin-modal');
    this.setupSaveButton();
  }

  setupSaveButton() {
    const saveBtn = document.getElementById('save-bin-btn');
    this.addEventListener(saveBtn, 'click', async () => {
      await this.createBin();
    });
  }

  onOpen() {
    this.clearForm(['new-bin-id', 'new-bin-description']);
    document.getElementById('new-bin-slots').value = '1';
  }

  async createBin() {
    const binId = document.getElementById('new-bin-id').value.trim();
    const description = document.getElementById('new-bin-description').value.trim();
    const numSlots = parseInt(document.getElementById('new-bin-slots').value);

    if (!binId) {
      alert('Please enter a bin ID');
      return;
    }

    try {
      await PartsAPI.createBin(binId, description);

      // Create slots
      for (let i = 1; i <= numSlots; i++) {
        await PartsAPI.createSlot(binId, i, null, 0);
      }

      this.close();
      this.emit('bin-created', { binId });
    } catch (error) {
      console.error('Create bin error:', error);
      alert('Error creating bin. The bin ID might already exist.');
    }
  }
}
