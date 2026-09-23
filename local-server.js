const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const REAL_DB_FILE = path.join(__dirname, 'real-database.js');

function getRealDb() {
  try {
    if (fs.existsSync(REAL_DB_FILE)) {
      const code = fs.readFileSync(REAL_DB_FILE, 'utf8');
      const sandbox = {};
      const fn = new Function('window', code);
      fn(sandbox);
      if (sandbox.REAL_DATABASE && Array.isArray(sandbox.REAL_DATABASE.products) && sandbox.REAL_DATABASE.products.length > 0) {
        return sandbox.REAL_DATABASE;
      }
    }
  } catch (err) {
    console.error('Error loading real-database.js in server:', err.message);
  }
  return getDefaultDb();
}

// Default empty clean database state for client handover
function getDefaultDb() {
  return {
    suppliers: [],
    customers: [],
    customerLedgers: {},
    purchaseInvoices: [],
    salesInvoices: [],
    products: [],
    workers: [
      {
        id: 'wrk_1',
        name: 'المدير',
        role: 'مدير النظام (Admin)',
        phone: '0600000000',
        salary: 85000,
        pin: '1234',
        status: 'Active',
        hireDate: new Date().toISOString().slice(0, 10),
        permissions: ['dashboard', 'pos', 'customers', 'suppliers', 'purchases', 'reports', 'settings']
      }
    ],
    ledgers: {},
    whatsappNotifications: [],
    readAlertIds: [],
    settings: {
      whatsappProvider: 'meta',
      whatsappPhoneId: '',
      whatsappToken: '',
      currency: 'دج',
      storeName: 'توشير ERP لتجارة المواد الغذائية',
      templateText: 'السلام عليكم {{customerName}}،\n\nتم تسجيل عملية شراء بالدين بنجاح.\n\n🧾 رقم الفاتورة: {{invoiceNumber}}\n📅 التاريخ: {{invoiceDate}}\n\nالمنتجات:\n{{productList}}\n\n💰 إجمالي الفاتورة: {{totalAmount}} {{currency}}\n💵 المدفوع: {{amountPaid}} {{currency}}\n📌 المتبقي: {{remainingAmount}} {{currency}}\n📊 رصيدكم الحالي: {{customerBalance}} {{currency}}\n\nشكرًا لتعاملكم معنا، ونتمنى لكم يومًا سعيدًا.'
    }
  };
}

// Read database
function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.products)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading database.json:', err.message);
  }
  const cleanDb = getDefaultDb();
  writeDb(cleanDb);
  return cleanDb;
}

// Write database atomically
function writeDb(data) {
  try {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing database.json:', err.message);
    return false;
  }
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = req.url.split('?')[0];

  // =========================================================================
  // API: Get Real Database Data
  // =========================================================================
  if (reqUrl === '/api/data' && req.method === 'GET') {
    const db = readDb();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(db));
    return;
  }

  // =========================================================================
  // API: Save Real Database Data
  // =========================================================================
  if (reqUrl === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const current = readDb();
        const merged = { ...current };
        for (const [key, val] of Object.entries(payload)) {
          if (Array.isArray(val)) {
            merged[key] = val;
          } else if (val && typeof val === 'object') {
            merged[key] = { ...(current[key] || {}), ...val };
          } else if (val !== undefined) {
            merged[key] = val;
          }
        }
        writeDb(merged);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, message: 'تم حفظ البيانات في قاعدة البيانات بنجاح' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // =========================================================================
  // API: Reset Database to 0 (Clean Handover)
  // =========================================================================
  if (reqUrl === '/api/reset' && req.method === 'POST') {
    const cleanDb = getDefaultDb();
    writeDb(cleanDb);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, message: 'تم تصفير وتهيئة قاعدة البيانات بنجاح' }));
    return;
  }

  // =========================================================================
  // API: Restore Real Database
  // =========================================================================
  if (reqUrl === '/api/restore-real' && (req.method === 'POST' || req.method === 'GET')) {
    const realDb = getRealDb();
    writeDb(realDb);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, message: 'تم استعادة وتثبيت قاعدة البيانات الحقيقية بنجاح', data: realDb }));
    return;
  }

  // =========================================================================
  // Static File Serving
  // =========================================================================
  let fileUrl = reqUrl === '/' ? '/index.html' : reqUrl;
  const safePath = path.normalize(fileUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running with Real Database API at http://localhost:${PORT}`);
  });
}

module.exports = server;
