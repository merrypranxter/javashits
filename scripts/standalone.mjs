import fs from 'node:fs/promises';
import path from 'node:path';

// Package the production build without a server or external runtime assets.
// Keep the procedural engines unchanged; only replace bundled asset references.
const root = process.cwd();
const dist = path.join(root, 'dist');
let html = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const scriptTag = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const styleTag = html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
if (!scriptTag || !styleTag) throw new Error('Build the Vite application before packaging it.');
const resolveAsset = (url) => path.join(dist, url.replace(/^\.\//, ''));
let js = await fs.readFile(resolveAsset(scriptTag[1]), 'utf8');
let css = await fs.readFile(resolveAsset(styleTag[1]), 'utf8');
const cssDirectory = path.dirname(resolveAsset(styleTag[1]));
for (const match of [...css.matchAll(/url\(([^)]+)\)/g)]) {
  const url = match[1].replace(/^['"]|['"]$/g, '');
  if (url.startsWith('data:')) continue;
  const bytes = await fs.readFile(path.resolve(cssDirectory, url));
  const mime = url.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
  css = css.replace(match[0], `url(data:${mime};base64,${bytes.toString('base64')})`);
}
const previews = {};
for (const filename of await fs.readdir(path.join(dist, 'previews'))) {
  const bytes = await fs.readFile(path.join(dist, 'previews', filename));
  previews[path.basename(filename, '.webp')] = `data:image/webp;base64,${bytes.toString('base64')}`;
}
const previewExpression = /src:`\.\/previews\/\$\{([^}]+)\}\.webp`/;
if (!previewExpression.test(js)) throw new Error('The preview reference changed; update the standalone asset rewrite.');
js = js.replace(previewExpression, 'src:window.__JAVASHITS_PREVIEWS[$1]');
js = js.replace('href:"./","aria-label":"Javashits home"', 'href:location.pathname,"aria-label":"Javashits home"');
const favicon = await fs.readFile(path.join(dist, 'favicon.svg'));
html = html.replace('./favicon.svg', `data:image/svg+xml;base64,${favicon.toString('base64')}`);
html = html.replace(scriptTag[0], '');
html = html.replace(styleTag[0], `<style>${css}</style>`);
const inline = `window.__JAVASHITS_PREVIEWS=${JSON.stringify(previews)};\n${js}`;
html = html.replace('</body>', () => `<script type="module">${inline.replaceAll('</script', '<\\/script')}</script></body>`);
const output = path.join(dist, 'JAVASHITS.html');
await fs.writeFile(output, html);
console.log(`Standalone laboratory: ${output} (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`);
