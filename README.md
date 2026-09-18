# Hadirku — Web Absensi Karyawan

Frontend **Hadirku**, SaaS absensi karyawan berbasis GPS + selfie.
Judul/tagline produk: **“Hadirku — Absensi Karyawan Online: GPS, Selfie & Rekap Otomatis.”**

## Stack Teknologi

| Lapisan | Teknologi |
|---|---|
| Framework | **React 18 + TypeScript** (strict) |
| Bundler | **Vite 5** |
| Ikon | **lucide-react** |
| Hosting | **Cloudflare Pages** (header keamanan via `_headers`) |
| API | hadirku-api (Cloudflare Workers + D1 + R2 + KV + Cron + DOKU) |
| CI/CD | **GitHub Actions** (typecheck + build di setiap push/PR) |

## Fitur UI

- **Landing page** dengan harga dinamis dari API (paket dikelola server).
- **Clock-in/out** kamera depan (selfie wajib, dikompres di klien) + GPS `navigator.geolocation`.
- **Rekap bulanan** dengan tabel status (hadir/telat/izin/sakit/absen).
- **Panel admin**: kelola karyawan & lokasi geofence (pakai “Pakai Lokasi Saya”), setujui izin, upgrade paket.
- **Pembayaran**: DOKU Checkout (QRIS/VA/e-wallet, polling status otomatis) atau transfer manual + unggah bukti.

## Menjalankan

```bash
npm install
VITE_API_URL=http://localhost:8787 npm run dev   # FE di :5173, proxy /api → Workers :8787
npm run build     # typecheck + bundle ke dist/
npm run deploy    # wrangler pages deploy
```

Env:
- `VITE_API_URL` — basis URL API (produksi: `https://api.hadirku.id`).

Repo API: `hadirku-api` (Cloudflare Workers).
