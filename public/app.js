// LEGO Parts Organizer - Main Application (Refactored)
import { LitElement, html } from 'lit';
import { Router } from '@lit-labs/router';
import './js/components/views/SearchView.js';
import './js/components/views/BinsView.js';
import './js/components/views/LabelsView.js';
import { CreateBinModal } from './js/components/modals/CreateBinModal.js';
import { AssignPartModal } from './js/components/modals/AssignPartModal.js';
import { AssignToBinModal } from './js/components/modals/AssignToBinModal.js';

class LegoPartsApp extends LitElement {
  constructor() {
    super();
    this.currentView = 'search';
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.initializeComponents();
    this.setupNavigation();
    this.initializeRouter();
  }

  initializeComponents() {
    // Mount view components
    const searchContainer = document.getElementById('search-results');
    const binsContainer = document.getElementById('bins-list');
    const labelsContainer = document.getElementById('labels-preview');

    if (!searchContainer.querySelector('search-view')) {
      const searchView = document.createElement('search-view');
      searchContainer.appendChild(searchView);
    }

    if (!binsContainer.querySelector('bins-view')) {
      const binsView = document.createElement('bins-view');
      binsContainer.appendChild(binsView);
    }

    if (!labelsContainer.querySelector('labels-view')) {
      const labelsView = document.createElement('labels-view');
      labelsContainer.appendChild(labelsView);
    }

    // Store references to views
    this.views = {
      search: searchContainer.querySelector('search-view'),
      bins: binsContainer.querySelector('bins-view'),
      labels: labelsContainer.querySelector('labels-view')
    };

    // Initialize modals
    this.modals = {
      createBin: new CreateBinModal(),
      assignPart: new AssignPartModal(),
      assignToBin: new AssignToBinModal()
    };

    // Set up event listeners for inter-component communication
    this.setupEventListeners();
  }

  setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.target.dataset.view;
        this.navigate(`/${view}`);
      });
    });
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  setupEventListeners() {
    // Create bin requests
    document.addEventListener('create-bin-requested', () => {
      this.modals.createBin.open();
    });

    // Assign part requests
    document.addEventListener('assign-part-requested', (e) => {
      const { binId, slotNumber, slotId } = e.detail;
      this.modals.assignPart.openForSlot(binId, slotNumber, slotId);
    });

    // Assign to bin requests
    document.addEventListener('assign-to-bin-requested', (e) => {
      const { partNum, partName } = e.detail;
      this.modals.assignToBin.openForPart(partNum, partName);
    });
  }

  initializeRouter() {
    this.router = new Router(this, [
      {
        path: '/',
        render: () => {
          this.renderView('search');
          return html``;
        }
      },
      {
        path: '/search',
        render: () => {
          this.renderView('search');
          return html``;
        }
      },
      {
        path: '/bins',
        render: () => {
          this.renderView('bins');
          return html``;
        }
      },
      {
        path: '/bins/:binId',
        render: ({ binId }) => {
          const decodedBinId = decodeURIComponent(binId);
          this.renderView('bins', decodedBinId);
          return html``;
        }
      },
      {
        path: '/labels',
        render: () => {
          this.renderView('labels');
          return html``;
        }
      }
    ]);
  }

  render() {
    // Router renders into this
    return html`${this.router.outlet()}`;
  }

  renderView(view, param = null) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === `${view}-view`);
    });

    this.currentView = view;

    // For bins with binId parameter, show bin details
    if (view === 'bins' && param) {
      this.views.bins.showBinDetails(param);
    } else if (this.views[view] && this.views[view].show) {
      // Otherwise call view's show method to load data
      this.views[view].show();
    }
  }

}

customElements.define('lego-parts-app', LegoPartsApp);

// Create a global navigate function
window.navigate = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = document.createElement('lego-parts-app');
    document.body.appendChild(app);
    window.app = app;
  });
} else {
  const app = document.createElement('lego-parts-app');
  document.body.appendChild(app);
  window.app = app;
}
