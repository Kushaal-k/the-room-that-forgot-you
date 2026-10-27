export interface PresenceState {
  phase: 'quiet' | 'approaching' | 'retreating';
  x: number; z: number; age: number; delay: number; exposure: number;
  count: number; progress: number; noticed: boolean;
}
export interface PresenceInput {
  dt: number; active: boolean; restored: boolean; flashlight: boolean;
  x: number; z: number; forwardX: number; forwardZ: number;
  progress: number; reducedMotion: boolean;
}
export type PresenceEvent = 'arrival' | 'noticed' | 'repelled' | 'close' | 'withdrawn' | null;
export const createPresence = (progress: number): PresenceState => ({
  phase: 'quiet', x: 0, z: -6, age: 0, delay: 9, exposure: 0, count: 0, progress, noticed: false,
});

export function stepPresence(previous: PresenceState, input: PresenceInput): { state: PresenceState; event: PresenceEvent } {
  if (!input.active) return { state: previous, event: null };
  if (input.restored) return { state: { ...createPresence(input.progress), delay: 18 }, event: null };
  const state = { ...previous }, dt = Math.max(0, Math.min(.1, input.dt));
  let event: PresenceEvent = null;
  if (input.progress > state.progress && state.phase === 'quiet') state.delay = Math.min(state.delay, 2.5);
  state.progress = input.progress;
  if (state.phase === 'quiet') {
    state.delay -= dt;
    if (state.delay <= 0) {
      const anchors = [[-4, -5.8], [4, -5.8], [-4, 5.8], [4, 5.8], [0, -6.2]];
      const ranked = anchors.map(([x, z]) => {
        const dx = x - input.x, dz = z - input.z, distance = Math.hypot(dx, dz);
        const facing = (dx * input.forwardX + dz * input.forwardZ) / (distance || 1);
        // Prefer a nearby blind spot, so the initial beam cannot clear it automatically.
        return { x, z, distance, score: distance - Math.abs(distance - 6) + (facing < .75 ? 8 : 0) - facing * 4 };
      }).filter(anchor => anchor.distance > 4);
      const spawn = ranked.length ? ranked.sort((a, b) => b.score - a.score)[state.count % Math.min(2, ranked.length)] : undefined;
      if (!spawn) { state.delay = 2; return { state, event }; }
      Object.assign(state, { phase: 'approaching', x: spawn.x, z: spawn.z, age: 0, exposure: 0, noticed: false, count: state.count + 1 });
      event = 'arrival';
    }
    return { state, event };
  }
  state.age += dt;
  const dx = input.x - state.x, dz = input.z - state.z, distance = Math.hypot(dx, dz) || .001;
  const facing = (-dx * input.forwardX - dz * input.forwardZ) / distance;
  const lit = input.flashlight && facing > .91 && distance < 17;
  if (state.phase === 'retreating') {
    state.x -= dx / distance * dt * .45;
    state.z -= dz / distance * dt * .45;
    if (state.age > 1.8) Object.assign(state, { phase: 'quiet', age: 0, delay: 16 + state.count % 3 * 4, exposure: 0 });
    return { state, event };
  }
  state.exposure = lit ? state.exposure + dt : Math.max(0, state.exposure - dt * 1.5);
  if (lit && !state.noticed) { state.noticed = true; event = 'noticed'; }
  if (state.exposure >= 1.25 || distance < 1.15 || state.age > 24) {
    event = state.exposure >= 1.25 ? 'repelled' : distance < 1.15 ? 'close' : 'withdrawn';
    state.phase = 'retreating'; state.age = 0;
  } else {
    const speed = lit ? -.28 : input.reducedMotion ? .48 : .78;
    state.x = Math.max(-4.5, Math.min(4.5, state.x + dx / distance * speed * dt));
    state.z = Math.max(-6.7, Math.min(7, state.z + dz / distance * speed * dt));
  }
  return { state, event };
}
