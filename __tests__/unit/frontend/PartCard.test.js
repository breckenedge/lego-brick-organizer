/**
 * @jest-environment jsdom
 */

import { PartCard } from '../../../public/js/components/ui/PartCard.js';

describe('PartCard Component', () => {
  describe('render', () => {
    test('should render assigned part without assign button', () => {
      const part = {
        part_num: '3001',
        name: 'Brick 2 x 4',
        category_name: 'Bricks',
        bin_id: 'A1',
        slot_number: 1,
        quantity: 10
      };

      const html = PartCard.render(part, false);

      expect(html).toContain('3001');
      expect(html).toContain('Brick 2 x 4');
      expect(html).toContain('Bricks');
      expect(html).toContain('Bin A1, Slot 1');
      expect(html).toContain('Qty: 10');
      expect(html).not.toContain('Assign to Bin');
    });

    test('should render unassigned part with assign button', () => {
      const part = {
        part_num: '3001',
        name: 'Brick 2 x 4',
        category_name: 'Bricks'
      };

      const html = PartCard.render(part, true);

      expect(html).toContain('3001');
      expect(html).toContain('Brick 2 x 4');
      expect(html).toContain('Not assigned to a bin');
      expect(html).toContain('Assign to Bin');
      expect(html).toContain('data-action="assign-to-bin"');
    });

    test('should handle part without category', () => {
      const part = {
        part_num: '3001',
        name: 'Brick 2 x 4'
      };

      const html = PartCard.render(part, false);

      expect(html).toContain('3001');
      expect(html).toContain('Brick 2 x 4');
      expect(html).not.toContain('<small>');
    });
  });

  describe('formatLocation', () => {
    test('should format location for assigned part', () => {
      const part = {
        bin_id: 'A1',
        slot_number: 5,
        quantity: 20
      };

      const location = PartCard.formatLocation(part);

      expect(location).toContain('Bin A1, Slot 5');
      expect(location).toContain('Qty: 20');
    });

    test('should show empty location for unassigned part', () => {
      const part = {
        part_num: '3001'
      };

      const location = PartCard.formatLocation(part);

      expect(location).toContain('Not assigned to a bin');
      expect(location).toContain('empty');
    });
  });
});
