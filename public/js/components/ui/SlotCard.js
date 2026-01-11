// Slot Card Component
import { html } from 'lit-html';

export class SlotCard {
  static render(slot) {
    const filled = slot.part_num ? 'filled' : 'empty';

    return html`
      <div class="slot-card ${filled}"
           data-action="assign-part"
           data-slot-id="${slot.id}"
           data-slot-number="${slot.slot_number}">
        <button class="delete-slot-btn"
                data-action="delete-slot"
                data-slot-id="${slot.id}"
                title="Remove slot">×</button>
        <div class="slot-number">Slot ${slot.slot_number}</div>
        <div class="slot-content">
          ${slot.part_num ? html`
            <div class="part-num">${slot.part_num}</div>
            <div class="part-name">${slot.part_name || 'Unknown part'}</div>
            ${slot.quantity ? html`<div class="quantity">Qty: ${slot.quantity}</div>` : ''}
            ${slot.notes ? html`<div class="notes"><small>${slot.notes}</small></div>` : ''}
          ` : html`<div>Empty - Click to assign</div>`}
        </div>
      </div>
    `;
  }
}
