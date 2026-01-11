// Bin Card Component
import { html } from 'lit-html';

export class BinCard {
  static render(bin) {
    return html`
      <div class="bin-card" data-action="view-bin" data-bin-id="${bin.bin_id}">
        <h3>Bin ${bin.bin_id}</h3>
        ${bin.description ? html`<p>${bin.description}</p>` : ''}
        <div class="bin-stats">
          <p><strong>${bin.filled_slots}</strong> / ${bin.slot_count} slots filled</p>
        </div>
      </div>
    `;
  }
}
