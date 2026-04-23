import { getStore } from '@netlify/blobs';
import stores from '../../data/stores.json' with { type: 'json' };

const STORE_DIRECTORY = Object.fromEntries(stores.map(store => [store.code, store.name]));

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store'
    }
  });
}

function todayISO() {
  const now = new Date();
  const jakarta = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return jakarta.toISOString().slice(0, 10);
}

function getRoute(request) {
  const { pathname } = new URL(request.url);
  return pathname
    .replace(/^\/api\/?/, '')
    .replace(/^\/\.netlify\/functions\/api\/?/, '')
    .replace(/^\/+/, '')
    .split('/')[0] || '';
}

async function readDB(store) {
  const text = await store.get('data.json');
  if (!text) return { submissions: [] };
  try {
    const parsed = JSON.parse(text);
    return { submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [] };
  } catch (e) {
    return { submissions: [] };
  }
}

async function writeDB(store, db) {
  await store.set('data.json', JSON.stringify(db, null, 2));
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const route = getRoute(request);
  const url = new URL(request.url);
  const store = getStore('era-walkin');

  try {
    if (request.method === 'GET' && route === 'stores') {
      return json(STORE_DIRECTORY);
    }

    if (request.method === 'GET' && route === 'store-master') {
      return json(stores);
    }

    if (request.method === 'GET' && route === 'stream') {
      return json({ type: 'polling_mode', message: 'Netlify production uses scheduled polling instead of SSE.' });
    }

    if (request.method === 'GET' && route === 'today') {
      const code = (url.searchParams.get('store_code') || '').trim().toUpperCase();
      const date = url.searchParams.get('date') || todayISO();
      const db = await readDB(store);
      const found = db.submissions.find(s => s.store_code === code && s.submission_date === date);
      if (!found) return json({ exists: false });
      return json({ exists: true, submission: found, spg_data: found.spg_data });
    }

    if (request.method === 'GET' && route === 'data') {
      const date = url.searchParams.get('date') || todayISO();
      const db = await readDB(store);
      const submissions = db.submissions
        .filter(s => s.submission_date === date)
        .map(s => ({ ...s, spg_details: [...s.spg_data].sort((a, b) => b.customer_count - a.customer_count) }));

      const brandMap = {};
      submissions.forEach(s => s.spg_data.forEach(spg => {
        brandMap[spg.brand] = (brandMap[spg.brand] || 0) + spg.customer_count;
      }));

      const brandTotals = Object.entries(brandMap)
        .map(([brand, total]) => ({ brand, total }))
        .sort((a, b) => b.total - a.total);

      const grandTotal = submissions.reduce((sum, s) => sum + (s.total_customers || 0), 0);
      return json({
        date,
        submissions,
        brandTotals,
        grandTotal,
        storeCount: submissions.length,
        registeredStores: stores.length,
        pendingStores: Math.max(stores.length - submissions.length, 0)
      });
    }

    if (request.method === 'GET' && route === 'history') {
      const days = parseInt(url.searchParams.get('days'), 10) || 7;
      const db = await readDB(store);
      const dayMap = {};
      db.submissions.forEach(s => {
        if (!dayMap[s.submission_date]) {
          dayMap[s.submission_date] = { submission_date: s.submission_date, total: 0, store_count: 0 };
        }
        dayMap[s.submission_date].total += s.total_customers || 0;
        dayMap[s.submission_date].store_count += 1;
      });
      return json(Object.values(dayMap).sort((a, b) => a.submission_date.localeCompare(b.submission_date)).slice(-days));
    }

    if (request.method === 'POST' && route === 'submit') {
      const body = await request.json();
      const { store_code, store_leader, submission_date, spg_data } = body;
      if (!store_code || !store_leader || !submission_date || !Array.isArray(spg_data)) {
        return json({ error: 'Data tidak lengkap' }, 400);
      }

      const storeCode = store_code.trim().toUpperCase();
      if (!STORE_DIRECTORY[storeCode]) {
        return json({ error: 'Store Code tidak valid' }, 400);
      }

      const cleanSpg = spg_data.map(spg => ({
        spg_name: spg.spg_name,
        brand: spg.brand,
        customer_count: parseInt(spg.customer_count, 10) || 0
      }));
      const total = cleanSpg.reduce((sum, spg) => sum + spg.customer_count, 0);
      const now = new Date().toISOString();

      const db = await readDB(store);
      db.submissions = db.submissions.filter(
        s => !(s.store_code === storeCode && s.submission_date === submission_date)
      );
      db.submissions.unshift({
        id: Date.now(),
        store_code: storeCode,
        store_name: STORE_DIRECTORY[storeCode],
        store_leader,
        submission_date,
        submitted_at: now,
        spg_data: cleanSpg,
        total_customers: total
      });

      await writeDB(store, db);
      return json({ success: true, store_name: STORE_DIRECTORY[storeCode] });
    }

    if (request.method === 'DELETE' && route === 'submission') {
      const body = await request.json();
      const adminPin = request.headers.get('x-admin-pin') || body.admin_pin || '';
      if (!process.env.ADMIN_PIN) {
        return json({ error: 'Admin PIN belum dikonfigurasi' }, 503);
      }
      if (adminPin !== process.env.ADMIN_PIN) {
        return json({ error: 'PIN admin salah' }, 401);
      }

      const storeCode = (body.store_code || '').trim().toUpperCase();
      const date = body.date;
      if (!storeCode || !date) {
        return json({ error: 'Store code dan tanggal wajib diisi' }, 400);
      }

      const db = await readDB(store);
      const before = db.submissions.length;
      db.submissions = db.submissions.filter(
        s => !(s.store_code === storeCode && s.submission_date === date)
      );

      if (db.submissions.length === before) {
        return json({ error: 'Data report tidak ditemukan' }, 404);
      }

      await writeDB(store, db);
      return json({ success: true });
    }

    return json({ error: 'Endpoint tidak ditemukan' }, 404);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
