// Builds the print files in /assets/print from the designs in scripts/print/venue.mjs and booth.mjs.
// Each version of each asset becomes: a print PDF (all pages, vector), a JPG per page (to share),
// a medium JPG (the 3D model uses it), and a small JPG (the list uses it).
//
//   npm run print                 both pages
//   npm run print -- booth        one page
//   npm run print -- booth header one asset
//
// Needs: npm install, then once: npx playwright-core install chromium
import { chromium } from 'playwright-core';
import { mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BASE_CSS, FONTS, LOOKS } from './kit.mjs';

const PX_PER_MM = 96 / 25.4;
const OUT = fileURLToPath(new URL('../../assets/print/', import.meta.url));
const WEB = '/assets/print/';

const [onlyPage, onlyAsset] = process.argv.slice(2);
const PAGES = onlyPage ? [onlyPage] : ['venue', 'booth'];

// long edge in px for each JPG size
const sizes = (asset) => {
  const long = Math.max(...asset.mm);
  const full = Math.min(2400, Math.round((long / 25.4) * 300));
  return { full, m: Math.min(1200, full), t: 480 };
};

async function docFor(asset, version) {
  const [w, h] = asset.mm;
  const pages = await Promise.all(asset.pages.map((_, i) => version.html(i)));
  const body = pages.map((p) => `<section class="pg" style="width:${w}mm;height:${h}mm">${p}</section>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>@page{size:${w}mm ${h}mm;margin:0}${BASE_CSS}${asset.css || ''}</style></head><body>${body}</body></html>`;
}

async function buildVersion(browser, pageId, asset, version) {
  const dir = `${OUT}${pageId}/${asset.id}/`;
  const web = `${WEB}${pageId}/${asset.id}/`;
  await mkdir(dir, { recursive: true });
  const tab = await browser.newPage();
  await tab.setContent(await docFor(asset, version), { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);

  const [w, h] = asset.mm;
  await tab.pdf({ path: `${dir}${version.id}.pdf`, width: `${w}mm`, height: `${h}mm`, printBackground: true, preferCSSPageSize: true });

  const S = sizes(asset);
  const out = { jpg: [], m: [], t: [] };
  for (const [key, px, q] of [['jpg', S.full, 88], ['m', S.m, 84], ['t', S.t, 80]]) {
    const zoom = px / (Math.max(w, h) * PX_PER_MM);
    await tab.setViewportSize({ width: Math.ceil(w * PX_PER_MM * zoom) + 2, height: Math.ceil(h * PX_PER_MM * zoom) + 2 });
    await tab.evaluate((z) => { document.documentElement.style.zoom = z; }, zoom);
    const els = await tab.$$('.pg');
    for (let i = 0; i < els.length; i++) {
      const name = `${version.id}-${i + 1}${key === 'jpg' ? '' : `.${key}`}.jpg`;
      await els[i].screenshot({ path: `${dir}${name}`, type: 'jpeg', quality: q });
      out[key].push(web + name);
    }
  }
  await tab.close();

  const kb = async (f) => Math.round((await stat(f)).size / 1024);
  return {
    id: version.id,
    look: version.look || version.id,
    note: version.note,
    pdf: `${web}${version.id}.pdf`,
    pdfKb: await kb(`${dir}${version.id}.pdf`),
    ...out,
  };
}

async function buildPage(browser, pageId) {
  const def = (await import(`./${pageId}.mjs`)).default;
  const manifestPath = `${OUT}${pageId}/manifest.json`;
  let prev = null;
  if (onlyAsset) prev = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => 'null'));
  else await rm(`${OUT}${pageId}`, { recursive: true, force: true });

  const assets = [];
  for (const asset of def.assets) {
    if (onlyAsset && asset.id !== onlyAsset) {
      const old = prev?.assets.find((a) => a.id === asset.id);
      if (old) assets.push(old);
      continue;
    }
    await rm(`${OUT}${pageId}/${asset.id}`, { recursive: true, force: true });
    const versions = [];
    for (const v of asset.versions) versions.push(await buildVersion(browser, pageId, asset, v));
    const { versions: _, css: __, ...meta } = asset;
    assets.push({ ...meta, versions });
    console.log(`  ${pageId}/${asset.id}: ${versions.length} versions, ${asset.pages.length} page(s)`);
  }
  await mkdir(`${OUT}${pageId}`, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify({ page: pageId, looks: def.looks || LOOKS, assets }, null, 1)}\n`);
}

const browser = await chromium.launch();
try {
  for (const p of PAGES) await buildPage(browser, p);
} finally {
  await browser.close();
}
