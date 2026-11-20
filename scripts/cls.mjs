// Layout shifts on page load, with the elements that moved.
// Usage: node cls.mjs <url> [url...] [--mobile] [--light]
// Needs playwright (npm i -D playwright) and Chrome; CHROME env overrides the binary.
// playwright is resolved from the current directory (the project), so the skill needs no install of its own.
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.cwd() + '/')('playwright');
const args = process.argv.slice(2);
const urls = args.filter((a) => !a.startsWith('--'));
const mobile = args.includes('--mobile');
const viewport = mobile ? { width: 390, height: 844 } : { width: 1600, height: 900 };
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome-stable' });
for (const url of urls) {
  const ctx = await b.newContext({ viewport, colorScheme: args.includes('--light') ? 'light' : 'dark' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        window.__shifts.push({
          v: +e.value.toFixed(4),
          t: Math.round(e.startTime),
          src: (e.sources || []).map((s) => {
            const n = s.node;
            if (!n || !n.tagName) return '?';
            const name = n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + '.' + String(n.className || '').split(' ').slice(0, 4).join('.');
            return `${name} y${Math.round(s.previousRect.y)}->${Math.round(s.currentRect.y)} w${Math.round(s.previousRect.width)}->${Math.round(s.currentRect.width)} h${Math.round(s.previousRect.height)}->${Math.round(s.currentRect.height)}`;
          }),
        });
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(3000);
  const s = await p.evaluate(() => window.__shifts);
  console.log(url, 'CLS', s.reduce((a, x) => a + x.v, 0).toFixed(4));
  for (const x of s) console.log('  ', x.v, x.t + 'ms', x.src.join(' | ').slice(0, 400));
  await ctx.close();
}
await b.close();
