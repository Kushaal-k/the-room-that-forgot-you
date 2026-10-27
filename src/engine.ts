import { CONNECTIONS, EVIDENCE, STORY_VERSION, isUnlocked } from './story';
import { RELATIONS } from './retrieval';
import type { GalleryId } from './story';
export interface Settings { volume: number; reducedMotion: boolean; captions: boolean; sensitivity: number; }
export interface Save { version: number; discovered: string[]; confirmed: string[]; gallery: GalleryId; settings: Settings; finished: boolean; }
export const defaultSave = (): Save => ({ version: STORY_VERSION, discovered: [], confirmed: [], gallery: 'departures', settings: { volume: .35, reducedMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, captions: true, sensitivity: 1 }, finished: false });
export interface ArchivistReply { status: 'evidence' | 'connection' | 'unknown'; connectionId: string | null; evidenceIds: string[]; }
export function validateReply(raw: unknown, discovered: string[]): ArchivistReply {
  const unknown: ArchivistReply = { status: 'unknown', connectionId: null, evidenceIds: [] };
  if (!raw || typeof raw !== 'object') return unknown;
  const r = raw as Record<string, unknown>;
  if (!['evidence', 'connection', 'unknown'].includes(String(r.status)) || !Array.isArray(r.evidenceIds) || r.evidenceIds.some(id => typeof id !== 'string' || !discovered.includes(id) || !EVIDENCE.some(e => e.id === id))) return unknown;
  if (r.status === 'unknown') return unknown;
  if (r.status === 'connection') {
    const c = CONNECTIONS.find(c => c.id === r.connectionId);
    if (!c || !c.requires.every(id => discovered.includes(id) && r.evidenceIds instanceof Array && r.evidenceIds.includes(id))) return unknown;
    return { status: 'connection', connectionId: c.id, evidenceIds: r.evidenceIds as string[] };
  }
  return { status: 'evidence', connectionId: null, evidenceIds: r.evidenceIds as string[] };
}
export function confirmConnection(id: string, selected: string[], discovered: string[]) {
  const connection = CONNECTIONS.find(c => c.id === id);
  if (!connection) return { ok: false, message: 'That connection is not in the surviving record.' };
  if (selected.some(id => !discovered.includes(id))) return { ok: false, message: 'An undiscovered fragment cannot support a connection.' };
  const missing = connection.requires.filter(id => !discovered.includes(id) || !selected.includes(id));
  if (missing.length) return { ok: false, message: 'These fragments do not yet establish this connection. Look for an independent record that supports the same account.' };
  return { ok: true, message: connection.restoration };
}
export function sanitizeSave(raw: unknown): Save {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object' || (raw as Save).version !== STORY_VERSION) return base;
  const r = raw as Save;
  base.discovered = Array.isArray(r.discovered) ? [...new Set(r.discovered.filter(id => EVIDENCE.some(e => e.id === id)))] : [];
  base.confirmed = Array.isArray(r.confirmed) ? [...new Set(r.confirmed.filter(id => CONNECTIONS.some(c => c.id === id && c.requires.every(e => base.discovered.includes(e)))))] : [];
  base.confirmed = base.confirmed.filter(id => isUnlocked(CONNECTIONS.find(c => c.id === id)!.gallery, base.confirmed));
  base.gallery = r.gallery === 'names' && ['refuge','knocks','care','returns','clock','light'].every(id => base.confirmed.includes(id)) ? 'names' : r.gallery === 'shelter' && ['returns','clock','light'].every(id => base.confirmed.includes(id)) ? 'shelter' : 'departures';
  if (r.settings && typeof r.settings === 'object') base.settings = { volume: typeof r.settings.volume === 'number' && Number.isFinite(r.settings.volume) ? Math.max(0, Math.min(1, r.settings.volume)) : .35, reducedMotion: typeof r.settings.reducedMotion === 'boolean' ? r.settings.reducedMotion : base.settings.reducedMotion, captions: typeof r.settings.captions === 'boolean' ? r.settings.captions : true, sensitivity: typeof r.settings.sensitivity === 'number' && Number.isFinite(r.settings.sensitivity) ? Math.max(.2, Math.min(2, r.settings.sensitivity)) : 1 };
  base.finished = r.finished === true && base.confirmed.length === CONNECTIONS.length;
  return base;
}
export function buildContext(discovered: string[]) {
  const records = EVIDENCE.filter(e => discovered.includes(e.id)).map(e => ({ id: e.id, title: e.title, date: e.date, text: e.text }));
  // Only disclose claim text after every source needed to establish it has been found.
  const connections = CONNECTIONS.filter(c => c.requires.every(id => discovered.includes(id))).map(c => ({ id: c.id, title: c.title, question: c.question, truth: c.truth, meaning:RELATIONS[c.id]||c.truth, requires: c.requires }));
  return { records, connections };
}
