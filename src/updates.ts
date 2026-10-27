import { registerSW } from 'virtual:pwa-register';

let ready = false;
const listeners = new Set<() => void>();
const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    ready = true;
    listeners.forEach(listener => listener());
  },
});

export const hasGameUpdate = () => ready;
export function subscribeToUpdates(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const applyGameUpdate = () => updateServiceWorker(true);
