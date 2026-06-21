import assert from 'assert';
import app from '../server.js';
import http from 'http';

const PORT = 0;

const srv = http.createServer(app);

await new Promise((resolve) => srv.listen(PORT, resolve));
const address = srv.address();
assert(address && typeof address === 'object', 'Server address should be defined');
const port = address.port;

function fetchJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: options.method || 'GET', headers: options.headers || {} },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

try {
  const health = await fetchJson('/api/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.body.status, 'ok');

  const challengeResp = await fetchJson('/api/eco-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ total: 3500, home: 1400, transport: 900, diet: 900, waste: 300 })
  });
  assert.strictEqual(challengeResp.status, 200);
  assert(challengeResp.body.challenge, 'Should return challenge payload');
  assert.strictEqual(challengeResp.body.topSector, 'Home Energy');

  const coachResp = await fetchJson('/api/eco-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ total: 3500, home: 1400, transport: 900, diet: 900, waste: 300 })
  });
  assert.strictEqual(coachResp.status, 200);
  assert(coachResp.body.advice.includes('Top Contributor'));

  const leaderboardResp = await fetchJson('/api/leaderboard');
  assert.strictEqual(leaderboardResp.status, 200);
  assert(Array.isArray(leaderboardResp.body.users));

  const offsetsResp = await fetchJson('/api/offsets?emissions=3500');
  assert.strictEqual(offsetsResp.status, 200);
  assert(Number.isInteger(offsetsResp.body.treesNeeded));

  console.log('✅ Server API tests passed successfully.');
} catch (error) {
  console.error('❌ Server API tests failed.');
  console.error(error);
  process.exit(1);
} finally {
  srv.close();
}
