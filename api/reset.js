const { getDefaultDb, writeDb, sendJson, setCorsHeaders } = require('./_db');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'POST') {
      const cleanDb = getDefaultDb();
      writeDb(cleanDb);
      return sendJson(res, 200, {
        success: true,
        message: 'تم تصفير وتهيئة قاعدة البيانات بنجاح'
      });
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[API /api/reset] Error:', err);
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
};
