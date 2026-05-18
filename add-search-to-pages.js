/*
 * add-search-to-pages.js
 * One-off helper: injects the search <script> tags before </body>
 * into quiz.html and every topics/*.html page.
 *
 * Idempotent — running it again skips pages that already have search.
 * search.js auto-creates the search box after the breadcrumb nav,
 * so no markup change is needed beyond the script tags.
 */

const fs = require('fs');
const path = require('path');

function inject(file, prefix) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.indexOf('js/search.js') !== -1) {
    console.log('skip (already has search): ' + file);
    return;
  }
  const tags =
    '    <script src="' +
    prefix +
    'js/search-index.js"></script>\n' +
    '    <script src="' +
    prefix +
    'js/search.js"></script>\n';
  html = html.replace(/([ \t]*)<\/body>/, tags + '$1</body>');
  fs.writeFileSync(file, html, 'utf8');
  console.log('added search to: ' + file);
}

// Root-level page.
inject(path.join(__dirname, 'quiz.html'), '');

// Topic pages live one level down.
const topicsDir = path.join(__dirname, 'topics');
fs.readdirSync(topicsDir)
  .filter((f) => f.endsWith('.html'))
  .forEach((f) => inject(path.join(topicsDir, f), '../'));
