import http from 'node:http';

const HOST = '127.0.0.1';
const PORT = 8765;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Jammer P1 Runtime Fixture</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; line-height: 1.5; }
    .pass { color: green; }
    .fail { color: red; }
    code { background: #eee; padding: 2px 5px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Jammer P1 Runtime Fixture</h1>
  <p>Expected with Jammer protection ON: clean script loads; ad fixture is blocked.</p>
  <p>Expected with Jammer protection OFF: both scripts load.</p>
  <ul>
    <li>Clean script: <strong id="clean">PENDING</strong></li>
    <li>Ad fixture: <strong id="ad">PENDING</strong></li>
  </ul>
  <p id="verdict">Waiting for scripts…</p>
  <script>
    window.__jammerCleanLoaded = false;
    window.__jammerAdLoaded = false;
    setTimeout(() => {
      const clean = document.getElementById('clean');
      const ad = document.getElementById('ad');
      const verdict = document.getElementById('verdict');
      clean.textContent = window.__jammerCleanLoaded ? 'LOADED' : 'NOT LOADED';
      ad.textContent = window.__jammerAdLoaded ? 'LOADED' : 'BLOCKED / NOT LOADED';
      if (window.__jammerCleanLoaded && !window.__jammerAdLoaded) {
        clean.className = 'pass';
        ad.className = 'pass';
        verdict.textContent = 'Protection-on expectation: PASS';
        verdict.className = 'pass';
      } else if (window.__jammerCleanLoaded && window.__jammerAdLoaded) {
        clean.className = 'pass';
        ad.className = 'fail';
        verdict.textContent = 'Both loaded: protection may be OFF or the DNR rule did not apply.';
      } else {
        verdict.textContent = 'Fixture server or browser loading problem.';
        verdict.className = 'fail';
      }
    }, 700);
  </script>
  <script src="/jammer-fixture/clean.js"></script>
  <script src="/jammer-fixture/ad.js"></script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
    return;
  }
  if (url === '/jammer-fixture/clean.js') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end('window.__jammerCleanLoaded = true;');
    return;
  }
  if (url === '/jammer-fixture/ad.js') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end('window.__jammerAdLoaded = true;');
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Jammer runtime fixture: http://${HOST}:${PORT}/`);
  console.log('Press Ctrl+C to stop.');
});
