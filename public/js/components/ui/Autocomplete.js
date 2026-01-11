// Autocomplete Component
import { PartsAPI } from '../../api/partsApi.js';
import { debounce } from '../../utils/debounce.js';

export class Autocomplete {
  constructor(inputId, suggestionsId) {
    this.input = document.getElementById(inputId);
    this.suggestionsContainer = document.getElementById(suggestionsId);
    this.onSelectCallback = null;
    this.listeners = [];
    this.setupListeners();
  }

  addManagedListener(element, event, handler) {
    if (element) {
      element.addEventListener(event, handler);
      this.listeners.push({ element, event, handler });
    }
  }

  removeAllEventListeners() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }

  setupListeners() {
    if (!this.input || !this.suggestionsContainer) return;

    const debouncedSearch = debounce(async (query) => {
      await this.search(query);
    }, 300);

    this.addManagedListener(this.input, 'keyup', (e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        debouncedSearch(query);
      } else {
        this.hide();
      }
    });
  }

  async search(query) {
    try {
      const data = await PartsAPI.searchParts(query, 10);

      if (data.parts.length === 0) {
        this.hide();
        return;
      }

      this.renderSuggestions(data.parts);
      this.show();
    } catch (error) {
      console.error('Autocomplete error:', error);
      this.hide();
    }
  }

  renderSuggestions(parts) {
    const html = parts.map(part => `
      <div class="suggestion-item" data-action="select-part" data-part-num="${part.part_num}" data-part-name="${part.name}">
        <img class="suggestion-preview" src="${PartsAPI.getPartDrawingURL(part.part_num)}" alt="${part.name}">
        <div class="suggestion-info">
          <strong>${part.part_num}</strong>
          <span class="suggestion-name">${part.name}</span>
        </div>
      </div>
    `).join('');

    this.suggestionsContainer.innerHTML = html;

    // Set up click handlers for suggestions
    this.suggestionsContainer.querySelectorAll('[data-action="select-part"]').forEach(item => {
      this.addManagedListener(item, 'click', () => {
        const partNum = item.dataset.partNum;
        const partName = item.dataset.partName;
        this.selectPart(partNum, partName);
      });
    });
  }

  selectPart(partNum, partName) {
    this.input.value = partNum;
    this.hide();

    if (this.onSelectCallback) {
      this.onSelectCallback(partNum, partName);
    }
  }

  onSelect(callback) {
    this.onSelectCallback = callback;
  }

  show() {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.classList.add('active');
    }
  }

  hide() {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.classList.remove('active');
    }
  }

  clear() {
    if (this.input) {
      this.input.value = '';
    }
    this.hide();
  }
}
