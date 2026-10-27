import { defaultSave, sanitizeSave } from './engine';
import type { Save } from './engine';
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('greyhaven-museum', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('progress');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Another museum tab is blocking storage.'));
  });
}

export async function loadSave(): Promise<Save> {
  const db = await database();
  try {
    return await new Promise<Save>((resolve, reject) => {
      const transaction = db.transaction('progress');
      const request = transaction.objectStore('progress').get('save');
      transaction.oncomplete = () => resolve(request.result ? sanitizeSave(request.result) : defaultSave());
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Reading progress was interrupted.'));
    });
  } finally { db.close(); }
}

let pendingWrite: Promise<void> = Promise.resolve();
export function writeSave(save: Save): Promise<void> {
  // Preserve call order even when opening an earlier database connection is slower.
  const snapshot = structuredClone(save);
  const next = pendingWrite.catch(() => {}).then(async () => {
    const db = await database();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('progress', 'readwrite');
        transaction.objectStore('progress').put(snapshot, 'save');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error('Saving progress was interrupted.'));
      });
    } finally { db.close(); }
  });
  pendingWrite = next;
  return next;
}
