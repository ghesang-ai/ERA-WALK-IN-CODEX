const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'data.json');
const STORE_MASTER_FILE = path.join(__dirname, 'data', 'stores.json');

function loadStoreMaster() {
  try {
    return JSON.parse(fs.readFileSync(STORE_MASTER_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

// ── Store Code → Store Name mapping (198 toko, April 2026) ──
const STORE_MAP = {
  "E396":"ERAFONE ANDMORE RUKO ITC ROXY MAS","E096":"ERAFONE 2 ITC ROXY MAS",
  "E037":"ERAFONE GAJAH MADA PLAZA","E216":"ERAFONE SENAYAN PARK",
  "E281":"ERAFONE 3.0 SENAYAN CITY","E678":"ERAFONE MULTIBRAND BENDUNGAN HILIR",
  "E682":"ERAFONE MB KH MANSYUR TANAH ABANG","E898":"ERAFONE MB SAMANHUDI",
  "F073":"ERAFONE 2.5 AGORA MALL","E047":"ERAFONE 1 ITC CEMPAKA MAS",
  "E113":"ERAFONE GRAND INDONESIA","E038":"ERAFONE MAL ATRIUM SENEN (ERAFONE MILLENIUM MALL)",
  "E137":"ERAFONE GREEN PRAMUKA SQUARE","E408":"ERAFONE FRANCHISE RUKO SUMUR BATU",
  "E414":"ERAFONE RUKO PERCETAKAN NEGARA","E663":"ERAFONE RUKO GARUDA KEMAYORAN",
  "E732":"ERAFONE RUKO SABANG","M212":"ERAFONE AND MORE RAWASARI",
  "F080":"ERAFONE K MALL AT MENARA JAKARTA","E027":"ERAFONE DAAN MOGOT MALL",
  "E215":"ERAFONE GREEN SEDAYU MALL","M068":"ERAFONE AND MORE KAMAL RAYA",
  "E233":"ERAFONE RUKO TAMAN SURYA JAKBA","E312":"ERAFONE KRESEK KOSAMBI",
  "E381":"ERAFONE RUKO PETA BARAT JAKBAR","E453":"ERAFONE RUKO DURI KOSAMBI",
  "E960":"ERAFONE MB MENCENG RAYA","E992":"ERAFONE 2.5 KAPUK CENGKARENG",
  "E875":"ERAFONE MB POS PENGUMBEN","E413":"ERAFONE RUKO GOLDEN GREEN KEDOYA",
  "E465":"ERAFONE RUKO KEBAYORAN LAMA","E923":"ERAFONE MB JALAN PANJANG",
  "E943":"ERAFONE MB TAMAN RATU","E028":"ERAFONE MAL PURI INDAH",
  "E029":"ERAFONE PX PAVILION ST MORITS","E322":"ERAFONE RUKO MERUYA",
  "E514":"ERAFONE FRANCHISE RUKO MERUYA SELATAN","E679":"ERAFONE MULTIBRAND JOGLO RAYA",
  "E582":"ERAFONE MB SRENGSENG","E942":"ERAFONE KEMBANGAN UTARA",
  "E616":"ERAFONE MERUYA ILIR","M219":"ERAFONE AND MORE PURI INDAH MALL",
  "E172":"ERAFONE RUKO KEBON JERUK BINUS","E593":"ERAFONE MANGGA BESAR",
  "E508":"ERAFONE JEMBATAN LIMA","E164":"ERAFONE MAL TAMAN ANGGREK",
  "M091":"MEGASTORE CENTRAL PARK 3.0","E158":"ERAFONE MAL CIPUTRA JAKARTA",
  "E664":"ERAFONE TANJUNG DUREN","E991":"ERAFONE 2.5 KEMANGGISAN UTAMA RAYA",
  "E986":"ERAFONE MB JEMBATAN BESI","F134":"ERAFONE MAL CIPUTRA JAKARTA 2.5",
  "M014":"MEGASTORE BINTARO X-CHANGE","F077":"ERAFONE BINTARO X-CHANGE II",
  "E612":"ERAFONE RUKO JOMBANG TANGSEL","E160":"ERAFONE RUKO CEGER TANGERANG",
  "E620":"ERAFONE 2.5 PAJAJARAN PAMULANG","E299":"ERAFONE CIRENDEU PONDOK CABE",
  "M104":"MEGASTORE RUKO REMPOA CIPUTAT","E321":"ERAFONE RUKO SUDIMARA CIPUTAT",
  "M027":"ERAFONE AND MORE CIPUTAT","E704":"ERAFONE RUKO DEWANTARA CIPUTAT",
  "E043":"ERAFONE PLAZA BINTARO JAYA","E685":"ERAFONE MB PONDOK BETUNG",
  "E391":"ERAFONE RUKO WR SUPRATMAN CIPUTAT","E084":"ERAFONE 1 SUPERMALL KARAWACI",
  "M163":"ERAFONE AND MORE SERPONG","E777":"ERAFONE MB CIHUNI PAGEDANGAN (ERAFONE CIHUNI GADING SERPONG)",
  "E873":"ERAFONE MB LEGOK","E874":"ERAFONE MULTIBRAND DASANA INDAH",
  "E813":"ERAFONE MULTIBRAND SERPONG GARDEN CISAUK","E259":"ERAFONE RUKO KELAPA DUA TANGERANG",
  "M019":"MEGASTORE SUMMARECON MAL SERPONG","M013":"MEGASTORE SUPERMAL KARAWACI",
  "M222":"ERAFONE AND MORE EASTVARA MALL","E221":"ERAFONE AND MORE CIPUTRA CITRARAYA TANGERANG",
  "F058":"ERAFONE 2.5 TELAGA BESTARI","M048":"MEGASTORE RUKO CIKUPA",
  "M167":"ERAFONE AND MORE TELUK NAGA","E627":"ERAFONE RUKO CISOKA",
  "E253":"ERAFONE RUKO CURUG TANGERANG","E787":"ERAFONE MB TIGARAKSA",
  "E848":"ERAFONE PASAR KEMIS","E695":"ERAFONE MULTIBRAND BINONG",
  "E812":"ERAFONE RUKO KUTABUMI","E201":"ERAFONE RUKO KRESEK BALARAJA",
  "E744":"ERAFONE RUKO RAJEG TANGERANG","F066":"ERAFONE 2.5 SEPATAN",
  "F079":"ERAFONE 2.5 GRAND BATAVIA","M021":"MEGASTORE RUKO CILEDUG",
  "E231":"ERAFONE RUKO COKROAMINOTO CILEDUG","F003":"ERAFONE CILEDUG 2.5 RAYA",
  "M093":"MEGASTORE RUKO CIPONDOH TANGERANG","E290":"ERAFONE FRANCHISE RUKO PORIS",
  "E646":"ERAFONE BATU CEPER","E150":"ERAFONE CILEGON CENTER MALL",
  "E081":"ERAFONE MALL OF SERANG","E209":"ERAFONE RUKO AHMAD YANI SERANG",
  "E194":"ERAFONE RUKO RANGKASBITUNG","E308":"ERAFONE RUKO MAYOR SAFEI SERANG",
  "E320":"ERAFONE RUKO PANDEGLANG BANTEN","E589":"ERAFONE RUKO PANIMBANG PANDEGLANG",
  "E499":"ERAFONE LABUAN PANDEGLANG","E544":"ERAFONE RUKO MULTIBRAND CILEGON",
  "E821":"ERAFONE MB ANYER","E822":"ERAFONE MB KRAGILAN",
  "E833":"ERAFONE RANGKASBITUNG 2","E879":"ERAFONE MB CIPARE",
  "E191":"ERAFONE RUKO SURYA KENCANA PAMULANG","F022":"ERAFONE 2.5 PAMULANG",
  "E484":"ERAFONE SERPONG PARADISE WALK","E705":"ERAFONE RUKO CIATER RAYA SERPONG",
  "E087":"ERAFONE ITC BSD","E941":"ERAFONE MB RAYA SERPONG",
  "E586":"ERAFONE RUKO GRAHA RAYA","E834":"ERAFONE KEDAUNG TANGSEL",
  "E245":"ERAFONE RUKO BENDA RAYA PAMULANG","E082":"ERAFONE LIVING WORLD ALAM SUTERA",
  "E088":"ERAFONE AEON MAL BSD CITY","E119":"ERAFONE TANGERANG CITY MALL",
  "E696":"ERAFONE MB RASUNA SAID","E417":"ERAFONE RUKO HASYIM ASYARI CILEDUG",
  "M176":"ENM KISAMAUN","E422":"ERAFONE RUKO M TOHA TANGERANG",
  "E714":"ERAFONE RUKO JATAKE TANGERANG","E369":"ERAFONE FRANCHISE RUKO BOROBUDUR RAYA",
  "M061":"MEGASTORE RUKO JATIUWUNG","E684":"ERAFONE RUKO SANGIANG TANGERANG",
  "E370":"ERAFONE FRANCHISE RUKO BERINGIN KARAWACI","E251":"ERAFONE RUKO CIMONE",
  "M193":"ERAFONE & MORE EDC",
  "X033":"IBOX BINTARO PLAZA","X034":"IBOX - SDC SERPONG",
  "X035":"IBOX APP SUMMARECON MALL SERPONG","X191":"IBOX PARAMOUNT BSD",
  "X058":"IBOX TANGERANG CITY MALL","X222":"IBOX PAMULANG",
  "X049":"IBOX CILEGON CENTRE","X064":"IBOX CIPUTRA CITRARAYA TANGERANG",
  "X072":"IBOX LIVING WORLD ALAM SUTRA","X142":"IBOX AHMAD YANI SERANG",
  "X173":"IBOX MALL ALAM SUTRA","X190":"IBOX GREENLAKE",
  "X168":"IBOX APP BXC CHANGE 2","X012":"IBOX APP CENTRAL PARK",
  "X043":"IBOX ITC ROXY","X055":"IBOX MAL CIPUTRA JAKARTA",
  "X011":"IBOX APP ST MORITZ","X110":"IBOX GAJAH MADA MALL",
  "X016":"IBOX MAL ATRIUM SENEN (IBOX MILLENUM MALL)","X014":"IBOX MENTENG CENTRAL",
  "X015":"IBOX APP PLAZA INDONESIA","X022":"IBOX APP SENAYAN CITY",
  "X037":"IBOX MANGGA DUA","X172":"IBOX SENAYAN PARK",
  "X192":"IBOX K MALL AT MENARA JAKARTA","X135":"IBOX EDC",
  "S044":"SES 2 ITC ROXY MAS","S015":"SES ST MORITZ MALL",
  "S049":"SEP ITC CEMPAKA MAS","S055":"SES PLAZA SENAYAN",
  "S018":"SES SENAYAN CITY","S058":"SES GREEN PRAMUKA SQUARE",
  "S098":"SES SENAYAN PARK","S142":"SES CENTRAL PARK",
  "S194":"SAMSUNG AGORA MALL","S195":"SES K MALL AT MENARA JAKARTA",
  "S228":"SES CIPUTRA MALL JKT","S229":"SES GRAND INDONESIA EAST MALL",
  "S230":"SES MALL TAMAN ANGGREK","S231":"SES PLAZA INDONESIA",
  "S042":"SES AEON MALL BSD CITY","S041":"SES BINTARO X CHANGE",
  "S066":"SES CILEGON CENTER MALL","S056":"SES SUMMARECON MALL SERPONG",
  "S040":"SES TANGERANG CITY MALL","S097":"SES MALL CIPUTRA CITRA RAYA TANGERANG",
  "S136":"SAMSUNG PARTNER PLAZA PANDEGLANG","S137":"SAMSUNG PARTNER PLAZA CILEGON",
  "S158":"SAMSUNG (SEP) SERPONG PARADISE","S190":"SAMSUNG BINTARO X CHANGE II",
  "S201":"SAMSUNG HAMPTON SQUARE SERPONG","S183":"Samsung EDC",
  "N216":"XIAOMI STORE CIPUTRA CITRA RAYA TANGERANG","N200":"XIAOMI STORE 1 SUMMARECON MAL SERPONG",
  "N191":"XIAOMI STORE TANGERANG CITY MALL","N186":"XIAOMI STORE LIVING WORLD ALAM SUTRA",
  "N184":"XIAOMI STORE CENTRAL PARK","N183":"XIAOMI STORE BINTARO EXCHANGE MALL",
  "N144":"XIAOMI STORE LIPPO MALL ST. MORITZ","N140":"XIAOMI STORE CILEGON CENTER MALL",
  "N131":"XIAOMI STORE AEON MAL BSD CITY","N130":"XIAOMI STORE E-CENTER SUPERMAL KARAWACI",
  "N354":"MI- STORE K MALL AT MENARA JAKARTA","N326":"MI STORE MALL MATAHARI DAAN MOGOT",
  "N380":"MI-STORE PLAZA BINTARO JAYA","N394":"Xiaomi Store Grand Indonesia",
  "N286":"Xiaomi EDC"
};

const STORE_LIST = loadStoreMaster() || Object.entries(STORE_MAP).map(([code, name]) => ({
  code,
  name,
  region: 'Region 5',
  leader: '',
  contact: '',
  email: ''
}));
const STORE_DIRECTORY = Object.fromEntries(STORE_LIST.map(store => [store.code, store.name]));
const STORE_META = Object.fromEntries(STORE_LIST.map(store => [store.code, store]));

// ── DB helpers ──
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ submissions: [] }, null, 2));
}
function readDB()  { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(d){ fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }
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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/form',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'form.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/architecture', (req, res) => res.sendFile(path.join(__dirname, 'public', 'architecture.html')));

// Expose store master to frontend
app.get('/api/stores', (req, res) => res.json(STORE_DIRECTORY));
app.get('/api/store-master', (req, res) => res.json(STORE_LIST));
app.get('/api/admin-status', (req, res) => res.json({ enabled: Boolean(process.env.ADMIN_PIN) }));
app.post('/api/admin-login', (req, res) => {
  const pin = (req.body?.pin || '').trim();
  if (!process.env.ADMIN_PIN) {
    return res.status(503).json({ error: 'Admin PIN belum dikonfigurasi' });
  }
  if (!pin) {
    return res.status(400).json({ error: 'PIN admin wajib diisi' });
  }
  if (pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'PIN admin salah' });
  }
  res.json({ success: true });
});
function validateAdminPin(req, res) {
  const adminPin = req.get('x-admin-pin') || req.body?.admin_pin || '';
  if (!process.env.ADMIN_PIN) {
    res.status(503).json({ error: 'Admin PIN belum dikonfigurasi' });
    return null;
  }
  if (adminPin !== process.env.ADMIN_PIN) {
    res.status(401).json({ error: 'PIN admin salah' });
    return null;
  }
  return adminPin;
}

// ── SSE ──
let sseClients = [];
function broadcastUpdate(payload) {
  sseClients = sseClients.filter(r => {
    try { r.write(`data: ${JSON.stringify(payload)}\n\n`); return true; }
    catch(e) { return false; }
  });
}

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  sseClients.push(res);
  const hb = setInterval(() => {
    try { res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`); }
    catch(e) { clearInterval(hb); }
  }, 25000);
  req.on('close', () => { clearInterval(hb); sseClients = sseClients.filter(c => c !== res); });
});

// ── Submit ──
app.post('/api/submit', (req, res) => {
  const { store_code, store_leader, submission_date, spg_data } = req.body;
  if (!store_code || !store_leader || !submission_date || !Array.isArray(spg_data)) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  const store_code_upper = store_code.trim().toUpperCase();
  const store_name = STORE_DIRECTORY[store_code_upper] || `Toko ${store_code_upper}`;

  try {
    const db = readDB();
    db.submissions = db.submissions.filter(
      s => !(s.store_code === store_code_upper && s.submission_date === submission_date)
    );

    const total = spg_data.reduce((sum, s) => sum + (parseInt(s.customer_count) || 0), 0);
    const now = new Date().toISOString();

    db.submissions.unshift({
      id: Date.now(),
      store_code: store_code_upper,
      store_name,
      store_leader,
      submission_date,
      submitted_at: now,
      spg_data: spg_data.map(s => ({ ...s, customer_count: parseInt(s.customer_count) || 0 })),
      total_customers: total
    });

    writeDB(db);
    broadcastUpdate({ type: 'new_submission', store_code: store_code_upper, store: store_name, store_leader, total, time: now });
    res.json({ success: true, store_name });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Check today ──
app.get('/api/today', (req, res) => {
  const { store_code, date } = req.query;
  const db = readDB();
  const found = db.submissions.find(
    s => s.store_code === store_code?.trim().toUpperCase() && s.submission_date === date
  );
  if (!found) return res.json({ exists: false });
  res.json({ exists: true, submission: found, spg_data: found.spg_data });
});

// ── Admin delete submission ──
app.delete('/api/submission', (req, res) => {
  const { store_code, date } = req.body || {};
  if (!validateAdminPin(req, res)) return;

  const storeCode = (store_code || '').trim().toUpperCase();
  if (!storeCode || !date) {
    return res.status(400).json({ error: 'Store code dan tanggal wajib diisi' });
  }

  const db = readDB();
  const before = db.submissions.length;
  db.submissions = db.submissions.filter(
    s => !(s.store_code === storeCode && s.submission_date === date)
  );

  if (db.submissions.length === before) {
    return res.status(404).json({ error: 'Data report tidak ditemukan' });
  }

  writeDB(db);
  broadcastUpdate({ type: 'deleted_submission', store_code: storeCode, date, time: new Date().toISOString() });
  res.json({ success: true });
});

app.post('/api/reset-month', (req, res) => {
  const month = normalizeMonth(req.body?.month);
  if (!validateAdminPin(req, res)) return;
  if (!month) {
    return res.status(400).json({ error: 'Bulan reset wajib diisi dengan format YYYY-MM' });
  }

  const db = readDB();
  const before = db.submissions.length;
  db.submissions = db.submissions.filter(s => monthFromDate(s.submission_date) !== month);
  const removed = before - db.submissions.length;

  writeDB(db);
  broadcastUpdate({ type: 'reset_month', month, removed, time: new Date().toISOString() });
  res.json({ success: true, removed });
});

// ── Dashboard data ──
app.get('/api/data', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const month = normalizeMonth(req.query.month) || monthFromDate(date);
  const db = readDB();
  const monthSubmissions = db.submissions.filter(s => monthFromDate(s.submission_date) === month);
  const { storeSummaries, brandTotals, grandTotal } = summarizeMonth(monthSubmissions);
  res.json({
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
    registeredStores: STORE_LIST.length,
    pendingStores: Math.max(STORE_LIST.length - storeSummaries.length, 0)
  });
});

// ── History ──
app.get('/api/history', (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const month = normalizeMonth(req.query.month);
  const db = readDB();
  const dayMap = {};
  db.submissions
    .filter(s => !month || monthFromDate(s.submission_date) === month)
    .forEach(s => {
    if (!dayMap[s.submission_date])
      dayMap[s.submission_date] = { submission_date: s.submission_date, total: 0, store_count: 0 };
    dayMap[s.submission_date].total += s.total_customers || 0;
    dayMap[s.submission_date].store_count += 1;
  });
  const rows = Object.values(dayMap).sort((a,b) => a.submission_date.localeCompare(b.submission_date));
  res.json(month ? rows : rows.slice(-days));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔══════════════════════════════════════════╗
║     ERA Walk-In Customer System v1.0     ║
╠══════════════════════════════════════════╣
║  Dashboard : http://localhost:${PORT}/         ║
║  Form      : http://localhost:${PORT}/form     ║
╚══════════════════════════════════════════╝
  `);
});
