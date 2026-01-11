// LEGO Parts Organizer - Frontend Application

class LegoPartsApp {
  constructor() {
    this.currentView = 'search';
    this.currentBin = null;
    this.currentSlot = null;
    this.searchDebounceTimer = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadBins();
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view);
      });
    });

    // Search
    document.getElementById('search-input').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      } else {
        this.debounceSearch();
      }
    });

    document.getElementById('search-btn').addEventListener('click', () => {
      this.performSearch();
    });

    // Create bin modal
    document.getElementById('create-bin-btn').addEventListener('click', () => {
      this.openCreateBinModal();
    });

    document.getElementById('save-bin-btn').addEventListener('click', () => {
      this.createBin();
    });

    // Assign part modal
    document.getElementById('save-assignment-btn').addEventListener('click', () => {
      this.saveAssignment();
    });

    // Assign to bin modal
    document.getElementById('save-to-bin-btn').addEventListener('click', () => {
      this.saveAssignToBin();
    });

    // Part number autocomplete
    document.getElementById('assign-part-num').addEventListener('keyup', (e) => {
      this.searchPartAutocomplete(e.target.value);
    });

    // Generate labels
    document.getElementById('generate-labels-btn').addEventListener('click', () => {
      this.generateLabels();
    });

    // Modal close buttons
    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.closeModal(e.target.closest('.modal'));
      });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });
  }

  switchView(view) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === `${view}-view`);
    });

    this.currentView = view;

    // Load data for view
    if (view === 'bins') {
      this.loadBins();
    } else if (view === 'labels') {
      this.loadBinsForLabels();
    }
  }

  debounceSearch() {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.performSearch();
    }, 500);
  }

  async performSearch() {
    const query = document.getElementById('search-input').value.trim();
    const resultsDiv = document.getElementById('search-results');

    if (!query) {
      resultsDiv.innerHTML = '<p class="help-text">Enter a part number or name to search the catalog</p>';
      return;
    }

    resultsDiv.innerHTML = '<p class="help-text">Searching...</p>';

    try {
      const response = await fetch(`/api/parts/search?q=${encodeURIComponent(query)}&limit=50`);
      const data = await response.json();

      if (data.parts.length === 0) {
        resultsDiv.innerHTML = '<p class="help-text">No parts found</p>';
        return;
      }

      this.displaySearchResults(data.parts);
    } catch (error) {
      console.error('Search error:', error);
      resultsDiv.innerHTML = '<p class="help-text">Error performing search</p>';
    }
  }

  displaySearchResults(parts) {
    const resultsDiv = document.getElementById('search-results');

    // Separate assigned and unassigned parts
    const assignedParts = parts.filter(p => p.bin_id && p.slot_number !== null);
    const unassignedParts = parts.filter(p => !p.bin_id || p.slot_number === null);

    let html = '';

    // Display assigned parts first
    if (assignedParts.length > 0) {
      html += '<h3 class="results-section-title">Assigned Parts</h3>';
      html += assignedParts.map(part => `
        <div class="part-card">
          <div class="part-image">
            <img src="/api/parts/${part.part_num}/drawing" alt="${part.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-family=%22Arial%22 font-size=%2214%22>No image</text></svg>'">
          </div>
          <div class="part-info">
            <h3>${part.part_num}</h3>
            <p class="part-name">${part.name}</p>
            ${part.category_name ? `<p><small>${part.category_name}</small></p>` : ''}
            ${this.formatPartLocation(part)}
          </div>
        </div>
      `).join('');
    }

    // Display unassigned parts with assign button
    if (unassignedParts.length > 0) {
      html += '<h3 class="results-section-title">Unassigned Parts</h3>';
      html += unassignedParts.map(part => `
        <div class="part-card">
          <div class="part-image">
            <img src="/api/parts/${part.part_num}/drawing" alt="${part.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-family=%22Arial%22 font-size=%2214%22>No image</text></svg>'">
          </div>
          <div class="part-info">
            <h3>${part.part_num}</h3>
            <p class="part-name">${part.name}</p>
            ${part.category_name ? `<p><small>${part.category_name}</small></p>` : ''}
            ${this.formatPartLocation(part)}
            <button class="btn-secondary" onclick="app.openAssignToBinModal('${part.part_num}', '${part.name.replace(/'/g, "\\'")}')">Assign to Bin</button>
          </div>
        </div>
      `).join('');
    }

    resultsDiv.innerHTML = html || '<p class="help-text">No results found.</p>';
  }

  formatPartLocation(part) {
    if (part.bin_id && part.slot_number !== null) {
      return `
        <div class="part-location">
          <strong>Location:</strong> Bin ${part.bin_id}, Slot ${part.slot_number}
          ${part.quantity ? `<br><strong>Qty:</strong> ${part.quantity}` : ''}
        </div>
      `;
    }
    return '<div class="part-location empty">Not assigned to a bin</div>';
  }

  async loadBins() {
    const binsDiv = document.getElementById('bins-list');
    binsDiv.innerHTML = '<p class="help-text">Loading bins...</p>';

    try {
      const response = await fetch('/api/bins');
      const data = await response.json();

      if (data.bins.length === 0) {
        binsDiv.innerHTML = '<p class="help-text">No bins created yet. Click "Create New Bin" to get started.</p>';
        return;
      }

      this.displayBins(data.bins);
    } catch (error) {
      console.error('Load bins error:', error);
      binsDiv.innerHTML = '<p class="help-text">Error loading bins</p>';
    }
  }

  displayBins(bins) {
    const binsDiv = document.getElementById('bins-list');

    binsDiv.innerHTML = `
      <div class="bins-grid">
        ${bins.map(bin => `
          <div class="bin-card" onclick="app.viewBinDetails('${bin.bin_id}')">
            <h3>Bin ${bin.bin_id}</h3>
            ${bin.description ? `<p>${bin.description}</p>` : ''}
            <div class="bin-stats">
              <p><strong>${bin.filled_slots}</strong> / ${bin.slot_count} slots filled</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  async viewBinDetails(binId) {
    this.currentBin = binId;

    const binsDiv = document.getElementById('bins-list');
    binsDiv.innerHTML = '<p class="help-text">Loading bin details...</p>';

    try {
      const response = await fetch(`/api/bins/${binId}`);
      const bin = await response.json();

      this.displayBinDetails(bin);
    } catch (error) {
      console.error('Load bin details error:', error);
      binsDiv.innerHTML = '<p class="help-text">Error loading bin details</p>';
    }
  }

  displayBinDetails(bin) {
    const binsDiv = document.getElementById('bins-list');

    binsDiv.innerHTML = `
      <div class="bin-details">
        <div class="bin-header">
          <div>
            <h2>Bin ${bin.bin_id}</h2>
            ${bin.description ? `<p>${bin.description}</p>` : ''}
          </div>
          <button class="back-btn" onclick="app.loadBins()">Back to Bins</button>
        </div>

        <div class="slots-grid">
          ${bin.slots.length === 0 ?
            '<p class="help-text">No slots in this bin. Add slots by clicking below.</p>' :
            bin.slots.map(slot => `
              <div class="slot-card ${slot.part_num ? 'filled' : 'empty'}"
                   onclick="app.openAssignPartModal('${bin.bin_id}', ${slot.slot_number}, ${slot.id})">
                <button class="delete-slot-btn" onclick="app.removeSlot(${slot.id}, '${bin.bin_id}', event)" title="Remove slot">×</button>
                <div class="slot-number">Slot ${slot.slot_number}</div>
                <div class="slot-content">
                  ${slot.part_num ? `
                    <div class="part-num">${slot.part_num}</div>
                    <div class="part-name">${slot.part_name || 'Unknown part'}</div>
                    ${slot.quantity ? `<div class="quantity">Qty: ${slot.quantity}</div>` : ''}
                    ${slot.notes ? `<div class="notes"><small>${slot.notes}</small></div>` : ''}
                  ` : `
                    <div>Empty - Click to assign</div>
                  `}
                </div>
              </div>
            `).join('')
          }
        </div>

        <div style="margin-top: 20px;">
          <button class="primary-btn" onclick="app.addSlotsToCurrentBin()">Add Slots</button>
        </div>
      </div>
    `;
  }

  async addSlotsToCurrentBin() {
    const count = prompt('How many slots to add?', '12');
    if (!count) return;

    const numSlots = parseInt(count);
    if (isNaN(numSlots) || numSlots < 1 || numSlots > 100) {
      alert('Please enter a valid number between 1 and 100');
      return;
    }

    try {
      // Get current max slot number
      const response = await fetch(`/api/bins/${this.currentBin}`);
      const bin = await response.json();

      const maxSlot = bin.slots.length > 0
        ? Math.max(...bin.slots.map(s => s.slot_number))
        : 0;

      // Create new slots
      for (let i = 1; i <= numSlots; i++) {
        await fetch('/api/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bin_id: this.currentBin,
            slot_number: maxSlot + i,
            part_num: null,
            quantity: 0
          })
        });
      }

      // Reload bin details
      this.viewBinDetails(this.currentBin);
    } catch (error) {
      console.error('Add slots error:', error);
      alert('Error adding slots');
    }
  }

  async removeSlot(slotId, binId, event) {
    // Prevent the slot card click event from firing
    event.stopPropagation();

    if (!confirm('Are you sure you want to remove this slot?')) {
      return;
    }

    try {
      const response = await fetch(`/api/slots/${slotId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove slot');
      }

      // Reload bin details
      this.viewBinDetails(binId);
    } catch (error) {
      console.error('Remove slot error:', error);
      alert('Error removing slot');
    }
  }

  openCreateBinModal() {
    const modal = document.getElementById('create-bin-modal');
    modal.classList.add('active');

    // Clear form
    document.getElementById('new-bin-id').value = '';
    document.getElementById('new-bin-description').value = '';
    document.getElementById('new-bin-slots').value = '12';
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
      // Create bin
      const response = await fetch('/api/bins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bin_id: binId, description })
      });

      if (!response.ok) {
        throw new Error('Failed to create bin');
      }

      // Create slots
      for (let i = 1; i <= numSlots; i++) {
        await fetch('/api/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bin_id: binId,
            slot_number: i,
            part_num: null,
            quantity: 0
          })
        });
      }

      // Close modal and reload bins
      this.closeModal(document.getElementById('create-bin-modal'));
      this.loadBins();
    } catch (error) {
      console.error('Create bin error:', error);
      alert('Error creating bin. The bin ID might already exist.');
    }
  }

  openAssignPartModal(binId, slotNumber, slotId) {
    this.currentSlot = { binId, slotNumber, slotId };

    const modal = document.getElementById('assign-part-modal');
    modal.classList.add('active');

    // Set slot info
    modal.querySelector('.slot-info').textContent = `Bin ${binId} - Slot ${slotNumber}`;

    // Clear form
    document.getElementById('assign-part-num').value = '';
    document.getElementById('assign-quantity').value = '0';
    document.getElementById('assign-notes').value = '';
    document.getElementById('part-suggestions').classList.remove('active');
  }

  async searchPartAutocomplete(query) {
    const suggestionsDiv = document.getElementById('part-suggestions');

    if (!query || query.length < 2) {
      suggestionsDiv.classList.remove('active');
      return;
    }

    try {
      const response = await fetch(`/api/parts/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();

      if (data.parts.length === 0) {
        suggestionsDiv.classList.remove('active');
        return;
      }

      suggestionsDiv.innerHTML = data.parts.map(part => `
        <div class="suggestion-item" onclick="app.selectPart('${part.part_num}', '${part.name.replace(/'/g, "\\'")}')">
          <img class="suggestion-preview" src="/api/parts/${part.part_num}/drawing" alt="${part.name}">
          <div class="suggestion-info">
            <strong>${part.part_num}</strong>
            <span class="suggestion-name">${part.name}</span>
          </div>
        </div>
      `).join('');

      suggestionsDiv.classList.add('active');
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }

  selectPart(partNum, partName) {
    document.getElementById('assign-part-num').value = partNum;
    document.getElementById('part-suggestions').classList.remove('active');
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
      const method = this.currentSlot.slotId ? 'PUT' : 'POST';
      const url = this.currentSlot.slotId
        ? `/api/slots/${this.currentSlot.slotId}`
        : '/api/slots';

      const body = this.currentSlot.slotId
        ? { part_num: partNum, quantity, notes }
        : {
            bin_id: this.currentSlot.binId,
            slot_number: this.currentSlot.slotNumber,
            part_num: partNum,
            quantity,
            notes
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to save assignment');
      }

      // Close modal and reload bin details
      this.closeModal(document.getElementById('assign-part-modal'));
      this.viewBinDetails(this.currentSlot.binId);
    } catch (error) {
      console.error('Save assignment error:', error);
      alert('Error saving assignment. Make sure the part number exists.');
    }
  }

  async loadBinsForLabels() {
    const select = document.getElementById('label-bin-select');

    try {
      const response = await fetch('/api/bins');
      const data = await response.json();

      select.innerHTML = '<option value="">-- Select a bin --</option>' +
        data.bins.map(bin => `
          <option value="${bin.bin_id}">Bin ${bin.bin_id}${bin.description ? ' - ' + bin.description : ''}</option>
        `).join('');
    } catch (error) {
      console.error('Load bins error:', error);
    }
  }

  async generateLabels() {
    const binId = document.getElementById('label-bin-select').value;
    const previewDiv = document.getElementById('labels-preview');

    if (!binId) {
      alert('Please select a bin');
      return;
    }

    previewDiv.innerHTML = '<p class="help-text">Generating labels...</p>';

    try {
      const response = await fetch(`/api/bins/${binId}/labels`);
      const data = await response.json();

      if (data.labels.length === 0) {
        previewDiv.innerHTML = '<p class="help-text">No parts assigned to this bin</p>';
        return;
      }

      this.displayLabels(data);
    } catch (error) {
      console.error('Generate labels error:', error);
      previewDiv.innerHTML = '<p class="help-text">Error generating labels</p>';
    }
  }

  displayLabels(data) {
    const previewDiv = document.getElementById('labels-preview');

    previewDiv.innerHTML = `
      <div class="labels-container">
        <h2>Labels for Bin ${data.bin_id}</h2>
        <div class="label-sheet">
          ${data.labels.map(label => `
            <div class="label">
              <div class="label-slot">${label.slot_number}</div>
              <div class="label-info">
                <div class="part-num">${label.part_num}</div>
                <div class="part-name">${label.part_name || 'Unknown part'}</div>
              </div>
              <div class="label-quantity">Qty: ${label.quantity || 0}</div>
            </div>
          `).join('')}
        </div>
        <button class="primary-btn print-btn" onclick="window.print()">Print Labels</button>
      </div>
    `;
  }

  async openAssignToBinModal(partNum, partName) {
    const modal = document.getElementById('assign-to-bin-modal');
    const partInfoDisplay = modal.querySelector('.part-info-display');

    partInfoDisplay.innerHTML = `<strong>Part:</strong> ${partNum} - ${partName}`;

    // Store part info
    this.currentPartToAssign = { partNum, partName };

    // Reset the form
    document.getElementById('assignment-option').value = '';
    document.getElementById('assign-to-bin-quantity').value = '0';
    document.getElementById('assign-to-bin-notes').value = '';

    // Hide all sections
    document.querySelectorAll('.assignment-section').forEach(section => {
      section.style.display = 'none';
    });
    document.getElementById('common-fields').style.display = 'none';

    // Load bins for the dropdowns
    await this.loadBinsForAssignment();

    modal.classList.add('active');

    // Set up event listeners
    this.setupAssignToBinListeners();
  }

  async loadBinsForAssignment() {
    try {
      const response = await fetch('/api/bins');
      const data = await response.json();

      // Populate bin dropdowns
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

  setupAssignToBinListeners() {
    const modal = document.getElementById('assign-to-bin-modal');
    const assignmentOption = document.getElementById('assignment-option');

    // Remove old listener if exists
    if (this.assignmentOptionHandler) {
      assignmentOption.removeEventListener('change', this.assignmentOptionHandler);
    }

    this.assignmentOptionHandler = () => {
      const value = assignmentOption.value;

      // Hide all sections first
      document.querySelectorAll('.assignment-section').forEach(section => {
        section.style.display = 'none';
      });

      // Show relevant section
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
    };

    assignmentOption.addEventListener('change', this.assignmentOptionHandler);

    // Set up bin selection handler for new-slot option
    const existingBinSelect = document.getElementById('assign-existing-bin');
    if (this.existingBinHandler) {
      existingBinSelect.removeEventListener('change', this.existingBinHandler);
    }

    this.existingBinHandler = async () => {
      const binId = existingBinSelect.value;
      if (binId) {
        await this.loadNextSlotInfo(binId);
      }
    };

    existingBinSelect.addEventListener('change', this.existingBinHandler);

    // Set up bin selection handler for existing-slot option
    const slotBinSelect = document.getElementById('assign-slot-bin');
    if (this.slotBinHandler) {
      slotBinSelect.removeEventListener('change', this.slotBinHandler);
    }

    this.slotBinHandler = async () => {
      const binId = slotBinSelect.value;
      if (binId) {
        await this.loadSlotsForBin(binId);
      }
    };

    slotBinSelect.addEventListener('change', this.slotBinHandler);
  }

  async loadNextSlotInfo(binId) {
    try {
      const response = await fetch(`/api/bins/${binId}`);
      const data = await response.json();

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
      const response = await fetch(`/api/bins/${binId}`);
      const data = await response.json();

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

  async saveAssignToBin() {
    const option = document.getElementById('assignment-option').value;
    const quantity = parseInt(document.getElementById('assign-to-bin-quantity').value) || 0;
    const notes = document.getElementById('assign-to-bin-notes').value.trim();
    const partNum = this.currentPartToAssign.partNum;

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

      this.closeModal(document.getElementById('assign-to-bin-modal'));

      // Refresh search results if on search view
      if (document.getElementById('search-view').classList.contains('active')) {
        this.performSearch();
      }
    } catch (error) {
      console.error('Save assignment error:', error);
      alert('Error assigning part. Please try again.');
    }
  }

  async saveAsNewBin(partNum, quantity, notes) {
    const binId = document.getElementById('assign-new-bin-id').value.trim();
    const description = document.getElementById('assign-new-bin-description').value.trim();
    const numSlots = parseInt(document.getElementById('assign-new-bin-slots').value) || 12;
    const slotNumber = parseInt(document.getElementById('assign-new-bin-slot-number').value) || 1;

    if (!binId) {
      alert('Please enter a Bin ID');
      return;
    }

    if (slotNumber > numSlots) {
      alert('Slot number cannot be greater than the number of slots');
      return;
    }

    // Create the bin
    const binResponse = await fetch('/api/bins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bin_id: binId, description, num_slots: numSlots })
    });

    if (!binResponse.ok) throw new Error('Failed to create bin');

    // Assign the part to the specified slot
    const slotResponse = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bin_id: binId,
        slot_number: slotNumber,
        part_num: partNum,
        quantity,
        notes
      })
    });

    if (!slotResponse.ok) throw new Error('Failed to assign part');

    alert(`Part assigned to new bin ${binId}, slot ${slotNumber}`);
  }

  async saveAsNewSlot(partNum, quantity, notes) {
    const binId = document.getElementById('assign-existing-bin').value;

    if (!binId) {
      alert('Please select a bin');
      return;
    }

    // Get next slot number
    const binResponse = await fetch(`/api/bins/${binId}`);
    const binData = await binResponse.json();
    const slots = binData.slots || [];
    const nextSlotNumber = slots.length > 0
      ? Math.max(...slots.map(s => s.slot_number)) + 1
      : 1;

    // Create new slot with the part
    const response = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bin_id: binId,
        slot_number: nextSlotNumber,
        part_num: partNum,
        quantity,
        notes
      })
    });

    if (!response.ok) throw new Error('Failed to create slot');

    alert(`Part assigned to bin ${binId}, slot ${nextSlotNumber}`);
  }

  async saveToExistingSlot(partNum, quantity, notes) {
    const slotId = document.getElementById('assign-slot-number').value;

    if (!slotId) {
      alert('Please select a slot');
      return;
    }

    const response = await fetch(`/api/slots/${slotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        part_num: partNum,
        quantity,
        notes
      })
    });

    if (!response.ok) throw new Error('Failed to update slot');

    alert('Part assigned to slot successfully');
  }

  closeModal(modal) {
    modal.classList.remove('active');
  }
}

// Initialize app
const app = new LegoPartsApp();
