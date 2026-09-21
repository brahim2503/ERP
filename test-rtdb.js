const https = require('https');

const apiKey = "AIzaSyDFYw-VoxbxqlWJTnv12lOFit6Ki6eC5-g";

function api(method, urlStr, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function test() {
  const signin = await api('POST', `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    email: "admin@erp-mark.com",
    password: "toushir_1234_erp2026",
    returnSecureToken: true
  });
  const idToken = signin.json.idToken;

  const rtdbRes = await api('GET', `https://erp-mark-default-rtdb.europe-west1.firebasedatabase.app/.json?auth=${idToken}`);
  console.log('RTDB with auth status:', rtdbRes.status, rtdbRes.json || rtdbRes.data);

  const rtdbUnauth = await api('GET', `https://erp-mark-default-rtdb.europe-west1.firebasedatabase.app/.json`);
  console.log('RTDB unauth status:', rtdbUnauth.status, rtdbUnauth.json || rtdbUnauth.data);
}

test().catch(console.error);
