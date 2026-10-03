// Test komponen — banner offline muncul/hilang mengikuti status jaringan.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import OfflineBanner from '../src/components/OfflineBanner';

describe('OfflineBanner', () => {
  it('tidak tampil saat online', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: true });
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tampil saat offline dan memakai event window', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(/Mode offline/i);
    // Kembali online → banner hilang.
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
