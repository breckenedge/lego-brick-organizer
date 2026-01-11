// Part Card Component
import { html } from 'lit-html';
import { PartsAPI } from '../../api/partsApi.js';

export class PartCard {
  static render(part, showAssignButton = false) {
    const location = PartCard.formatLocation(part);

    return html`
      <div class="part-card">
        <div class="part-image">
          <img
            src="${PartsAPI.getPartDrawingURL(part.part_num)}"
            alt="${part.name}"
            @error="${(e) => e.target.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-family=%22Arial%22 font-size=%2214%22>No image</text></svg>'}">
        </div>
        <div class="part-info">
          <h3>${part.part_num}</h3>
          <p class="part-name">${part.name}</p>
          ${part.category_name ? html`<p><small>${part.category_name}</small></p>` : ''}
          ${location}
          ${showAssignButton ? html`
            <button
              class="btn-secondary"
              data-action="assign-to-bin"
              data-part-num="${part.part_num}"
              data-part-name="${part.name}">
              Assign to Bin
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  static formatLocation(part) {
    if (part.bin_id && part.slot_number !== null) {
      return html`
        <div class="part-location">
          <strong>Location:</strong> Bin ${part.bin_id}, Slot ${part.slot_number}
          ${part.quantity ? html`<br><strong>Qty:</strong> ${part.quantity}` : ''}
        </div>
      `;
    }
    return html`<div class="part-location empty">Not assigned to a bin</div>`;
  }
}
