// Slot Card Component
export class SlotCard {
  static render(slot) {
    const filled = slot.part_num ? 'filled' : 'empty';
    const content = slot.part_num
      ? `
        <div class="part-num">${slot.part_num}</div>
        <div class="part-name">${slot.part_name || 'Unknown part'}</div>
        ${slot.quantity ? `<div class="quantity">Qty: ${slot.quantity}</div>` : ''}
        ${slot.notes ? `<div class="notes"><small>${slot.notes}</small></div>` : ''}
      `
      : '<div>Empty - Click to assign</div>';

    return `
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
          ${content}
        </div>
      </div>
    `;
  }
}
