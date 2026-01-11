// Assign To Bin Modal Component
import { Modal } from '../base/Modal.js';
import { PartsAPI } from '../../api/partsApi.js';

export class AssignToBinModal extends Modal {
  constructor() {
    super('assign-to-bin-modal');
    this.currentPart = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const saveBtn = document.getElementById('save-to-bin-btn');
    this.addManagedListener(saveBtn, 'click', async () => {
      await this.saveAssignment();
    });

    const assignmentOption = document.getElementById('assignment-option');
    this.addManagedListener(assignmentOption, 'change', () => {
      this.handleOptionChange();
    });

    const existingBinSelect = document.getElementById('assign-existing-bin');
    this.addManagedListener(existingBinSelect, 'change', async () => {
      const binId = existingBinSelect.value;
      if (binId) {
        await this.loadNextSlotInfo(binId);
      }
    });

    const slotBinSelect = document.getElementById('assign-slot-bin');
    this.addManagedListener(slotBinSelect, 'change', async () => {
      const binId = slotBinSelect.value;
      if (binId) {
        await this.loadSlotsForBin(binId);
      }
    });
  }

  async openForPart(partNum, partName) {
    this.currentPart = { partNum, partName };

    const partInfoDisplay = this.modalElement.querySelector('.part-info-display');
    if (partInfoDisplay) {
      partInfoDisplay.innerHTML = `<strong>Part:</strong> ${partNum} - ${partName}`;
    }

    document.getElementById('assignment-option').value = '';
    document.getElementById('assign-to-bin-quantity').value = '0';
    document.getElementById('assign-to-bin-notes').value = '';

    document.querySelectorAll('.assignment-section').forEach(section => {
      section.style.display = 'none';
    });
    document.getElementById('common-fields').style.display = 'none';

    await this.loadBinsForAssignment();
    this.open();
  }

  handleOptionChange() {
    const value = document.getElementById('assignment-option').value;

    document.querySelectorAll('.assignment-section').forEach(section => {
      section.style.display = 'none';
    });

    if (value === 'new-bin') {
      document.getElementById('new-bin-section').style.display = 'block';
      document.getElementById('common-fields').style.display = 'block';
    } else if (value === 'new-slot') {
      document.getElementById('new-slot-section').style.display = 'block';
      document.getElementById('common-fields').style.display = 'block';
    } else if (value === 'existing-slot') {
      document.getElementById('existing-slot-section').style.display = 'block';
      document.getElementById('common-fields').style.display = 'block';
    } else {
      document.getElementById('common-fields').style.display = 'none';
    }
  }

  async loadBinsForAssignment() {
    try {
      const data = await PartsAPI.getAllBins();

      const binOptions = data.bins.map(bin =>
        `<option value="${bin.bin_id}">Bin ${bin.bin_id}${bin.description ? ' - ' + bin.description : ''}</option>`
      ).join('');

      document.getElementById('assign-existing-bin').innerHTML =
        '<option value="">-- Select a bin --</option>' + binOptions;
      document.getElementById('assign-slot-bin').innerHTML =
        '<option value="">-- Select a bin --</option>' + binOptions;
    } catch (error) {
      console.error('Load bins error:', error);
    }
  }

  async loadNextSlotInfo(binId) {
    try {
      const data = await PartsAPI.getBinDetails(binId);
      const slots = data.slots || [];
      const nextSlotNumber = slots.length > 0
        ? Math.max(...slots.map(s => s.slot_number)) + 1
        : 1;

      document.getElementById('next-slot-info').textContent =
        `This part will be added as slot ${nextSlotNumber}`;
    } catch (error) {
      console.error('Load slot info error:', error);
      document.getElementById('next-slot-info').textContent = 'Error loading bin info';
    }
  }

  async loadSlotsForBin(binId) {
    try {
      const data = await PartsAPI.getBinDetails(binId);
      const slotSelect = document.getElementById('assign-slot-number');
      const slots = data.slots || [];

      if (slots.length === 0) {
        slotSelect.innerHTML = '<option value="">-- No slots in this bin --</option>';
        slotSelect.disabled = true;
        return;
      }

      slotSelect.innerHTML = '<option value="">-- Select a slot --</option>' +
        slots.map(slot => {
          const partInfo = slot.part_num
            ? ` (${slot.part_num}${slot.part_name ? ' - ' + slot.part_name : ''})`
            : ' (empty)';
          return `<option value="${slot.id}">Slot ${slot.slot_number}${partInfo}</option>`;
        }).join('');
      slotSelect.disabled = false;
    } catch (error) {
      console.error('Load slots error:', error);
    }
  }

  async saveAssignment() {
    const option = document.getElementById('assignment-option').value;
    const quantity = parseInt(document.getElementById('assign-to-bin-quantity').value) || 0;
    const notes = document.getElementById('assign-to-bin-notes').value.trim();
    const partNum = this.currentPart.partNum;

    if (!option) {
      alert('Please select an assignment option');
      return;
    }

    try {
      if (option === 'new-bin') {
        await this.saveAsNewBin(partNum, quantity, notes);
      } else if (option === 'new-slot') {
        await this.saveAsNewSlot(partNum, quantity, notes);
      } else if (option === 'existing-slot') {
        await this.saveToExistingSlot(partNum, quantity, notes);
      }

      this.close();
      this.emit('part-assigned-to-bin', { partNum });
    } catch (error) {
      console.error('Save assignment error:', error);
      alert('Error assigning part. Please try again.');
    }
  }

  async saveAsNewBin(partNum, quantity, notes) {
    const binId = document.getElementById('assign-new-bin-id').value.trim();
    const description = document.getElementById('assign-new-bin-description').value.trim();
    const numSlots = parseInt(document.getElementById('assign-new-bin-slots').value) || 1;
    const slotNumber = parseInt(document.getElementById('assign-new-bin-slot-number').value) || 1;

    if (!binId) {
      alert('Please enter a Bin ID');
      return;
    }

    if (slotNumber > numSlots) {
      alert('Slot number cannot be greater than the number of slots');
      return;
    }

    await PartsAPI.createBin(binId, description);
    await PartsAPI.createSlot(binId, slotNumber, partNum, quantity, notes);

    alert(`Part assigned to new bin ${binId}, slot ${slotNumber}`);
  }

  async saveAsNewSlot(partNum, quantity, notes) {
    const binId = document.getElementById('assign-existing-bin').value;

    if (!binId) {
      alert('Please select a bin');
      return;
    }

    const binData = await PartsAPI.getBinDetails(binId);
    const slots = binData.slots || [];
    const nextSlotNumber = slots.length > 0
      ? Math.max(...slots.map(s => s.slot_number)) + 1
      : 1;

    await PartsAPI.createSlot(binId, nextSlotNumber, partNum, quantity, notes);

    alert(`Part assigned to bin ${binId}, slot ${nextSlotNumber}`);
  }

  async saveToExistingSlot(partNum, quantity, notes) {
    const slotId = document.getElementById('assign-slot-number').value;

    if (!slotId) {
      alert('Please select a slot');
      return;
    }

    await PartsAPI.updateSlot(slotId, partNum, quantity, notes);

    alert('Part assigned to slot successfully');
  }
}
