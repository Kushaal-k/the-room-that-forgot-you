type LookSurface = { requestPointerLock?: () => Promise<void> | void; focus: (options?: FocusOptions) => void };
type LookDocument = {
  pointerLockElement: unknown;
  querySelector: (selector: string) => LookSurface | null;
  querySelectorAll: (selector: string) => Iterable<{ close: () => void }>;
};

// Invoke from a click/key gesture. React effects cannot supply browser activation.
export async function resumeMouseLook(page: LookDocument = document): Promise<boolean> {
  const canvas = page.querySelector('canvas');
  if (!canvas) return false;
  for (const dialog of page.querySelectorAll('dialog[open]')) dialog.close();
  canvas.focus({ preventScroll: true });
  if (page.pointerLockElement === canvas) return true;
  try {
    // Older implementations return void and report success through pointerlockchange.
    await canvas.requestPointerLock?.();
    return page.pointerLockElement === canvas;
  } catch {
    // Escape cooldowns, denied permission and embedded browsers retain drag-to-look.
    return false;
  }
}

export function mouseLookDelta(locked: boolean, buttons: number, onLookSurface: boolean,
  movementX: number, movementY: number): [number, number] | null {
  return locked || ((buttons & 1) !== 0 && onLookSurface) ? [movementX, movementY] : null;
}
