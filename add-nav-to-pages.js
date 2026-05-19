/*
 * add-nav-to-pages.js
 * One-off helper: injects the shared site-nav <script> tag before
 * </body> into every topics/*.html page. nav.js builds the sticky
 * three-tab navigation and wraps the legacy markup in a reading
 * column. It must load AFTER search.js, so it goes in last.
 *
 * Idempotent — running it again skips pages that already have it.
 *   node add-nav-to-pages.js
 */

const fs = require('fs');
const path = require('path');

function inject(file, prefix) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.indexOf('js/nav.js') !== -1) {
    console.log('skip (already has nav): ' + file);
    return;
  }
  const tag = '    <script src="' + prefix + 'js/nav.js"></script>\n';
  html = html.replace(/([ \t]*)<\/body>/, tag + '$1</body>');
  fs.writeFileSync(file, html, 'utf8');
  console.log('added nav to: ' + file);
}

const topicsDir = path.join(__dirname, 'topics');
fs.readdirSync(topicsDir)
  .filter((f) => f.endsWith('.html'))
  .forEach((f) => inject(path.join(topicsDir, f), '../'));
