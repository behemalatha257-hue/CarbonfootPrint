import https from 'https';
import fs from 'fs';
import { execFileSync } from 'child_process';

const base = 'https://carbon-footprint-tracker-369987229127.us-central1.run.app/js/';
const files = ['app.js', 'ui.js', 'storage.js', 'calculations.js'];

for (const file of files) {
  const url = base + file;
  const code = await new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
      res.on('error', reject);
    }).on('error', reject);
  });
  const tmp = `tmp-${file}`;
  fs.writeFileSync(tmp, code, 'utf8');
  try {
    execFileSync('node', ['--check', tmp], { stdio: 'inherit' });
    console.log(`${file}: OK`);
  } catch (err) {
    console.error(`${file}: SYNTAX ERROR`);
  }
  fs.unlinkSync(tmp);
}
