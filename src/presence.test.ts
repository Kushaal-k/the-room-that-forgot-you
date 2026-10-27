import { expect, it } from 'vitest';
import { createPresence, stepPresence } from './presence';
import type { PresenceInput, PresenceState } from './presence';

const input: PresenceInput = { dt: .1, active: true, restored: false, flashlight: true,
  x: 0, z: 0, forwardX: 0, forwardZ: -1, progress: 0, reducedMotion: false };
const approaching = (): PresenceState => ({ ...createPresence(0), phase: 'approaching', x: 0, z: -5 });
it('requires a sustained flashlight beam, rather than merely looking at the presence', () => {
  let state = approaching();
  for (let i = 0; i < 10; i++) state = stepPresence(state, input).state;
  expect(state.phase).toBe('approaching');
  let event;
  for (let i = 0; i < 3; i++) { const result = stepPresence(state, input); state = result.state; event = result.event; }
  expect(state.phase).toBe('retreating'); expect(event).toBe('repelled');
  const unlit = stepPresence(approaching(), { ...input, flashlight: false }).state;
  expect(unlit.z).toBeGreaterThan(-5); expect(unlit.exposure).toBe(0);
});
it('reacts to a new discovery and spawns at a distance from the player', () => {
  let state = { ...createPresence(0), delay: 30 };
  state = stepPresence(state, { ...input, progress: 1 }).state;
  expect(state.delay).toBeLessThan(3);
  for (let i = 0; i < 30; i++) state = stepPresence(state, { ...input, progress: 1 }).state;
  expect(state.phase).toBe('approaching'); expect(Math.hypot(state.x, state.z)).toBeGreaterThan(4);
});
it('pauses encounters during inspection and settles restored rooms without changing story progress', () => {
  const state = approaching();
  expect(stepPresence(state, { ...input, active: false }).state).toBe(state);
  expect(stepPresence(state, { ...input, restored: true }).state.phase).toBe('quiet');
  expect(state.z).toBe(-5);
});
it('keeps the essential light mechanic in reduced motion, and withdraws safely at close range', () => {
  const slow = stepPresence(approaching(), { ...input, flashlight: false, reducedMotion: true }).state;
  const normal = stepPresence(approaching(), { ...input, flashlight: false }).state;
  expect(slow.z).toBeLessThan(normal.z);
  const result = stepPresence({ ...approaching(), z: -.8 }, input);
  expect(result.event).toBe('close'); expect(result.state.phase).toBe('retreating');
});
