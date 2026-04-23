const { getStore } = require('@netlify/blobs');
const stores = require('../../data/stores.json');

const STORE_DIRECTORY = Object.fromEntries(stores.map(store => [store.code, store.name]));

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function todayISO() {
  const now = new Date();
  const jakarta = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return jakarta.toISOString().slice(0, 10);
}

function routeFromEvent(event) {
  const rawPath = event.rawUrl ? new URL(event.rawUrl).pathname : event.path;
  return rawPath
    .replace(/^\/api\/?/, '')
    .replace(/^\/\.netlify\/functions\/api\/?/, '')
    .replace(/^\/+/, '')
    .split('/')[0] || '';
}

async function readDB() {
  const store = getStore('era-walkin');
  const text = await store.get('data.json');
  if (!text) return { submissions: [] };
  try {
    const parsed = JSON.parse(text);
    return { submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [] };
  } catch (e) {
    return { submissions: [] };
  }
}

async function writeDB(db) {
  const store = getStore('era-walkin');
  await store.set('data.json', JSON.stringify(db, null, 2));
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' } };
  }

  const route = routeFromEvent(event);
  const query = event.queryStringParameters || {};

  try {
    if (event.httpMethod === 'GET' && route === 'stores') {
      return json(200, STORE_DIRECTORY);
    }

    if (event.httpMethod === 'GET' && route === 'store-master') {
      return json(200, stores);
    }

    if (event.httpMethod === 'GET' && route === 'stream') {
      return json(200, { type: 'polling_mode', message: 'Netlify production uses scheduled polling instead of SSE.' });
    }

    if (event.httpMethod === 'GET' && route === 'today') {
      const code = (query.store_code || '').trim().toUpperCase();
      const date = query.date || todayISO();
      const db = await readDB();
      const found = db.submissions.find(s => s.store_code === code && s.submission_date === date);
      if (!found) return json(200, { exists: false });
      return json(200, { exists: true, submission: found, spg_data: found.spg_data });
    }

    if (event.httpMethod === 'GET' && route === 'data') {
      const date = query.date || todayISO();
      const db = await readDB();
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
      return json(200, {
        date,
        submissions,
        brandTotals,
        grandTotal,
        storeCount: submissions.length,
        registeredStores: stores.length,
        pendingStores: Math.max(stores.length - submissions.length, 0)
      });
    }

    if (event.httpMethod === 'GET' && route === 'history') {
      const days = parseInt(query.days, 10) || 7;
      const db = await readDB();
      const dayMap = {};
      db.submissions.forEach(s => {
        if (!dayMap[s.submission_date]) {
          dayMap[s.submission_date] = { submission_date: s.submission_date, total: 0, store_count: 0 };
        }
        dayMap[s.submission_date].total += s.total_customers || 0;
        dayMap[s.submission_date].store_count += 1;
      });
      return json(200, Object.values(dayMap).sort((a, b) => a.submission_date.localeCompare(b.submission_date)).slice(-days));
    }

    if (event.httpMethod === 'POST' && route === 'submit') {
      const body = JSON.parse(event.body || '{}');
      const { store_code, store_leader, submission_date, spg_data } = body;
      if (!store_code || !store_leader || !submission_date || !Array.isArray(spg_data)) {
        return json(400, { error: 'Data tidak lengkap' });
      }

      const storeCode = store_code.trim().toUpperCase();
      if (!STORE_DIRECTORY[storeCode]) {
        return json(400, { error: 'Store Code tidak valid' });
      }

      const cleanSpg = spg_data.map(spg => ({
        spg_name: spg.spg_name,
        brand: spg.brand,
        customer_count: parseInt(spg.customer_count, 10) || 0
      }));
      const total = cleanSpg.reduce((sum, spg) => sum + spg.customer_count, 0);
      const now = new Date().toISOString();

      const db = await readDB();
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

      await writeDB(db);
      return json(200, { success: true, store_name: STORE_DIRECTORY[storeCode] });
    }

    return json(404, { error: 'Endpoint tidak ditemukan' });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
