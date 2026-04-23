# ERA Walk-In Customer System

Sistem preview untuk mengukur Walk-In Customer toko Erafone tanpa alat sensor pintu. Store Leader mengisi form harian, PIC melihat dashboard live/near-live untuk seluruh toko.

## Local Preview

```bash
npm install
npm start
```

URL lokal:

- Dashboard PIC: `http://localhost:3001/dashboard`
- Form Store Leader: `http://localhost:3001/form`
- Workflow & arsitektur: `http://localhost:3001/architecture`

## Netlify Deploy

Project ini sudah disiapkan untuk Netlify:

- Static frontend: `public/`
- Serverless API: `netlify/functions/api.js`
- Redirect/API routing: `netlify.toml`
- Production data store: Netlify Blobs

Di Netlify, endpoint `/api/*` akan diarahkan ke Netlify Function. Data submit produksi disimpan di Netlify Blobs, bukan `data.json`.

## Data Master

Master toko production memakai `data/stores.json`, hasil ekstrak dari workbook Excel. Untuk keamanan data publik, file deploy hanya menyimpan:

- Store code
- Nama toko
- Region
- Nama Store Leader

Nomor telepon dan email dari workbook tidak disertakan ke file deploy.

Jika workbook berubah, jalankan:

```bash
python3 scripts/extract_store_master.py
```

## Catatan Realtime

Saat berjalan lokal, dashboard memakai Server-Sent Events untuk update instan.

Saat berjalan di Netlify, dashboard memakai polling otomatis setiap 15 detik. Netlify Blobs dapat memerlukan waktu propagasi sampai sekitar 60 detik untuk update global.
