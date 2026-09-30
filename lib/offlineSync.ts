/**
 * File d'attente hors-ligne (IndexedDB) pour les actions effectuées sans
 * réseau — sprint 4, point 2d. Portée volontairement réduite au seul cas
 * demandé (cocher/décocher une tâche) : une entrée par tâche, la dernière
 * valeur écrase la précédente (peu importe combien de fois l'utilisateur a
 * coché/décoché hors-ligne, seul l'état final compte à la synchronisation).
 */

const DB_NAME = "nova-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-task-toggles";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "taskId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export type PendingTaskToggle = { taskId: string; done: boolean };

export async function queueTaskToggle(taskId: string, done: boolean): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ taskId, done } satisfies PendingTaskToggle);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getPending(): Promise<PendingTaskToggle[]> {
  const db = await openDb();
  const result = await new Promise<PendingTaskToggle[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingTaskToggle[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

async function clearPending(taskId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(taskId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Envoie les actions en attente dès que la connexion revient — retourne le nombre synchronisé avec succès (celles qui échouent encore restent en file pour la prochaine tentative). */
export async function flushPendingTaskToggles(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  const pending = await getPending();
  let synced = 0;
  for (const item of pending) {
    try {
      const res = await fetch(`/api/tasks/${item.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: item.done }),
      });
      if (res.ok) {
        await clearPending(item.taskId);
        synced++;
      }
    } catch {
      // Toujours hors-ligne — on retentera au prochain passage "online".
    }
  }
  return synced;
}
