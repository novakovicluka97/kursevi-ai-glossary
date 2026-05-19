/*
 * nav.js — shared site navigation for the AI Glossary.
 *
 * The three hub pages (index / guides / resources) carry the nav
 * inline. The 61 topic pages and the quiz keep their original
 * markup, so this script injects the sticky top nav for them and
 * wraps the legacy content in a <main class="page-shell"> reading
 * column. Include once, just before </body>:
 *   <script src="../js/nav.js"></script>
 */
(function () {
  'use strict';

  // Already has a nav (a hub page) — nothing to do.
  if (document.querySelector('.site-nav')) return;

  // --- Resolve the site root from this script's own URL --------------
  // nav.js lives in <root>/js/, so the root is one segment up.
  var thisScript = document.currentScript;
  var ROOT = './';
  if (thisScript && thisScript.src) {
    ROOT = thisScript.src.replace(/js\/nav\.js(\?.*)?$/, '');
  }

  // --- Which tab is current ------------------------------------------
  var path = location.pathname;
  var current = 'glossary';
  if (/\/guides\//.test(path) || /guides\.html$/.test(path)) {
    current = 'guides';
  } else if (/resources\.html$/.test(path)) {
    current = 'resources';
  }

  var tabs = [
    { key: 'glossary', label: 'Glossary', href: ROOT + 'index.html' },
    { key: 'guides', label: 'Guides', href: ROOT + 'guides.html' },
    { key: 'resources', label: 'Resources', href: ROOT + 'resources.html' }
  ];

  // --- Build the nav --------------------------------------------------
  var nav = document.createElement('header');
  nav.className = 'site-nav';

  var links = tabs
    .map(function (t) {
      return (
        '<a href="' +
        t.href +
        '" class="nav-link' +
        (t.key === current ? ' current' : '') +
        '">' +
        t.label +
        '</a>'
      );
    })
    .join('');

  nav.innerHTML =
    '<div class="nav-inner">' +
    '<a href="' +
    ROOT +
    'index.html" class="brand">AI <em>Glossary</em></a>' +
    '<nav class="nav-links">' +
    links +
    '</nav>' +
    '</div>';

  // --- Wrap the legacy body content in a reading column --------------
  var shell = document.createElement('main');
  shell.className = 'page-shell';
  while (document.body.firstChild) {
    shell.appendChild(document.body.firstChild);
  }
  document.body.appendChild(nav);
  document.body.appendChild(shell);
})();
