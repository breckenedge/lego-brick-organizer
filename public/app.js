// LEGO Parts Organizer - Main Application (Refactored)
import { Router } from './js/router/Router.js';
import { SearchView } from './js/components/views/SearchView.js';
import { ContainersView } from './js/components/views/ContainersView.js';
import { LabelsView } from './js/components/views/LabelsView.js';
import { CreateContainerModal } from './js/components/modals/CreateContainerModal.js';
import { AssignPartModal } from './js/components/modals/AssignPartModal.js';
import { AssignToBinModal } from './js/components/modals/AssignToBinModal.js';

class LegoPartsApp {
  constructor() {
    this.currentView = 'search';
    this.router = new Router();
    this.initializeComponents();
    this.setupRoutes();
    this.setupNavigation();
    this.router.init(); // Start listening to popstate
  }

  initializeComponents() {
    // Initialize views
    this.views = {
      search: new SearchView(),
      bins: new ContainersView(),  // Using ContainersView but keeping 'bins' key for URL compatibility
      labels: new LabelsView()
    };

    // Initialize modals
    this.modals = {
      createBin: new CreateContainerModal(),  // Using CreateContainerModal but keeping key for compatibility
      assignPart: new AssignPartModal(),
      assignToBin: new AssignToBinModal()
    };

    // Set up event listeners for inter-component communication
    this.setupEventListeners();
  }

  setupRoutes() {
    // Define all application routes
    this.router.addRoute('/', () => this.switchView('search', false));
    this.router.addRoute('/search', () => this.switchView('search', false));
    this.router.addRoute('/bins', () => {
      this.switchView('bins', false);
      // Load root containers
      this.views.bins.show();
    });
    this.router.addRoute('/bins/:containerId', (params) => {
      this.switchView('bins', false);
      this.views.bins.viewContainerDetails(parseInt(params.containerId));
    });
    this.router.addRoute('/labels', () => this.switchView('labels', false));
  }

  setupNavigation() {
    // Intercept navigation link clicks to use router instead of default behavior
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = e.target.getAttribute('href');
        this.router.navigate(path);
      });
    });
  }

  setupEventListeners() {
    // Create container requests
    document.addEventListener('create-bin-requested', () => {
      this.modals.createBin.open();
    });

    document.addEventListener('create-container-requested', (e) => {
      const { parentId } = e.detail || {};
      this.modals.createBin.open({ parentId });
    });

    // Assign part requests
    document.addEventListener('assign-part-requested', (e) => {
      const { containerId, binId, slotNumber, slotId } = e.detail;

      // Support both new (containerId) and legacy (binId) formats
      if (containerId) {
        this.modals.assignPart.openForContainer(containerId);
      } else if (binId) {
        this.modals.assignPart.openForSlot(binId, slotNumber, slotId);
      }
    });

    // Assign to bin requests
    document.addEventListener('assign-to-bin-requested', (e) => {
      const { partNum, partName } = e.detail;
      this.modals.assignToBin.openForPart(partNum, partName);
    });
  }

  switchView(view, updateURL = true) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === `${view}-view`);
    });

    this.currentView = view;

    // Call view's show method to load data
    if (this.views[view] && this.views[view].show) {
      this.views[view].show();
    }

    // Update URL if needed (prevent loops when called from route handler)
    if (updateURL) {
      const path = view === 'search' ? '/search' : `/${view}`;
      this.router.navigate(path, { replace: true });
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new LegoPartsApp();
  });
} else {
  window.app = new LegoPartsApp();
}
