const fs = require('fs');
const path = require('path');
const { getDefaultDb, writeDb, sendJson, setCorsHeaders } = require('./_db');

function getRealDb() {
  const realDbFile = path.join(process.cwd(), 'real-database.js');
  try {
    if (fs.existsSync(realDbFile)) {
      const code = fs.readFileSync(realDbFile, 'utf8');
      const sandbox = {};
      const fn = new Function('window', code);
      fn(sandbox);
      if (sandbox.REAL_DATABASE && typeof sandbox.REAL_DATABASE === 'object') {
        return sandbox.REAL_DATABASE;
      }
    }
  } catch (err) {
    console.error('[API /api/restore-real] Error loading real-database.js:', err.message);
  }
  return getDefaultDb();
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' || req.method === 'POST') {
      const realDb = getRealDb();
      writeDb(realDb);
      return sendJson(res, 200, {
        success: true,
        message: 'تم استعادة وتثبيت قاعدة البيانات بنجاح',
        data: realDb
      });
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[API /api/restore-real] Error:', err);
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
};
