// Containers View Component
import { html, render } from 'lit-html';
import { Component } from '../base/Component.js';
import { PartsAPI } from '../../api/partsApi.js';

export class ContainersView extends Component {
  constructor() {
    super('containers-list');
    this.currentContainerId = null;
    this.breadcrumbs = [];
    this.createContainerBtn = document.getElementById('create-bin-btn');
    this.setupListeners();
  }

  setupListeners() {
    this.addEventListener(this.createContainerBtn, 'click', () => {
      this.emit('create-container-requested', { parentId: this.currentContainerId });
    });

    // Delegate clicks
    this.addEventListener(this.container, 'click', async (e) => {
      const viewContainerBtn = e.target.closest('[data-action="view-container"]');
      if (viewContainerBtn) {
        const containerId = parseInt(viewContainerBtn.dataset.containerId);
        await this.viewContainerDetails(containerId);
        return;
      }

      const assignPartBtn = e.target.closest('[data-action="assign-part"]');
      if (assignPartBtn) {
        const containerId = parseInt(assignPartBtn.dataset.containerId);
        this.emit('assign-part-requested', { containerId });
        return;
      }

      const removePartBtn = e.target.closest('[data-action="remove-part"]');
      if (removePartBtn) {
        e.stopPropagation();
        const containerId = parseInt(removePartBtn.dataset.containerId);
        const partNum = removePartBtn.dataset.partNum;
        await this.removePartFromContainer(containerId, partNum);
        return;
      }

      const deleteContainerBtn = e.target.closest('[data-action="delete-container"]');
      if (deleteContainerBtn) {
        e.stopPropagation();
        const containerId = parseInt(deleteContainerBtn.dataset.containerId);
        await this.deleteContainer(containerId);
        return;
      }

      const backBtn = e.target.closest('.back-btn');
      if (backBtn) {
        await this.goBack();
        return;
      }

      const breadcrumbLink = e.target.closest('[data-breadcrumb-id]');
      if (breadcrumbLink) {
        e.preventDefault();
        const containerId = breadcrumbLink.dataset.breadcrumbId;
        if (containerId === 'root') {
          await this.loadRootContainers();
        } else {
          await this.viewContainerDetails(parseInt(containerId));
        }
        return;
      }
    });

    // Listen for container creation
    this.on('container-created', async () => {
      if (this.currentContainerId) {
        await this.viewContainerDetails(this.currentContainerId);
      } else {
        await this.loadRootContainers();
      }
    });

    // Listen for part assignments
    this.on('part-assigned', async () => {
      if (this.currentContainerId) {
        await this.viewContainerDetails(this.currentContainerId);
      }
    });
  }

  async loadRootContainers() {
    this.currentContainerId = null;
    this.breadcrumbs = [];
    history.pushState(null, '', '/bins');

    render(html`<p class="help-text">Loading containers...</p>`, this.container);

    try {
      const data = await PartsAPI.getContainers();

      if (data.containers.length === 0) {
        render(html`<p class="help-text">No containers created yet. Click "Create New Bin" to get started.</p>`, this.container);
        return;
      }

      this.displayContainers(data.containers);
    } catch (error) {
      console.error('Load containers error:', error);
      render(html`<p class="help-text">Error loading containers</p>`, this.container);
    }
  }

  displayContainers(containers) {
    const template = html`
      ${this.breadcrumbs.length > 0 ? this.renderBreadcrumbs() : ''}
      <div class="containers-grid">
        ${containers.map(container => this.renderContainerCard(container))}
      </div>
    `;
    render(template, this.container);
  }

  renderBreadcrumbs() {
    return html`
      <div class="breadcrumbs" style="margin-bottom: 20px; font-size: 14px;">
        <a href="#" data-breadcrumb-id="root">Root</a>
        ${this.breadcrumbs.map((crumb, index) => html`
          <span> / </span>
          <a href="#" data-breadcrumb-id="${crumb.id}">${crumb.container_id}</a>
        `)}
      </div>
    `;
  }

  renderContainerCard(container) {
    const hasChildren = container.childCount > 0;
    const hasParts = container.partCount > 0;

    return html`
      <div class="bin-card" data-container-id="${container.id}">
        <div class="bin-header">
          <h3>
            ${container.container_type === 'Bin' || container.can_contain_parts ? '📦' : '📚'}
            ${container.container_id}
          </h3>
          <button
            class="icon-btn delete-btn"
            data-action="delete-container"
            data-container-id="${container.id}"
            title="Delete container"
          >🗑️</button>
        </div>

        ${container.description ? html`<p class="bin-description">${container.description}</p>` : ''}

        <div class="bin-stats">
          <span>${container.childCount} sub-containers</span>
          <span>${container.partCount} parts</span>
        </div>

        <div class="bin-path" style="font-size: 12px; color: #666; margin-top: 8px;">
          ${container.path}
        </div>

        <div class="bin-actions">
          ${hasChildren || !container.can_contain_parts ? html`
            <button
              class="primary-btn"
              data-action="view-container"
              data-container-id="${container.id}"
            >View Contents</button>
          ` : html`
            <button
              class="primary-btn"
              data-action="view-container"
              data-container-id="${container.id}"
            >View ${hasParts ? 'Parts' : 'Container'}</button>
          `}
        </div>
      </div>
    `;
  }

  async viewContainerDetails(containerId) {
    this.currentContainerId = containerId;

    history.pushState(null, '', `/bins/${containerId}`);

    render(html`<p class="help-text">Loading container details...</p>`, this.container);

    try {
      const container = await PartsAPI.getContainerDetails(containerId);

      // Build breadcrumbs from path
      this.buildBreadcrumbs(container.path);

      this.displayContainerDetails(container);
    } catch (error) {
      console.error('Load container details error:', error);
      render(html`<p class="help-text">Error loading container details</p>`, this.container);
    }
  }

  buildBreadcrumbs(path) {
    // For now, we'll just store the current container
    // A full implementation would parse the path and get all parent IDs
    this.breadcrumbs = [];
  }

  displayContainerDetails(container) {
    const hasChildren = container.children && container.children.length > 0;
    const hasParts = container.parts && container.parts.length > 0;

    const template = html`
      <div class="container-details">
        <div class="bin-header">
          <div>
            <h2>${container.container_id}</h2>
            <p style="color: #666; font-size: 14px;">Type: ${container.container_type} | Path: ${container.path}</p>
            ${container.description ? html`<p>${container.description}</p>` : ''}
          </div>
          <button class="back-btn">Back</button>
        </div>

        ${hasChildren ? html`
          <div style="margin-top: 30px;">
            <h3>Sub-Containers</h3>
            <div class="containers-grid">
              ${container.children.map(child => this.renderContainerCard(child))}
            </div>
          </div>
        ` : ''}

        ${container.can_contain_parts ? html`
          <div style="margin-top: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3>Parts in this Container</h3>
              <button class="primary-btn" data-action="assign-part" data-container-id="${container.id}">
                Add Part
              </button>
            </div>

            ${hasParts ? html`
              <div class="parts-list">
                ${container.parts.map(part => this.renderPartInContainer(container.id, part))}
              </div>
            ` : html`
              <p class="help-text">No parts in this container yet.</p>
            `}
          </div>
        ` : ''}

        ${!hasChildren && !container.can_contain_parts ? html`
          <div style="margin-top: 30px;">
            <button class="primary-btn" data-action="create-child">
              Add Sub-Container
            </button>
          </div>
        ` : ''}
      </div>
    `;
    render(template, this.container);
  }

  renderPartInContainer(containerId, part) {
    return html`
      <div class="part-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; border-radius: 4px;">
        <div>
          <strong>${part.part_name || part.part_num}</strong>
          <div style="font-size: 12px; color: #666;">
            ${part.part_num} | Quantity: ${part.quantity}
          </div>
          ${part.notes ? html`<div style="font-size: 12px; color: #666;">${part.notes}</div>` : ''}
        </div>
        <button
          class="icon-btn"
          data-action="remove-part"
          data-container-id="${containerId}"
          data-part-num="${part.part_num}"
          title="Remove part"
        >🗑️</button>
      </div>
    `;
  }

  async goBack() {
    await this.loadRootContainers();
  }

  async removePartFromContainer(containerId, partNum) {
    if (!confirm('Remove this part from the container?')) {
      return;
    }

    try {
      await PartsAPI.removePartFromContainer(containerId, partNum);
      await this.viewContainerDetails(containerId);
    } catch (error) {
      console.error('Remove part error:', error);
      alert('Error removing part');
    }
  }

  async deleteContainer(containerId) {
    if (!confirm('Delete this container? This will also delete all sub-containers and part assignments.')) {
      return;
    }

    try {
      await PartsAPI.deleteContainer(containerId);

      if (this.currentContainerId === containerId) {
        await this.loadRootContainers();
      } else if (this.currentContainerId) {
        await this.viewContainerDetails(this.currentContainerId);
      } else {
        await this.loadRootContainers();
      }
    } catch (error) {
      console.error('Delete container error:', error);
      alert('Error deleting container');
    }
  }

  show() {
    this.loadRootContainers();
  }
}
