// Frame times while an interaction runs (theme switch, menu open, tab change).
// Usage: node frames.mjs <url> "<css selector to click>" [runs=3]
// Reports frames slower than 33 ms. Headless Chrome has no GPU: compare before/after, not absolute numbers.
// playwright is resolved from the current directory (the project), so the skill needs no install of its own.
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');
const [url, sel, runs = 3] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome-stable' });
for (let i = 0; i < +runs; i++) {
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(2000);
  await p.evaluate(() => {
    window.__f = [];
    let last = performance.now();
    const t0 = last;
    const tick = (t) => { window.__f.push(t - last); last = t; if (t - t0 < 1200) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await p.click(sel);
  await p.waitForTimeout(1500);
  const f = (await p.evaluate(() => window.__f)).sort((a, c) => c - a);
  console.log(JSON.stringify({ frames: f.length, worst: f.slice(0, 4).map(Math.round), over33: f.filter((x) => x > 33).length }));
  await p.close();
}
await b.close();
