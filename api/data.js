const { readDb, writeDb, sendJson, parseBody, setCorsHeaders } = require('./_db');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const db = readDb();
      return sendJson(res, 200, db);
    }

    if (req.method === 'POST') {
      const payload = await parseBody(req);
      const current = readDb();
      const merged = { ...current };

      if (payload && typeof payload === 'object') {
        for (const [key, val] of Object.entries(payload)) {
          if (Array.isArray(val)) {
            merged[key] = val;
          } else if (val && typeof val === 'object') {
            merged[key] = { ...(current[key] || {}), ...val };
          } else if (val !== undefined) {
            merged[key] = val;
          }
        }
      }

      writeDb(merged);
      return sendJson(res, 200, {
        success: true,
        message: 'تم حفظ البيانات في قاعدة البيانات بنجاح'
      });
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[API /api/data] Error:', err);
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
};
