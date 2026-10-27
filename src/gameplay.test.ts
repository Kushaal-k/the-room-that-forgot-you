import { expect, it } from 'vitest';
import { isWalkable, nearbyInteraction } from './gameplay';

it('requires an exhibit to be close and in front of the player', () => {
  expect(nearbyInteraction(0, 6.7, 0, -1, 'departures', false)).toBeNull();
  expect(nearbyInteraction(-3.1, 2.1, 0, -1, 'departures', false)?.id).toBe('d1');
  expect(nearbyInteraction(-3.1, 2.1, 0, 1, 'departures', false)).toBeNull();
});
it('keeps the door interaction locked until the gallery is restored', () => {
  expect(nearbyInteraction(0, -6.3, 0, -1, 'departures', false)).toMatchObject({ kind: 'door', label: 'The door will not move' });
  expect(nearbyInteraction(0, -6.3, 0, -1, 'departures', true)?.label).toBe('Enter Shelter');
  expect(nearbyInteraction(0, -6.3, 0, -1, 'names', true)?.label).toBe('Open the keeper’s room');
});
it('allows the aisle but prevents walking through displays, benches, and walls', () => {
  expect(isWalkable(0, 6, 'departures')).toBe(true);
  expect(isWalkable(-3.1, .8, 'departures')).toBe(false);
  expect(isWalkable(-1.8, 3.4, 'departures')).toBe(false);
  expect(isWalkable(5, 0, 'departures')).toBe(false);
});
