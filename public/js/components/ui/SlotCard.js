// Slot Card Component
import { html } from 'lit-html';

export class SlotCard {
  static render(slot) {
    const hasParts = slot.parts && slot.parts.length > 0;
    const filled = hasParts ? 'filled' : 'empty';

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
          ${hasParts ? html`
            <div class="slot-parts-list">
              ${slot.parts.map(part => html`
                <div class="slot-part-item">
                  <button class="remove-part-btn"
                          data-action="remove-part"
                          data-slot-id="${slot.id}"
                          data-part-id="${part.id}"
                          title="Remove this part">×</button>
                  <div class="part-num">${part.part_num}</div>
                  <div class="part-name">${part.part_name || 'Unknown part'}</div>
                  ${part.quantity ? html`<div class="quantity">Qty: ${part.quantity}</div>` : ''}
                  ${part.notes ? html`<div class="notes"><small>${part.notes}</small></div>` : ''}
                </div>
              `)}
            </div>
            <button class="add-another-part-btn"
                    data-action="add-another-part"
                    data-slot-id="${slot.id}"
                    data-slot-number="${slot.slot_number}">+ Add Another Part</button>
          ` : html`<div>Empty - Click to assign</div>`}
        </div>
      </div>
    `;
  }
}
