// ============================================================
// TEST-API.JS - Tests rapides de l'API
// ============================================================
// Usage: node test-api.js

const http = require('http');

const BASE_URL = 'http://localhost:3001/api';
let token = null;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Tests API Fleet Manager\n');

  try {
    // 1. Login
    console.log('1️⃣  Test Login...');
    let res = await request('POST', '/auth/login', {
      email: 'admin@ncmali.com',
      password: 'admin123'
    });
    if (res.status !== 200) throw new Error(`Login failed: ${res.status}`);
    token = res.data.token;
    console.log('✅ Login OK\n');

    // 2. Get camions
    console.log('2️⃣  Test GET /camions...');
    res = await request('GET', '/camions');
    if (res.status !== 200) throw new Error(`GET camions failed: ${res.status}`);
    console.log(`✅ Found ${res.data.length} camions\n`);

    // 3. Get transactions
    console.log('3️⃣  Test GET /transactions...');
    res = await request('GET', '/transactions?limit=10');
    if (res.status !== 200) throw new Error(`GET transactions failed: ${res.status}`);
    console.log(`✅ Found ${res.data.length} transactions\n`);

    // 4. Get stats
    console.log('4️⃣  Test GET /stats...');
    res = await request('GET', '/stats');
    if (res.status !== 200) throw new Error(`GET stats failed: ${res.status}`);
    console.log(`✅ Stats: Revenu=${res.data.totalRevenu}, Dépense=${res.data.totalDepense}, Marge=${res.data.marge?.toFixed(1)}%\n`);

    // 5. Test validation - montant invalide
    console.log('5️⃣  Test Validation (montant invalide)...');
    res = await request('POST', '/transactions', {
      camion_id: 1,
      date: '2026-04-08',
      categorie: 'REVENU',
      description: 'Test',
      revenu: -1000, // Invalide
      depense: 0,
      paiement: 'Espèce'
    });
    if (res.status !== 400) throw new Error(`Validation should fail: ${res.status}`);
    console.log(`✅ Validation OK (rejeté montant négatif)\n`);

    // 6. Test validation - date invalide
    console.log('6️⃣  Test Validation (date invalide)...');
    res = await request('POST', '/transactions', {
      camion_id: 1,
      date: 'invalid-date',
      categorie: 'REVENU',
      description: 'Test',
      revenu: 1000,
      depense: 0,
      paiement: 'Espèce'
    });
    if (res.status !== 400) throw new Error(`Validation should fail: ${res.status}`);
    console.log(`✅ Validation OK (rejeté date invalide)\n`);

    // 7. Test validation - catégorie invalide
    console.log('7️⃣  Test Validation (catégorie invalide)...');
    res = await request('POST', '/transactions', {
      camion_id: 1,
      date: '2026-04-08',
      categorie: 'INVALID_CAT',
      description: 'Test',
      revenu: 1000,
      depense: 0,
      paiement: 'Espèce'
    });
    if (res.status !== 400) throw new Error(`Validation should fail: ${res.status}`);
    console.log(`✅ Validation OK (rejeté catégorie invalide)\n`);

    // 8. Test pagination
    console.log('8️⃣  Test Pagination...');
    res = await request('GET', '/transactions?limit=5&offset=0');
    if (res.status !== 200) throw new Error(`Pagination failed: ${res.status}`);
    console.log(`✅ Pagination OK (${res.data.length} résultats)\n`);

    console.log('✅ TOUS LES TESTS PASSÉS!\n');
    console.log('📊 Résumé:');
    console.log('  ✅ Authentification');
    console.log('  ✅ Récupération données');
    console.log('  ✅ Calcul statistiques');
    console.log('  ✅ Validation montants');
    console.log('  ✅ Validation dates');
    console.log('  ✅ Validation catégories');
    console.log('  ✅ Pagination');

  } catch (e) {
    console.error('❌ ERREUR:', e.message);
    process.exit(1);
  }
}

// Attendre que le serveur soit prêt
setTimeout(runTests, 1000);
