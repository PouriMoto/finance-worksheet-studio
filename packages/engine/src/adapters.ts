// Backend boundary. Phase 1 uses localStorage only; PocketBase is wired later through this interface.
import { drainQueue, requeue, type AppState, type StudioEvent } from './store.ts';

export interface SyncAdapter {
  pushEvents(anonId: string, events: StudioEvent[]): Promise<void>;
  pushSnapshot?(state: AppState): Promise<void>;
}

export const noopAdapter: SyncAdapter = { async pushEvents() {} };

// Minimal REST client (no SDK). Collections are described in backend/pocketbase/README.md. Untested against a live server.
export function pocketBaseAdapter(baseUrl: string): SyncAdapter {
  const url = baseUrl.replace(/\/$/, '');
  return {
    async pushEvents(anonId, events) {
      for (const e of events) {
        const res = await fetch(`${url}/api/collections/events/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anon_id: anonId, type: e.type, pkg: e.pkg ?? '', part: e.part ?? '', scene: e.scene ?? '', data: e.data ?? {}, at: e.at }),
        });
        if (!res.ok) throw new Error(`events push failed: ${res.status}`);
      }
    },
  };
}

export async function flushEvents(anonId: string, adapter: SyncAdapter): Promise<void> {
  const batch = drainQueue();
  if (!batch.length) return;
  try {
    await adapter.pushEvents(anonId, batch);
  } catch {
    requeue(batch);
  }
}
