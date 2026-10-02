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


const cosmeticHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Jammer P4.1 Cosmetic Fixture</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; line-height: 1.5; }
    .box { border: 2px solid #777; padding: 18px; margin: 14px 0; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>Jammer P4.1 Cosmetic Fixture</h1>
  <p>Normal content must stay visible. Explicit ad containers should disappear only when Page ad cleanup is enabled.</p>
  <div id="normal-content" class="box">NORMAL CONTENT — MUST STAY VISIBLE</div>
  <div id="internal-ad" class="box ad-container">INTERNAL AD CONTAINER — SHOULD BE HIDDEN</div>
  <ins id="google-slot" class="box adsbygoogle">ADSBYGOOGLE SLOT — SHOULD BE HIDDEN</ins>
  <aside id="aria-ad" class="box" role="complementary" aria-label="Advertisement">ADVERTISEMENT REGION — SHOULD BE HIDDEN</aside>
  <ul>
    <li>Normal content: <strong id="normal-state">PENDING</strong></li>
    <li>Internal ad container: <strong id="internal-state">PENDING</strong></li>
    <li>AdsByGoogle slot: <strong id="google-state">PENDING</strong></li>
    <li>Advertisement region: <strong id="aria-state">PENDING</strong></li>
  </ul>
  <p id="cosmetic-verdict">Waiting for CSS state…</p>
  <script>
    function hidden(id) {
      const element = document.getElementById(id);
      const style = getComputedStyle(element);
      return style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.height) === 0;
    }

    setTimeout(() => {
      const normalHidden = hidden('normal-content');
      const internalHidden = hidden('internal-ad');
      const googleHidden = hidden('google-slot');
      const ariaHidden = hidden('aria-ad');

      document.getElementById('normal-state').textContent = normalHidden ? 'HIDDEN' : 'VISIBLE';
      document.getElementById('internal-state').textContent = internalHidden ? 'HIDDEN' : 'VISIBLE';
      document.getElementById('google-state').textContent = googleHidden ? 'HIDDEN' : 'VISIBLE';
      document.getElementById('aria-state').textContent = ariaHidden ? 'HIDDEN' : 'VISIBLE';

      const verdict = document.getElementById('cosmetic-verdict');
      if (!normalHidden && internalHidden && googleHidden && ariaHidden) {
        verdict.textContent = 'Page ad cleanup expectation: PASS';
        verdict.className = 'pass';
      } else if (!normalHidden && !internalHidden && !googleHidden && !ariaHidden) {
        verdict.textContent = 'Page ad cleanup appears OFF.';
      } else {
        verdict.textContent = 'Unexpected partial cosmetic state.';
        verdict.className = 'fail';
      }
    }, 700);
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
    return;
  }
  if (url === '/cosmetic' || url === '/cosmetic.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(cosmeticHtml);
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
  console.log(`Jammer cosmetic fixture: http://${HOST}:${PORT}/cosmetic`);
  console.log('Press Ctrl+C to stop.');
});
