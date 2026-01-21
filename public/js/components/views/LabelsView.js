// Labels View Component
import { html, render } from 'lit-html';
import { Component } from '../base/Component.js';
import { PartsAPI } from '../../api/partsApi.js';

export class LabelsView extends Component {
  constructor() {
    super('labels-preview');
    this.binSelect = document.getElementById('label-bin-select');
    this.generateBtn = document.getElementById('generate-labels-btn');
    this.setupListeners();
  }

  setupListeners() {
    this.addEventListener(this.generateBtn, 'click', async () => {
      await this.generateLabels();
    });

    // Delegate clicks on print button
    this.addEventListener(this.container, 'click', (e) => {
      const printBtn = e.target.closest('.print-btn');
      if (printBtn) {
        window.print();
      }
    });
  }

  async loadBinsForLabels() {
    try {
      const data = await PartsAPI.getAllBins();

      this.binSelect.innerHTML = '<option value="">-- Select a bin --</option>' +
        data.bins.map(bin => `
          <option value="${bin.bin_id}">Bin ${bin.bin_id}${bin.description ? ' - ' + bin.description : ''}</option>
        `).join('');
    } catch (error) {
      console.error('Load bins error:', error);
    }
  }

  async generateLabels() {
    const binId = this.binSelect.value;

    if (!binId) {
      alert('Please select a bin');
      return;
    }

    render(html`<p class="help-text">Generating labels...</p>`, this.container);

    try {
      const data = await PartsAPI.getBinLabels(binId);

      if (data.labels.length === 0) {
        render(html`<p class="help-text">No parts assigned to this bin</p>`, this.container);
        return;
      }

      this.displayLabels(data);
    } catch (error) {
      console.error('Generate labels error:', error);
      render(html`<p class="help-text">Error generating labels</p>`, this.container);
    }
  }

  displayLabels(data) {
    const template = html`
      <div class="labels-container">
        <h2>Labels for Bin ${data.bin_id}</h2>
        <div class="label-controls">
          <label for="label-width">Width (inches):</label>
          <input type="number" id="label-width" value="2" min="1" max="8" step="0.25" />
          <label for="label-height">Height (inches):</label>
          <input type="number" id="label-height" value="1" min="0.5" max="6" step="0.25" />
          <button class="secondary-btn apply-size-btn">Apply Size</button>
        </div>
        <div class="label-sheet">
          ${data.labels.map(label => html`
            <div class="label" data-bin-id="${data.bin_id}">
              <div class="label-bin">Bin: ${data.bin_id}</div>
              <div class="label-slot">Slot ${label.slot_number}</div>
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
    render(template, this.container);

    // Add event listener for size adjustment
    const applyBtn = this.container.querySelector('.apply-size-btn');
    this.addEventListener(applyBtn, 'click', () => {
      this.applyLabelSize();
    });

    // Apply default size
    this.applyLabelSize();
  }

  applyLabelSize() {
    const width = document.getElementById('label-width').value;
    const height = document.getElementById('label-height').value;

    const labels = this.container.querySelectorAll('.label');
    labels.forEach(label => {
      label.style.width = `${width}in`;
      label.style.height = `${height}in`;
    });
  }

  show() {
    this.loadBinsForLabels();
  }
}
