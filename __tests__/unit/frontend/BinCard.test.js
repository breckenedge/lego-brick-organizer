/**
 * @jest-environment jsdom
 */

import { BinCard } from '../../../public/js/components/ui/BinCard.js';

describe('BinCard Component', () => {
  test('should render bin with description', () => {
    const bin = {
      bin_id: 'A1',
      description: 'Test Bin',
      filled_slots: 5,
      slot_count: 10
    };

    const html = BinCard.render(bin);

    expect(html).toContain('Bin A1');
    expect(html).toContain('Test Bin');
    expect(html).toContain('5');
    expect(html).toContain('10 slots filled');
    expect(html).toContain('data-action="view-bin"');
    expect(html).toContain('data-bin-id="A1"');
  });

  test('should render bin without description', () => {
    const bin = {
      bin_id: 'B2',
      filled_slots: 0,
      slot_count: 12
    };

    const html = BinCard.render(bin);

    expect(html).toContain('Bin B2');
    expect(html).not.toContain('<p>');
    expect(html).toContain('0');
    expect(html).toContain('12 slots filled');
  });

  test('should include proper data attributes for actions', () => {
    const bin = {
      bin_id: 'C3',
      filled_slots: 3,
      slot_count: 6
    };

    const html = BinCard.render(bin);

    expect(html).toContain('data-action="view-bin"');
    expect(html).toContain('data-bin-id="C3"');
  });
});
