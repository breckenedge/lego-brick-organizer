// Bins View Component
import { html, render } from 'lit-html';
import { Component } from '../base/Component.js';
import { PartsAPI } from '../../api/partsApi.js';
import { BinCard } from '../ui/BinCard.js';
import { SlotCard } from '../ui/SlotCard.js';

export class BinsView extends Component {
  constructor() {
    super('bins-list');
    this.currentBin = null;
    this.createBinBtn = document.getElementById('create-bin-btn');
    this.setupListeners();
  }

  setupListeners() {
    this.addEventListener(this.createBinBtn, 'click', () => {
      this.emit('create-bin-requested');
    });

    // Delegate clicks for bin cards and slot actions
    this.addEventListener(this.container, 'click', async (e) => {
      const viewBinBtn = e.target.closest('[data-action="view-bin"]');
      if (viewBinBtn) {
        const binId = viewBinBtn.dataset.binId;
        await this.viewBinDetails(binId);
        return;
      }

      const assignPartBtn = e.target.closest('[data-action="assign-part"]');
      if (assignPartBtn && !e.target.closest('[data-action="delete-slot"]')) {
        const slotId = assignPartBtn.dataset.slotId;
        const slotNumber = assignPartBtn.dataset.slotNumber;
        this.emit('assign-part-requested', {
          binId: this.currentBin,
          slotNumber: parseInt(slotNumber),
          slotId: parseInt(slotId)
        });
        return;
      }

      const deleteSlotBtn = e.target.closest('[data-action="delete-slot"]');
      if (deleteSlotBtn) {
        e.stopPropagation();
        const slotId = deleteSlotBtn.dataset.slotId;
        await this.removeSlot(parseInt(slotId));
        return;
      }

      const backBtn = e.target.closest('.back-btn');
      if (backBtn) {
        history.pushState(null, '', '/bins');
        await this.loadBins();
        return;
      }

      const addSlotsBtn = e.target.closest('[data-action="add-slots"]');
      if (addSlotsBtn) {
        await this.addSlotsToCurrentBin();
        return;
      }
    });

    // Listen for bin creation to refresh list
    this.on('bin-created', async () => {
      await this.loadBins();
    });

    // Listen for part assignments to refresh bin details
    this.on('part-assigned', async (e) => {
      if (this.currentBin) {
        await this.viewBinDetails(this.currentBin);
      }
    });
  }

  async loadBins() {
    this.currentBin = null;
    render(html`<p class="help-text">Loading bins...</p>`, this.container);

    try {
      const data = await PartsAPI.getAllBins();

      if (data.bins.length === 0) {
        render(html`<p class="help-text">No bins created yet. Click "Create New Bin" to get started.</p>`, this.container);
        return;
      }

      this.displayBins(data.bins);
    } catch (error) {
      console.error('Load bins error:', error);
      render(html`<p class="help-text">Error loading bins</p>`, this.container);
    }
  }

  displayBins(bins) {
    const template = html`
      <div class="bins-grid">
        ${bins.map(bin => BinCard.render(bin))}
      </div>
    `;
    render(template, this.container);
  }

  async viewBinDetails(binId) {
    this.currentBin = binId;

    // Update URL for deep linking (if not already there)
    if (window.location.pathname !== `/bins/${binId}`) {
      history.pushState(null, '', `/bins/${binId}`);
    }

    render(html`<p class="help-text">Loading bin details...</p>`, this.container);

    try {
      const bin = await PartsAPI.getBinDetails(binId);
      this.displayBinDetails(bin);
    } catch (error) {
      console.error('Load bin details error:', error);
      render(html`<p class="help-text">Error loading bin details</p>`, this.container);
    }
  }

  displayBinDetails(bin) {
    const template = html`
      <div class="bin-details">
        <div class="bin-header">
          <div>
            <h2>Bin ${bin.bin_id}</h2>
            ${bin.description ? html`<p>${bin.description}</p>` : ''}
          </div>
          <button class="back-btn">Back to Bins</button>
        </div>

        ${bin.slots.length === 0 ? html`
          <p class="help-text">No slots in this bin. Add slots by clicking below.</p>
        ` : html`
          <div class="slots-grid">
            ${bin.slots.map(slot => SlotCard.render(slot))}
          </div>
        `}

        <div style="margin-top: 20px;">
          <button class="primary-btn" data-action="add-slots">Add Slots</button>
        </div>
      </div>
    `;
    render(template, this.container);
  }

  isShowingDetails() {
    return this.currentBin !== null;
  }

  async addSlotsToCurrentBin() {
    const count = prompt('How many slots to add?', '1');
    if (!count) return;

    const numSlots = parseInt(count);
    if (isNaN(numSlots) || numSlots < 1 || numSlots > 100) {
      alert('Please enter a valid number between 1 and 100');
      return;
    }

    try {
      const bin = await PartsAPI.getBinDetails(this.currentBin);
      const maxSlot = bin.slots.length > 0
        ? Math.max(...bin.slots.map(s => s.slot_number))
        : 0;

      for (let i = 1; i <= numSlots; i++) {
        await PartsAPI.createSlot(this.currentBin, maxSlot + i, null, 0);
      }

      await this.viewBinDetails(this.currentBin);
    } catch (error) {
      console.error('Add slots error:', error);
      alert('Error adding slots');
    }
  }

  async removeSlot(slotId) {
    if (!confirm('Are you sure you want to remove this slot?')) {
      return;
    }

    try {
      await PartsAPI.deleteSlot(slotId);
      await this.viewBinDetails(this.currentBin);
    } catch (error) {
      console.error('Remove slot error:', error);
      alert('Error removing slot');
    }
  }

  show() {
    this.loadBins();
  }
}
