// Search View Component
import { html } from 'lit';
import { Component } from '../base/Component.js';
import { PartsAPI } from '../../api/partsApi.js';
import { PartCard } from '../ui/PartCard.js';
import { debounce } from '../../utils/debounce.js';

export class SearchView extends Component {
  constructor() {
    super();
    this.searchResults = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setupListeners();
  }

  setupListeners() {
    if (this._listenersSetup) return;
    this._listenersSetup = true;

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    const debouncedSearch = debounce(() => {
      this.performSearch();
    }, 500);

    this.addManagedListener(searchInput, 'keyup', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      } else {
        debouncedSearch();
      }
    });

    this.addManagedListener(searchBtn, 'click', () => {
      this.performSearch();
    });

    // Delegate clicks on assign buttons
    this.addManagedListener(this, 'click', (e) => {
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
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();

    if (!query) {
      this.searchResults = { empty: true };
      this.requestUpdate();
      return;
    }

    this.searchResults = { loading: true };
    this.requestUpdate();

    try {
      const data = await PartsAPI.searchParts(query, 50);
      this.searchResults = { parts: data.parts };
      this.requestUpdate();
    } catch (error) {
      console.error('Search error:', error);
      this.searchResults = { error: true };
      this.requestUpdate();
    }
  }

  show() {
    // Called when view is activated
  }

  render() {
    if (!this.searchResults || this.searchResults.empty) {
      return html`<p class="help-text">Enter a part number or name to search the catalog</p>`;
    }

    if (this.searchResults.loading) {
      return html`<p class="help-text">Searching...</p>`;
    }

    if (this.searchResults.error) {
      return html`<p class="help-text">Error performing search</p>`;
    }

    const parts = this.searchResults.parts || [];

    if (parts.length === 0) {
      return html`<p class="help-text">No parts found</p>`;
    }

    const assignedParts = parts.filter(p => p.bin_id && p.slot_number !== null);
    const unassignedParts = parts.filter(p => !p.bin_id || p.slot_number === null);

    return html`
      ${assignedParts.length > 0 ? html`
        <h3 class="results-section-title">Assigned Parts</h3>
        ${assignedParts.map(part => PartCard.render(part, false))}
      ` : ''}
      ${unassignedParts.length > 0 ? html`
        <h3 class="results-section-title">Unassigned Parts</h3>
        ${unassignedParts.map(part => PartCard.render(part, true))}
      ` : ''}
    `;
  }
}

customElements.define('search-view', SearchView);
