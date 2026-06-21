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
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
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
  assert.strictEqual(health.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(health.headers['x-frame-options'], 'DENY');
  assert.strictEqual(health.headers['referrer-policy'], 'no-referrer');

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
  assert.strictEqual(coachResp.body.highestSector, 'Home Energy');
  assert.ok(coachResp.body.advice && typeof coachResp.body.advice.summary === 'string');
  assert.ok(Array.isArray(coachResp.body.advice.recommendations));

  const invalidCoachResp = await fetchJson('/api/eco-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(invalidCoachResp.status, 400);
  assert.strictEqual(invalidCoachResp.body.error, 'Incomplete or invalid carbon footprint inputs.');

  const offsetsInvalidResp = await fetchJson('/api/offsets?emissions=-100');
  assert.strictEqual(offsetsInvalidResp.status, 400);
  assert.strictEqual(offsetsInvalidResp.body.error, 'Emissions must be a non-negative number.');

  const leaderboardResp = await fetchJson('/api/leaderboard');
  assert.strictEqual(leaderboardResp.status, 200);
  assert(Array.isArray(leaderboardResp.body.users));

  const missingApiResp = await fetchJson('/api/does-not-exist');
  assert.strictEqual(missingApiResp.status, 404);
  assert.strictEqual(missingApiResp.body.error, 'Unknown API route.');

  const ecoChallengeResp = await fetchJson('/api/eco-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ total: 3500, home: 1400, transport: 900, diet: 900, waste: 300 })
  });
  assert.strictEqual(ecoChallengeResp.status, 200);
  assert.strictEqual(ecoChallengeResp.body.topSector, 'Home Energy');
  assert.strictEqual(ecoChallengeResp.body.challenge.title, 'Home Energy Reboot');
  assert.strictEqual(ecoChallengeResp.body.projectedReduction, 350);

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
