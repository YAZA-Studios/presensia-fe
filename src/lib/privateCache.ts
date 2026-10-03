import type { QueryClient } from '@tanstack/react-query';

export const SESSION_ENDED_EVENT = 'presensia:session-ended';

/** Remove the previous release's URL-keyed API cache, retaining app assets. */
export async function removeLegacyApiCache(): Promise<void> {
  if ('caches' in globalThis) await caches.delete('presensia-api-read');
}

export function clearPrivateState(client: Pick<QueryClient, 'clear'>): void {
  // clear() also destroys/cancels the current queries, so a late response
  // cannot repopulate the next account's query cache.
  client.clear();
  void removeLegacyApiCache().catch(() => { /* Browser storage can be unavailable. */ });
}
