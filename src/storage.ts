import { defaultSave, sanitizeSave } from './engine';
import type { Save } from './engine';
const DB = 'greyhaven-museum';
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => { const req = indexedDB.open(DB, 1); req.onupgradeneeded = () => req.result.createObjectStore('progress'); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
export async function loadSave(): Promise<Save> { const db = await database(); return new Promise((resolve, reject) => { const tx = db.transaction('progress'); const req = tx.objectStore('progress').get('save'); req.onsuccess = () => resolve(req.result ? sanitizeSave(req.result) : defaultSave()); req.onerror = () => reject(req.error); tx.oncomplete = () => db.close(); }); }
export async function writeSave(save: Save) { const db = await database(); return new Promise<void>((resolve, reject) => { const tx = db.transaction('progress', 'readwrite'); tx.objectStore('progress').put(save, 'save'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }
