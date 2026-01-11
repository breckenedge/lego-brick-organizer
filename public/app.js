// LEGO Parts Organizer - Main Application (Refactored)
import { SearchView } from './js/components/views/SearchView.js';
import { BinsView } from './js/components/views/BinsView.js';
import { LabelsView } from './js/components/views/LabelsView.js';
import { CreateBinModal } from './js/components/modals/CreateBinModal.js';
import { AssignPartModal } from './js/components/modals/AssignPartModal.js';
import { AssignToBinModal } from './js/components/modals/AssignToBinModal.js';

class LegoPartsApp {
  constructor() {
    this.currentView = 'search';
    this.initializeComponents();
    this.setupNavigation();
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

  setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view);
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

    // Call view's show method to load data
    if (this.views[view] && this.views[view].show) {
      this.views[view].show();
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
