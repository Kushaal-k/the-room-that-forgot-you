import { EVIDENCE } from './story';
import type { GalleryId } from './story';

export type Interaction = { id: string; kind: 'evidence' | 'door'; label: string };
export function nearbyInteraction(x: number, z: number, forwardX: number, forwardZ: number,
  gallery: GalleryId, restored: boolean): Interaction | null {
  const targets = EVIDENCE.filter(record => record.gallery === gallery).map(record => ({
    x: record.position[0], z: record.position[2], id: record.id,
    kind: 'evidence' as 'evidence' | 'door', label: record.title,
  }));
  targets.push({ x: 0, z: -7.2, id: 'door', kind: 'door', label: restored
    ? gallery === 'names' ? 'Open the keeper’s room' : `Enter ${gallery === 'departures' ? 'Shelter' : 'Names'}`
    : 'The door will not move' });
  let nearest: Interaction | null = null, best = 2.15;
  for (const target of targets) {
    const dx = target.x - x, dz = target.z - z, distance = Math.hypot(dx, dz);
    const facing = distance < .35 || (dx * forwardX + dz * forwardZ) / distance > .45;
    if (distance < best && facing) { best = distance; nearest = target; }
  }
  return nearest;
}

export function isWalkable(x: number, z: number, gallery: GalleryId): boolean {
  if (x < -4.5 || x > 4.5 || z < -6.8 || z > 7.7) return false;
  const pedestals = EVIDENCE.filter(record => record.gallery === gallery)
    .map(record => ({ x: record.position[0], z: record.position[2], width: .7, depth: .65 }));
  const furniture = [{ x: -1.8, z: 3.4, width: 1.5, depth: .65 },
    { x: 1.7, z: -1.1, width: 1.5, depth: .65 }];
  return ![...pedestals, ...furniture].some(obstacle =>
    Math.abs(x - obstacle.x) < obstacle.width && Math.abs(z - obstacle.z) < obstacle.depth);
}
