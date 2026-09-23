const fs = require('fs');
const path = require('path');

// Default clean initial database state with default admin worker
function getDefaultDb() {
  return {
    suppliers: [],
    customers: [],
    customerLedgers: {},
    products: [],
    purchaseInvoices: [],
    salesInvoices: [],
    workers: [
      {
        id: "wrk_1",
        name: "المدير",
        role: "مدير النظام (Admin)",
        phone: "0600000000",
        salary: 0,
        pin: "1234",
        status: "Active",
        hireDate: "2026-09-19",
        permissions: [
          "dashboard",
          "pos",
          "customers",
          "suppliers",
          "purchases",
          "reports",
          "settings"
        ],
        email: "rovey96935@fidhost.com"
      }
    ],
    ledgers: {},
    whatsappNotifications: [],
    readAlertIds: [],
    settings: {
      whatsappProvider: "meta",
      whatsappPhoneId: "",
      whatsappToken: "",
      currency: "دج",
      storeName: "توشير ERP",
      templateText: "السلام عليكم {{customerName}}،\n\nتم تسجيل عملية شراء بالدين بنجاح.\n\n🧾 رقم الفاتورة: {{invoiceNumber}}\n📅 التاريخ: {{invoiceDate}}\n\nالمنتجات:\n{{productList}}\n\n💰 إجمالي الفاتورة: {{totalAmount}} {{currency}}\n💵 المدفوع: {{amountPaid}} {{currency}}\n📌 المتبقي: {{remainingAmount}} {{currency}}\n📊 رصيدكم الحالي: {{customerBalance}} {{currency}}\n\nشكرًا لتعاملكم معنا، ونتمنى لكم يومًا سعيدًا."
    }
  };
}

// In-memory cache for warm serverless execution
let _memoryDb = null;

// Paths
const ROOT_DB_FILE = path.join(process.cwd(), 'database.json');
const TMP_DB_FILE = path.join('/tmp', 'database.json');

function ensureDbShape(db) {
  const fallback = getDefaultDb();
  if (!db || typeof db !== 'object') return fallback;

  return {
    suppliers: Array.isArray(db.suppliers) ? db.suppliers : [],
    customers: Array.isArray(db.customers) ? db.customers : [],
    customerLedgers: db.customerLedgers && typeof db.customerLedgers === 'object' ? db.customerLedgers : {},
    products: Array.isArray(db.products) ? db.products : [],
    purchaseInvoices: Array.isArray(db.purchaseInvoices) ? db.purchaseInvoices : [],
    salesInvoices: Array.isArray(db.salesInvoices) ? db.salesInvoices : [],
    workers: Array.isArray(db.workers) && db.workers.length > 0 ? db.workers : fallback.workers,
    ledgers: db.ledgers && typeof db.ledgers === 'object' ? db.ledgers : {},
    whatsappNotifications: Array.isArray(db.whatsappNotifications) ? db.whatsappNotifications : [],
    readAlertIds: Array.isArray(db.readAlertIds) ? db.readAlertIds : [],
    settings: db.settings && typeof db.settings === 'object' ? { ...fallback.settings, ...db.settings } : fallback.settings
  };
}

function readDb() {
  // 1. Fast in-memory cache
  if (_memoryDb) {
    return ensureDbShape(_memoryDb);
  }

  // 2. Try /tmp cache (serverless writable cache)
  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      const content = fs.readFileSync(TMP_DB_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        _memoryDb = ensureDbShape(parsed);
        return _memoryDb;
      }
    }
  } catch (_) {}

  // 3. Try committed seed database file in project root
  try {
    if (fs.existsSync(ROOT_DB_FILE)) {
      const content = fs.readFileSync(ROOT_DB_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        _memoryDb = ensureDbShape(parsed);
        return _memoryDb;
      }
    }
  } catch (_) {}

  // 4. Default clean state
  _memoryDb = getDefaultDb();
  return _memoryDb;
}

function writeDb(data) {
  const shaped = ensureDbShape(data);
  _memoryDb = shaped;

  // Try writing to root file (works locally; read-only on Vercel)
  try {
    const tmp = ROOT_DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(shaped, null, 2), 'utf8');
    fs.renameSync(tmp, ROOT_DB_FILE);
  } catch (_) {
    // Expected on Vercel serverless read-only filesystem
  }

  // Try writing to /tmp (works in serverless environments as temporary cache)
  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(shaped, null, 2), 'utf8');
  } catch (_) {}

  return true;
}

// Helper: send CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Helper: send JSON response (compatible with Vercel and native Node http)
function sendJson(res, status, payload) {
  setCorsHeaders(res);
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(payload);
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(payload));
}

// Helper: parse request body (handles pre-parsed Vercel body & raw Node streams)
function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'object') return resolve(req.body);
      if (typeof req.body === 'string') {
        try {
          return resolve(JSON.parse(req.body || '{}'));
        } catch (e) {
          return reject(e);
        }
      }
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

module.exports = {
  getDefaultDb,
  readDb,
  writeDb,
  setCorsHeaders,
  sendJson,
  parseBody
};
