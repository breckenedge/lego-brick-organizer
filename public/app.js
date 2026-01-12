// LEGO Parts Organizer - Main Application (Refactored)
import { Router } from './js/router/Router.js';
import { SearchView } from './js/components/views/SearchView.js';
import { BinsView } from './js/components/views/BinsView.js';
import { LabelsView } from './js/components/views/LabelsView.js';
import { CreateBinModal } from './js/components/modals/CreateBinModal.js';
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
      bins: new BinsView(),
      labels: new LabelsView()
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

  setupRoutes() {
    // Define all application routes
    this.router.addRoute('/', () => this.switchView('search', false));
    this.router.addRoute('/search', () => this.switchView('search', false));
    this.router.addRoute('/bins', () => {
      this.switchView('bins', false);
      // If currently showing bin details, return to list view
      if (this.views.bins.isShowingDetails()) {
        this.views.bins.loadBins();
      }
    });
    this.router.addRoute('/bins/:binId', (params) => {
      this.switchView('bins', false);
      this.views.bins.viewBinDetails(params.binId);
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
