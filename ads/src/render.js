// Renders every concept at every Meta placement size to PNG, then builds all-ads.png.
// Usage: node ads/src/render.js            (from repo root)
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }

const SRC = __dirname;
const OUT = path.resolve(SRC, '..');
const SIZES = [
  { key: 'sq', name: '1080x1080', w: 1080, h: 1080 },
  { key: 'pt', name: '1080x1350', w: 1080, h: 1350 },
  { key: 'st', name: '1080x1920', w: 1080, h: 1920 },
];
const CONCEPTS = [
  { n: 1, title: 'Declutter for cash' },
  { n: 2, title: 'Sold fast' },
  { n: 3, title: 'Estate & downsizing' },
];
const only = process.argv[2] ? Number(process.argv[2]) : null;

(async () => {
  const browser = await chromium.launch();
  for (const c of CONCEPTS) {
    if (only && c.n !== only) continue;
    const dir = path.join(OUT, `concept-${c.n}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const s of SIZES) {
      const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
      await page.goto(`file://${path.join(SRC, `concept-${c.n}.html`)}?size=${s.key}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const out = path.join(dir, `room-swap-concept-${c.n}-${s.name}.png`);
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: s.w, height: s.h } });
      console.log('wrote', path.relative(process.cwd(), out));
      await page.close();
    }
  }

  if (only) { await browser.close(); return; }
  // Contact sheet: one row per concept, three sizes side by side, scaled to a common height
  const H = 640;
  const rows = CONCEPTS.map(c => `
    <div class="row">
      <div class="label"><b>Concept ${c.n}</b><span>${c.title}</span></div>
      ${SIZES.map(s => `<figure><img src="concept-${c.n}/room-swap-concept-${c.n}-${s.name}.png" style="height:${H}px;width:${Math.round(H * s.w / s.h)}px"><figcaption>${s.name}${s.key === 'st' ? ' · Stories/Reels' : s.key === 'sq' ? ' · Feed square' : ' · Feed portrait'}</figcaption></figure>`).join('')}
    </div>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Crimson+Text:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body{margin:0;padding:48px;background:#F5F3ED;font-family:'Crimson Text',Georgia,serif;color:#3E3226;display:inline-block}
      h1{font-family:'Playfair Display',Georgia,serif;font-size:44px;margin:0 0 6px}
      p.lead{font-size:24px;margin:0 0 32px;color:#6B675F}
      .row{display:flex;align-items:flex-start;gap:28px;margin-bottom:40px}
      .label{width:220px;padding-top:12px;font-size:26px;display:flex;flex-direction:column}
      .label b{font-family:'Playfair Display',Georgia,serif;font-size:34px;color:#3D6F3C}
      figure{margin:0}
      figure img{display:block;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.18)}
      figcaption{font-size:22px;margin-top:10px;text-align:center}
    </style></head><body>
    <h1>Room Swap Consignments · Consignor ads</h1>
    <p class="lead">3 concepts × 3 Meta sizes. Files are in ads/concept-1, concept-2, concept-3.</p>
    ${rows}</body></html>`;
  const sheetPath = path.join(OUT, '_contact-sheet.html');
  fs.writeFileSync(sheetPath, html);
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(`file://${sheetPath}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const box = await page.evaluate(() => { const r = document.body.getBoundingClientRect(); return { w: Math.ceil(r.width), h: Math.ceil(r.height) }; });
  await page.setViewportSize({ width: box.w, height: box.h });
  await page.screenshot({ path: path.join(OUT, 'all-ads.png'), fullPage: true });
  fs.unlinkSync(sheetPath);
  console.log('wrote ads/all-ads.png');
  await browser.close();
})();
