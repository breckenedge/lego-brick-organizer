// Search View Component
import { Component } from '../base/Component.js';
import { PartsAPI } from '../../api/partsApi.js';
import { PartCard } from '../ui/PartCard.js';
import { debounce } from '../../utils/debounce.js';

export class SearchView extends Component {
  constructor() {
    super('search-results');
    this.searchInput = document.getElementById('search-input');
    this.searchBtn = document.getElementById('search-btn');
    this.setupListeners();
  }

  setupListeners() {
    const debouncedSearch = debounce(() => {
      this.performSearch();
    }, 500);

    this.addEventListener(this.searchInput, 'keyup', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      } else {
        debouncedSearch();
      }
    });

    this.addEventListener(this.searchBtn, 'click', () => {
      this.performSearch();
    });

    // Delegate clicks on assign buttons
    this.addEventListener(this.container, 'click', (e) => {
      const assignBtn = e.target.closest('[data-action="assign-to-bin"]');
      if (assignBtn) {
        const partNum = assignBtn.dataset.partNum;
        const partName = assignBtn.dataset.partName;
        this.emit('assign-to-bin-requested', { partNum, partName });
      }
    });

    // Listen for part assignments to refresh results
    this.on('part-assigned-to-bin', () => {
      this.performSearch();
    });
  }

  async performSearch() {
    const query = this.searchInput.value.trim();

    if (!query) {
      this.setHTML('<p class="help-text">Enter a part number or name to search the catalog</p>');
      return;
    }

    this.setHTML('<p class="help-text">Searching...</p>');

    try {
      const data = await PartsAPI.searchParts(query, 50);

      if (data.parts.length === 0) {
        this.setHTML('<p class="help-text">No parts found</p>');
        return;
      }

      this.displaySearchResults(data.parts);
    } catch (error) {
      console.error('Search error:', error);
      this.setHTML('<p class="help-text">Error performing search</p>');
    }
  }

  displaySearchResults(parts) {
    const assignedParts = parts.filter(p => p.bin_id && p.slot_number !== null);
    const unassignedParts = parts.filter(p => !p.bin_id || p.slot_number === null);

    let html = '';

    if (assignedParts.length > 0) {
      html += '<h3 class="results-section-title">Assigned Parts</h3>';
      html += assignedParts.map(part => PartCard.render(part, false)).join('');
    }

    if (unassignedParts.length > 0) {
      html += '<h3 class="results-section-title">Unassigned Parts</h3>';
      html += unassignedParts.map(part => PartCard.render(part, true)).join('');
    }

    this.setHTML(html || '<p class="help-text">No results found.</p>');
  }

  show() {
    // Called when view is activated
  }
}
