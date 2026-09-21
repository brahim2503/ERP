const https = require('https');

const apiKey = "AIzaSyDFYw-VoxbxqlWJTnv12lOFit6Ki6eC5-g";

function api(method, urlStr, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const signin = await api('POST', `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    email: "admin@erp-mark.com",
    password: "toushir_1234_erp2026",
    returnSecureToken: true
  });
  
  const idToken = signin.json.idToken;
  console.log('Got token:', !!idToken);

  // Try reading a single doc
  const readRes = await api('GET', `https://firestore.googleapis.com/v1/projects/erp-mark/databases/(default)/documents/settings/app`, null, {
    'Authorization': `Bearer ${idToken}`
  });
  console.log('Read settings/app:', readRes.status, readRes.json);

  // Try creating a test product
  const writeRes = await api('POST', `https://firestore.googleapis.com/v1/projects/erp-mark/databases/(default)/documents/products?documentId=test1`, {
    fields: {
      name: { stringValue: "منتج تجريبي" },
      price: { integerValue: "100" }
    }
  }, {
    'Authorization': `Bearer ${idToken}`
  });
  console.log('Write product:', writeRes.status, writeRes.json);
}

main().catch(console.error);
