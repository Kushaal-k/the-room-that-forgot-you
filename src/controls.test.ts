import { expect, it, vi } from 'vitest';
import { mouseLookDelta, resumeMouseLook } from './controls';

it('closes the modal before requesting capture and focuses the game without scrolling', async () => {
  const order: string[] = [];
  const canvas = { focus: vi.fn(() => order.push('focus')), requestPointerLock: vi.fn(async () => { order.push('capture'); }) };
  const page = { pointerLockElement: null, querySelector: () => canvas,
    querySelectorAll: () => [{ close: () => order.push('close') }] };
  await resumeMouseLook(page);
  expect(order).toEqual(['close', 'focus', 'capture']);
  expect(canvas.focus).toHaveBeenCalledWith({ preventScroll: true });
});
it('survives denied, synchronous-failure and legacy void-returning capture implementations', async () => {
  for (const requestPointerLock of [() => Promise.reject(new Error('Escape cooldown')), () => { throw new Error('Unavailable'); }, () => undefined]) {
    const canvas = { focus: vi.fn(), requestPointerLock };
    await expect(resumeMouseLook({ pointerLockElement: null, querySelector: () => canvas,
      querySelectorAll: () => [] })).resolves.toBe(false);
  }
});
it('keeps drag look available without capturing the cursor or rotating while using menus', () => {
  expect(mouseLookDelta(false, 1, true, 24, -8)).toEqual([24, -8]);
  expect(mouseLookDelta(false, 0, true, 24, -8)).toBeNull();
  expect(mouseLookDelta(false, 1, false, 24, -8)).toBeNull();
  expect(mouseLookDelta(true, 0, false, 24, -8)).toEqual([24, -8]);
});
