// Labels View Component
import { html } from 'lit';
import { Component } from '../base/Component.js';
import { PartsAPI } from '../../api/partsApi.js';

export class LabelsView extends Component {
  constructor() {
    super();
    this.labels = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setupListeners();
  }

  setupListeners() {
    if (this._listenersSetup) return;
    this._listenersSetup = true;

    const generateBtn = document.getElementById('generate-labels-btn');
    this.addManagedListener(generateBtn, 'click', async () => {
      await this.generateLabels();
    });

    // Delegate clicks on print button
    this.addManagedListener(this, 'click', (e) => {
      const printBtn = e.target.closest('.print-btn');
      if (printBtn) {
        window.print();
      }
    });
  }

  async loadBinsForLabels() {
    try {
      const data = await PartsAPI.getAllBins();
      const binSelect = document.getElementById('label-bin-select');

      binSelect.innerHTML = '<option value="">-- Select a bin --</option>' +
        data.bins.map(bin => `
          <option value="${bin.bin_id}">Bin ${bin.bin_id}${bin.description ? ' - ' + bin.description : ''}</option>
        `).join('');
    } catch (error) {
      console.error('Load bins error:', error);
    }
  }

  async generateLabels() {
    const binSelect = document.getElementById('label-bin-select');
    const binId = binSelect.value;

    if (!binId) {
      alert('Please select a bin');
      return;
    }

    this.labels = { loading: true };
    this.requestUpdate();

    try {
      const data = await PartsAPI.getBinLabels(binId);
      this.labels = data;
      this.requestUpdate();
    } catch (error) {
      console.error('Generate labels error:', error);
      this.labels = { error: true };
      this.requestUpdate();
    }
  }

  show() {
    this.loadBinsForLabels();
  }

  render() {
    if (!this.labels) {
      return html`<p class="help-text">Select a bin to generate labels</p>`;
    }

    if (this.labels.loading) {
      return html`<p class="help-text">Generating labels...</p>`;
    }

    if (this.labels.error) {
      return html`<p class="help-text">Error generating labels</p>`;
    }

    if (this.labels.labels && this.labels.labels.length === 0) {
      return html`<p class="help-text">No parts assigned to this bin</p>`;
    }

    return html`
      <div class="labels-container">
        <h2>Labels for Bin ${this.labels.bin_id}</h2>
        <div class="label-sheet">
          ${this.labels.labels.map(label => html`
            <div class="label">
              <div class="label-slot">${label.slot_number}</div>
              <div class="label-info">
                <div class="part-num">${label.part_num}</div>
                <div class="part-name">${label.part_name || 'Unknown part'}</div>
              </div>
              <div class="label-quantity">Qty: ${label.quantity || 0}</div>
            </div>
          `)}
        </div>
        <button class="primary-btn print-btn">Print Labels</button>
      </div>
    `;
  }
}

customElements.define('labels-view', LabelsView);
