import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { clearPrivateState, SESSION_ENDED_EVENT } from '../src/lib/privateCache';
import { setToken } from '../src/api';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe('private account cache boundary', () => {
  it('removes prior user queries and deletes only the legacy API cache', () => {
    const client = new QueryClient();
    client.setQueryData(['employees'], [{ email: 'private@tenant-a.test' }]);
    const remove = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: remove });
    clearPrivateState(client);
    expect(client.getQueryData(['employees'])).toBeUndefined();
    expect(remove).toHaveBeenCalledExactlyOnceWith('presensia-api-read');
  });

  it('announces a session boundary on logout or expiry, not on issuing a token', () => {
    const ended = vi.fn();
    window.addEventListener(SESSION_ENDED_EVENT, ended);
    try {
      setToken('new-token');
      expect(ended).not.toHaveBeenCalled();
      setToken(null);
      expect(ended).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('presensia_token')).toBeNull();
    } finally {
      window.removeEventListener(SESSION_ENDED_EVENT, ended);
    }
  });
});
