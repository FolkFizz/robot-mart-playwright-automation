const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.resolve(ROOT_DIR, 'assets/readme');
const RAW_VIEWPORT = { width: 1760, height: 960 };
const SHOWCASE_VIEWPORT = { width: 1720, height: 1040 };

const GRAFANA_URL = (process.env.GRAFANA_URL || 'http://localhost:3001').replace(/\/+$/, '');
const GRAFANA_DASHBOARD_URL =
  process.env.GRAFANA_DASHBOARD_URL ||
  `${GRAFANA_URL}/d/k6-portfolio-overview/k6-portfolio-overview?orgId=1&from=now-30m&to=now&kiosk`;

const PROMETHEUS_URL = (process.env.PROMETHEUS_URL || 'http://localhost:9090').replace(/\/+$/, '');
const PROMETHEUS_GRAPH_URL =
  process.env.PROMETHEUS_GRAPH_URL ||
  `${PROMETHEUS_URL}/graph?g0.expr=sum(rate(k6_http_reqs_total%5B1m%5D))&g0.tab=0`;

const mimeTypeByExtension = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeReadFile = (filePath) => {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
};

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypeByExtension[ext] || 'application/octet-stream';
};

const sanitizeRequestPath = (requestPath) => {
  const raw = (requestPath || '/').split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(raw);
  if (decoded === '/' || decoded === '') return '/index.html';
  return decoded;
};

const startStaticServer = (rootDir, port = 57890) =>
  new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestPath = sanitizeRequestPath(req.url);
      const normalized = path.normalize(path.join(rootDir, requestPath));

      if (!normalized.startsWith(rootDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      let filePath = normalized;
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      const content = safeReadFile(filePath);
      if (!content) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(content);
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          })
      });
    });
  });

const writePlaceholder = async (page, outputFile, title, subtitle) => {
  const now = new Date().toISOString();
  await page.setViewportSize(SHOWCASE_VIEWPORT);
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            font-family: "Segoe UI", Tahoma, sans-serif;
            background:
              radial-gradient(circle at 15% 20%, #0ea5e9 0%, transparent 35%),
              radial-gradient(circle at 85% 15%, #22c55e 0%, transparent 33%),
              linear-gradient(135deg, #0b1020 0%, #111827 55%, #0f172a 100%);
            color: #f8fafc;
            display: grid;
            place-items: center;
          }
          .card {
            width: 1080px;
            max-width: calc(100vw - 64px);
            border-radius: 20px;
            border: 1px solid rgba(148, 163, 184, 0.35);
            background: rgba(15, 23, 42, 0.8);
            padding: 40px 44px;
            box-shadow: 0 30px 70px rgba(2, 6, 23, 0.45);
            backdrop-filter: blur(4px);
          }
          .badge {
            display: inline-block;
            font-size: 12px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            border: 1px solid rgba(148, 163, 184, 0.45);
            border-radius: 999px;
            padding: 6px 12px;
            color: #bfdbfe;
            margin-bottom: 18px;
          }
          h1 {
            margin: 0 0 10px;
            font-size: 44px;
            line-height: 1.15;
          }
          p {
            margin: 0;
            color: #cbd5e1;
            font-size: 20px;
            line-height: 1.5;
          }
          .meta {
            margin-top: 24px;
            font-size: 14px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <section class="card">
          <div class="badge">Portfolio Snapshot Placeholder</div>
          <h1>${title}</h1>
          <p>${subtitle}</p>
          <div class="meta">Generated at ${now}</div>
        </section>
      </body>
    </html>
  `);
  await page.screenshot({ path: outputFile, fullPage: false });
};

const toDataUrl = (buffer, mimeType = 'image/png') => {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
};

const renderShowcase = async (page, options) => {
  const { outputFile, title, subtitle, rawImageBuffer, accent = '#22c55e' } = options;
  const now = new Date().toISOString().replace('T', ' ').replace('Z', ' UTC');
  const imageDataUrl = toDataUrl(rawImageBuffer);

  await page.setViewportSize(SHOWCASE_VIEWPORT);
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>
          :root {
            --accent: ${accent};
            --text-strong: #ecf2ff;
            --text-soft: #b8c5e3;
            --line: rgba(166, 180, 214, 0.38);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: "Trebuchet MS", "Segoe UI", Arial, sans-serif;
            background:
              radial-gradient(circle at 18% 12%, rgba(56, 189, 248, 0.38) 0%, transparent 38%),
              radial-gradient(circle at 84% 14%, rgba(34, 197, 94, 0.35) 0%, transparent 34%),
              linear-gradient(130deg, #081120 0%, #0f1a31 42%, #0a1326 100%);
            color: var(--text-strong);
            display: grid;
            place-items: center;
            padding: 36px;
          }
          .frame {
            width: min(1640px, calc(100vw - 60px));
            border: 1px solid var(--line);
            border-radius: 24px;
            background: linear-gradient(180deg, rgba(13, 23, 42, 0.86) 0%, rgba(9, 17, 33, 0.88) 100%);
            box-shadow: 0 28px 80px rgba(2, 6, 23, 0.48);
            overflow: hidden;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            padding: 26px 30px 20px;
            border-bottom: 1px solid var(--line);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border-radius: 999px;
            border: 1px solid var(--line);
            padding: 7px 12px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #d5e3ff;
            margin-bottom: 12px;
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent);
            box-shadow: 0 0 14px var(--accent);
          }
          h1 {
            margin: 0 0 8px;
            font-size: 40px;
            line-height: 1.08;
          }
          p {
            margin: 0;
            color: var(--text-soft);
            font-size: 20px;
            line-height: 1.45;
          }
          .timestamp {
            margin-top: 8px;
            font-size: 13px;
            color: #8ea3cf;
          }
          .image-wrap {
            padding: 22px 28px 28px;
          }
          img {
            width: 100%;
            border-radius: 16px;
            border: 1px solid var(--line);
            box-shadow: 0 14px 35px rgba(2, 6, 23, 0.35);
            display: block;
            background: #0b1223;
          }
        </style>
      </head>
      <body>
        <article class="frame">
          <header class="header">
            <section>
              <div class="badge"><span class="dot"></span> QA Portfolio Snapshot</div>
              <h1>${title}</h1>
              <p>${subtitle}</p>
              <div class="timestamp">Captured at ${now}</div>
            </section>
          </header>
          <section class="image-wrap">
            <img src="${imageDataUrl}" alt="${title}" />
          </section>
        </article>
      </body>
    </html>
  `);
  await page.screenshot({ path: outputFile, fullPage: false });
};

const captureAllure = async (page) => {
  const reportDir = path.join(ROOT_DIR, 'allure-report');
  const entry = path.join(reportDir, 'index.html');
  if (!fs.existsSync(entry)) {
    throw new Error('allure-report not found. Run: npm run report:allure');
  }

  const server = await startStaticServer(reportDir);
  try {
    await page.setViewportSize(RAW_VIEWPORT);
    await page.goto(`${server.url}/index.html#/`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000
    });
    await page.waitForTimeout(2800);
    return await page.screenshot({ fullPage: false });
  } finally {
    await server.close();
  }
};

const applyGrafanaPasswordRotationIfVisible = async (page, newPassword) => {
  const newPasswordInput = page.locator('input[name="newPassword"]');
  if (!(await newPasswordInput.isVisible().catch(() => false))) return false;

  await newPasswordInput.fill(newPassword);
  const confirmInput = page.locator('input[name="confirmNew"]');
  if (await confirmInput.isVisible().catch(() => false)) {
    await confirmInput.fill(newPassword);
  }

  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);
  return true;
};

const loginGrafanaIfRequired = async (page) => {
  const loginInput = page.locator('input[name="user"]');
  const isOnLoginRoute = () => page.url().includes('/login');

  const user = process.env.GRAFANA_USER || 'admin';
  const initialPassword = process.env.GRAFANA_PASSWORD || 'admin';
  const rotatedPassword = process.env.GRAFANA_ROTATED_PASSWORD || 'Admin@12345';

  const shouldAttemptLogin =
    isOnLoginRoute() ||
    (await loginInput.isVisible().catch(() => false)) ||
    (await page
      .locator('input[name="newPassword"]')
      .isVisible()
      .catch(() => false));

  if (!shouldAttemptLogin) return;

  // Handle "first login requires password change" screen if it appears before user/password form.
  await applyGrafanaPasswordRotationIfVisible(page, rotatedPassword);

  const tryLogin = async (password) => {
    if (!(await loginInput.isVisible().catch(() => false))) return false;
    await loginInput.waitFor({ state: 'visible', timeout: 12_000 });
    await loginInput.fill(user);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2500);
    return true;
  };

  await tryLogin(initialPassword);
  await applyGrafanaPasswordRotationIfVisible(page, rotatedPassword);

  if (isOnLoginRoute() && (await loginInput.isVisible().catch(() => false))) {
    await tryLogin(rotatedPassword);
  }

  if (
    isOnLoginRoute() &&
    (await page
      .locator('input[name="newPassword"]')
      .isVisible()
      .catch(() => false))
  ) {
    throw new Error(
      'Grafana password-rotation screen still active. Set GRAFANA_ROTATED_PASSWORD and re-run.'
    );
  }
};

const captureGrafana = async (page) => {
  await page.setViewportSize(RAW_VIEWPORT);
  await page.goto(GRAFANA_DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await loginGrafanaIfRequired(page);

  if (page.url().includes('/login')) {
    throw new Error('Grafana login failed or credentials invalid.');
  }

  await page.goto(GRAFANA_DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForSelector('text=Request Rate (RPS)', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2200);
  return await page.screenshot({ fullPage: false });
};

const capturePrometheus = async (page) => {
  await page.setViewportSize(RAW_VIEWPORT);
  await page.goto(PROMETHEUS_GRAPH_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(1800);
  return await page.screenshot({ fullPage: false });
};

const runWithFallback = async (browser, target) => {
  const outputPath = path.join(OUT_DIR, target.fileName);
  const page = await browser.newPage();
  try {
    const rawImageBuffer = await target.capture(page);
    await renderShowcase(page, {
      outputFile: outputPath,
      title: target.showcaseTitle,
      subtitle: target.showcaseSubtitle,
      rawImageBuffer,
      accent: target.accent
    });
    console.log(
      `[report:snapshots] Captured ${target.label}: ${path.relative(ROOT_DIR, outputPath)}`
    );
  } catch (error) {
    console.warn(`[report:snapshots] Could not capture ${target.label}: ${error.message}`);
    if (!page.isClosed()) {
      await page.close();
    }
    const placeholderPage = await browser.newPage();
    await writePlaceholder(
      placeholderPage,
      outputPath,
      target.placeholderTitle,
      target.placeholderSubtitle
    );
    await placeholderPage.close();
    console.log(`[report:snapshots] Wrote placeholder: ${path.relative(ROOT_DIR, outputPath)}`);
  } finally {
    if (!page.isClosed()) {
      await page.close();
    }
  }
};

const main = async () => {
  ensureDir(OUT_DIR);
  const browser = await chromium.launch({ headless: true });

  try {
    await runWithFallback(browser, {
      label: 'Allure',
      fileName: 'allure-overview.png',
      capture: captureAllure,
      showcaseTitle: 'Allure Test Report',
      showcaseSubtitle: 'Functional quality summary from the latest Playwright execution.',
      accent: '#f59e0b',
      placeholderTitle: 'Allure Report',
      placeholderSubtitle: 'Run npm run report:allure, then rerun npm run report:snapshots.'
    });

    await runWithFallback(browser, {
      label: 'Grafana (k6 dashboard)',
      fileName: 'grafana-k6-overview.png',
      capture: captureGrafana,
      showcaseTitle: 'Grafana k6 Dashboard',
      showcaseSubtitle: 'Real-time performance telemetry from Prometheus remote-write data.',
      accent: '#22c55e',
      placeholderTitle: 'Grafana k6 Dashboard',
      placeholderSubtitle: 'Start monitor stack and run k6 with remote write before snapshot.'
    });

    await runWithFallback(browser, {
      label: 'Prometheus',
      fileName: 'prometheus-overview.png',
      capture: capturePrometheus,
      showcaseTitle: 'Prometheus Query View',
      showcaseSubtitle: 'Query-level verification for incoming k6 metrics and trends.',
      accent: '#38bdf8',
      placeholderTitle: 'Prometheus Query View',
      placeholderSubtitle: 'Ensure Prometheus is running and receives k6 metrics.'
    });

    console.log(`[report:snapshots] Done. Outputs are in ${path.relative(ROOT_DIR, OUT_DIR)}`);
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  console.error(`[report:snapshots] Fatal error: ${error.message}`);
  process.exitCode = 1;
});
