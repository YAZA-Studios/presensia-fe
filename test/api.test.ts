// Test lib API Presensia FE — perilaku token & error yang menentukan sesi.
import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage asli jsdom dipakai (bukan mock) agar perilaku nyata.
describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('ApiError menyimpan status HTTP', async () => {
    const { ApiError } = await import('../src/api');
    const e = new ApiError('Kamu sudah clock-in hari ini.', 409);
    expect(e.status).toBe(409);
    expect(e.message).toContain('clock-in');
  });

  it('401 dari server menghapus token tersimpan (sesi kedaluwarsa)', async () => {
    localStorage.setItem('presensia_token', 'tok-lama');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const { api, getToken } = await import('../src/api');
    await expect(api.sites()).rejects.toThrow();
    expect(getToken()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('header Authorization disertakan bila token ada', async () => {
    localStorage.setItem('presensia_token', 'tok-abc');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sites: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { api } = await import('../src/api');
    await api.sites();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-abc');
  });
});
