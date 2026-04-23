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
function normalizeMonth(month) {
  return /^\d{4}-\d{2}$/.test(month || '') ? month : '';
}
function monthFromDate(date) {
  return (date || '').slice(0, 7);
}
function summarizeMonth(submissions) {
  const storeMap = {};
  const brandMap = {};

  submissions.forEach(submission => {
    if (!storeMap[submission.store_code]) {
      storeMap[submission.store_code] = {
        store_code: submission.store_code,
        store_name: submission.store_name,
        store_leader: submission.store_leader,
        total_customers: 0,
        report_count: 0,
        latest_submission_date: submission.submission_date,
        latest_submitted_at: submission.submitted_at,
        brand_totals: {}
      };
    }

    const bucket = storeMap[submission.store_code];
    bucket.total_customers += submission.total_customers || 0;
    bucket.report_count += 1;

    if ((submission.submitted_at || '') > (bucket.latest_submitted_at || '')) {
      bucket.latest_submitted_at = submission.submitted_at;
      bucket.latest_submission_date = submission.submission_date;
      bucket.store_leader = submission.store_leader;
    }

    (submission.spg_data || []).forEach(spg => {
      const count = parseInt(spg.customer_count, 10) || 0;
      bucket.brand_totals[spg.brand] = (bucket.brand_totals[spg.brand] || 0) + count;
      brandMap[spg.brand] = (brandMap[spg.brand] || 0) + count;
    });
  });

  const storeSummaries = Object.values(storeMap)
    .map(store => ({
      ...store,
      spg_details: Object.entries(store.brand_totals)
        .map(([brand, customer_count]) => ({ brand, customer_count }))
        .sort((a, b) => b.customer_count - a.customer_count)
    }))
    .sort((a, b) => {
      if ((b.total_customers || 0) !== (a.total_customers || 0)) {
        return (b.total_customers || 0) - (a.total_customers || 0);
      }
      return (b.latest_submitted_at || '').localeCompare(a.latest_submitted_at || '');
    });

  const brandTotals = Object.entries(brandMap)
    .map(([brand, total]) => ({ brand, total }))
    .sort((a, b) => b.total - a.total);

  return {
    storeSummaries,
    brandTotals,
    grandTotal: submissions.reduce((sum, item) => sum + (item.total_customers || 0), 0)
  };
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
function validateAdminPin(request) {
  const adminPin = request.headers.get('x-admin-pin');
  if (!process.env.ADMIN_PIN) {
    return { ok: false, response: json({ error: 'Admin PIN belum dikonfigurasi' }, 503) };
  }
  if (adminPin !== process.env.ADMIN_PIN) {
    return { ok: false, response: json({ error: 'PIN admin salah' }, 401) };
  }
  return { ok: true };
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

    if (request.method === 'GET' && route === 'admin-status') {
      return json({ enabled: Boolean(process.env.ADMIN_PIN) });
    }

    if (request.method === 'POST' && route === 'admin-login') {
      const body = await request.json();
      const pin = (body.pin || '').trim();
      if (!process.env.ADMIN_PIN) {
        return json({ error: 'Admin PIN belum dikonfigurasi' }, 503);
      }
      if (!pin) {
        return json({ error: 'PIN admin wajib diisi' }, 400);
      }
      if (pin !== process.env.ADMIN_PIN) {
        return json({ error: 'PIN admin salah' }, 401);
      }
      return json({ success: true });
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
      const month = normalizeMonth(url.searchParams.get('month')) || monthFromDate(date);
      const db = await readDB(store);
      const monthSubmissions = db.submissions.filter(s => monthFromDate(s.submission_date) === month);
      const { storeSummaries, brandTotals, grandTotal } = summarizeMonth(monthSubmissions);
      return json({
        date,
        month,
        periodType: 'month',
        submissions: storeSummaries,
        activityFeed: [...monthSubmissions]
          .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''))
          .slice(0, 20),
        brandTotals,
        grandTotal,
        reportCount: monthSubmissions.length,
        storeCount: storeSummaries.length,
        registeredStores: stores.length,
        pendingStores: Math.max(stores.length - storeSummaries.length, 0)
      });
    }

    if (request.method === 'GET' && route === 'history') {
      const days = parseInt(url.searchParams.get('days'), 10) || 7;
      const month = normalizeMonth(url.searchParams.get('month'));
      const db = await readDB(store);
      const dayMap = {};
      db.submissions
        .filter(s => !month || monthFromDate(s.submission_date) === month)
        .forEach(s => {
        if (!dayMap[s.submission_date]) {
          dayMap[s.submission_date] = { submission_date: s.submission_date, total: 0, store_count: 0 };
        }
        dayMap[s.submission_date].total += s.total_customers || 0;
        dayMap[s.submission_date].store_count += 1;
      });
      const rows = Object.values(dayMap).sort((a, b) => a.submission_date.localeCompare(b.submission_date));
      return json(month ? rows : rows.slice(-days));
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
      const adminCheck = validateAdminPin({
        headers: new Headers({ 'x-admin-pin': request.headers.get('x-admin-pin') || body.admin_pin || '' })
      });
      if (!adminCheck.ok) return adminCheck.response;

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

    if (request.method === 'POST' && route === 'reset-month') {
      const body = await request.json();
      const adminCheck = validateAdminPin({
        headers: new Headers({ 'x-admin-pin': request.headers.get('x-admin-pin') || body.admin_pin || '' })
      });
      if (!adminCheck.ok) return adminCheck.response;

      const month = normalizeMonth(body.month);
      if (!month) {
        return json({ error: 'Bulan reset wajib diisi dengan format YYYY-MM' }, 400);
      }

      const db = await readDB(store);
      const before = db.submissions.length;
      db.submissions = db.submissions.filter(s => monthFromDate(s.submission_date) !== month);
      const removed = before - db.submissions.length;

      await writeDB(store, db);
      return json({ success: true, removed });
    }

    return json({ error: 'Endpoint tidak ditemukan' }, 404);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
