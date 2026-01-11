/**
 * @jest-environment jsdom
 */

import { SlotCard } from '../../../public/js/components/ui/SlotCard.js';

describe('SlotCard Component', () => {
  test('should render filled slot with part', () => {
    const slot = {
      id: 1,
      slot_number: 5,
      part_num: '3001',
      part_name: 'Brick 2 x 4',
      quantity: 10,
      notes: 'Test note'
    };

    const html = SlotCard.render(slot);

    expect(html).toContain('slot-card filled');
    expect(html).toContain('Slot 5');
    expect(html).toContain('3001');
    expect(html).toContain('Brick 2 x 4');
    expect(html).toContain('Qty: 10');
    expect(html).toContain('Test note');
    expect(html).toContain('data-action="assign-part"');
    expect(html).toContain('data-slot-id="1"');
  });

  test('should render empty slot', () => {
    const slot = {
      id: 2,
      slot_number: 3
    };

    const html = SlotCard.render(slot);

    expect(html).toContain('slot-card empty');
    expect(html).toContain('Slot 3');
    expect(html).toContain('Empty - Click to assign');
    expect(html).not.toContain('part-num');
    expect(html).not.toContain('quantity');
  });

  test('should render slot without quantity', () => {
    const slot = {
      id: 3,
      slot_number: 1,
      part_num: '3001',
      part_name: 'Brick 2 x 4'
    };

    const html = SlotCard.render(slot);

    expect(html).toContain('3001');
    expect(html).toContain('Brick 2 x 4');
    expect(html).not.toContain('Qty:');
  });

  test('should render slot without notes', () => {
    const slot = {
      id: 4,
      slot_number: 2,
      part_num: '3001',
      part_name: 'Brick 2 x 4',
      quantity: 5
    };

    const html = SlotCard.render(slot);

    expect(html).toContain('Qty: 5');
    expect(html).not.toContain('notes');
  });

  test('should include delete button', () => {
    const slot = {
      id: 5,
      slot_number: 1
    };

    const html = SlotCard.render(slot);

    expect(html).toContain('delete-slot-btn');
    expect(html).toContain('data-action="delete-slot"');
    expect(html).toContain('data-slot-id="5"');
  });
});
