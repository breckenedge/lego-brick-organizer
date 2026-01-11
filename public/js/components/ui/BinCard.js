// Bin Card Component
export class BinCard {
  static render(bin) {
    return `
      <div class="bin-card" data-action="view-bin" data-bin-id="${bin.bin_id}">
        <h3>Bin ${bin.bin_id}</h3>
        ${bin.description ? `<p>${bin.description}</p>` : ''}
        <div class="bin-stats">
          <p><strong>${bin.filled_slots}</strong> / ${bin.slot_count} slots filled</p>
        </div>
      </div>
    `;
  }
}
