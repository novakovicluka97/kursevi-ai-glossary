/*
 * search.js — client-side search for the AI Glossary.
 *
 * Drop-in: include AFTER search-index.js on any page:
 *   <script src="js/search-index.js"></script>      (or ../js/... on topic pages)
 *   <script src="js/search.js"></script>
 *
 * It builds a search box inside an element with id="glossary-search"
 * if one exists, otherwise it creates one at the top of <body>.
 * Topic URLs are resolved relative to the site root, so the same
 * script works from index.html and from any topics/*.html page.
 */
(function () {
  'use strict';

  var INDEX = window.SEARCH_INDEX || [];

  // --- Resolve the site root from this script's own URL ----------------
  // search.js lives in <root>/js/, so the root is two segments up.
  var thisScript = document.currentScript;
  var ROOT = './';
  if (thisScript && thisScript.src) {
    ROOT = thisScript.src.replace(/js\/search\.js(\?.*)?$/, '');
  }

  // --- Small helpers ---------------------------------------------------
  function escapeHTML(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Wrap each query term in <mark> within an already-escaped string.
  function highlight(escapedText, terms) {
    var out = escapedText;
    terms.forEach(function (term) {
      if (!term) return;
      var re = new RegExp('(' + escapeRegExp(escapeHTML(term)) + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  // Build a ~140-char snippet centred on the first matched term.
  function makeSnippet(text, terms) {
    var lower = text.toLowerCase();
    var pos = -1;
    for (var i = 0; i < terms.length; i++) {
      var at = lower.indexOf(terms[i]);
      if (at !== -1 && (pos === -1 || at < pos)) pos = at;
    }
    if (pos === -1) return text.slice(0, 140) + (text.length > 140 ? '…' : '');
    var start = Math.max(0, pos - 50);
    var end = Math.min(text.length, pos + 90);
    return (
      (start > 0 ? '…' : '') +
      text.slice(start, end).trim() +
      (end < text.length ? '…' : '')
    );
  }

  // True when `term` appears as a whole word (bounded by non-letters),
  // so "seo" hits "SEO" but not "Seoul". Used as a ranking bonus only —
  // substring matches still count, so partial typing keeps working.
  function wholeWordHit(haystack, term) {
    return new RegExp(
      '(^|[^a-z])' + escapeRegExp(term) + '([^a-z]|$)'
    ).test(haystack);
  }

  // --- Scoring ---------------------------------------------------------
  // A topic matches only if EVERY query term is found somewhere.
  // Matches in the title count far more than matches in body text.
  function score(topic, terms) {
    var title = topic.title.toLowerCase();
    var def = topic.definition.toLowerCase();
    var headings = (topic.headings || []).join(' ').toLowerCase();
    var text = topic.text.toLowerCase();
    var total = 0;

    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      var termScore = 0;
      if (title.indexOf(term) !== -1) {
        termScore += 10;
        if (title.indexOf(term) === 0) termScore += 5; // title starts with term
      }
      if (def.indexOf(term) !== -1) termScore += 4;
      if (headings.indexOf(term) !== -1) termScore += 3;
      if (text.indexOf(term) !== -1) termScore += 1;

      if (termScore === 0) return 0; // a required term is missing — reject

      // Lift real word matches above substring-inside-a-word noise.
      if (wholeWordHit(title + ' ' + def + ' ' + headings + ' ' + text, term)) {
        termScore += 6;
      }
      total += termScore;
    }
    // Bonus when the whole query matches the title as one phrase.
    if (title.indexOf(terms.join(' ')) !== -1) total += 8;
    return total;
  }

  function search(query) {
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var results = [];
    for (var i = 0; i < INDEX.length; i++) {
      var s = score(INDEX[i], terms);
      if (s > 0) results.push({ topic: INDEX[i], score: s, terms: terms });
    }
    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.topic.title.localeCompare(b.topic.title);
    });
    return results.slice(0, 12);
  }

  // --- Build the DOM ---------------------------------------------------
  var container = document.getElementById('glossary-search');
  if (!container) {
    container = document.createElement('div');
    container.id = 'glossary-search';
    var anchor = document.querySelector('header, nav.breadcrumb');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(container, anchor.nextSibling);
    } else {
      document.body.insertBefore(container, document.body.firstChild);
    }
  }
  container.classList.add('search-box');

  var input = document.createElement('input');
  input.type = 'search';
  input.id = 'search-input';
  input.placeholder = 'Search ' + INDEX.length + ' topics…';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Search the glossary');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'search-results');

  var results = document.createElement('div');
  results.id = 'search-results';
  results.className = 'search-results';
  results.setAttribute('role', 'listbox');
  results.hidden = true;

  container.appendChild(input);
  container.appendChild(results);

  // --- Render + interaction -------------------------------------------
  var current = []; // current result set
  var active = -1; // index of keyboard-highlighted result

  function render(query) {
    current = search(query);
    active = -1;

    if (!query.trim()) {
      results.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      return;
    }

    if (!current.length) {
      results.innerHTML =
        '<div class="search-empty">No topics match “' +
        escapeHTML(query) +
        '”</div>';
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    var terms = current[0].terms;
    results.innerHTML = current
      .map(function (r, i) {
        var t = r.topic;
        var titleHTML = highlight(escapeHTML(t.title), terms);

        // Show the snippet from wherever the query actually matched:
        // the definition if possible, else the body text, else just
        // the definition as a plain description (title-only matches).
        var def = t.definition || '';
        var hasTerm = function (str) {
          var low = str.toLowerCase();
          return terms.some(function (tm) {
            return low.indexOf(tm) !== -1;
          });
        };
        var snippet;
        if (hasTerm(def)) {
          snippet = makeSnippet(def, terms);
        } else if (t.text && hasTerm(t.text)) {
          snippet = makeSnippet(t.text, terms);
        } else {
          snippet = def.length > 160 ? def.slice(0, 160) + '…' : def;
        }
        var snippetHTML = highlight(escapeHTML(snippet), terms);
        return (
          '<a class="search-result" role="option" id="sr-' +
          i +
          '" href="' +
          ROOT +
          t.url +
          '">' +
          '<span class="sr-title">' +
          titleHTML +
          '</span>' +
          '<span class="sr-snippet">' +
          snippetHTML +
          '</span>' +
          '</a>'
        );
      })
      .join('');
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function setActive(next) {
    var items = results.querySelectorAll('.search-result');
    if (!items.length) return;
    if (active >= 0 && items[active]) items[active].classList.remove('active');
    active = (next + items.length) % items.length;
    items[active].classList.add('active');
    items[active].scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', 'sr-' + active);
  }

  input.addEventListener('input', function () {
    render(input.value);
  });

  input.addEventListener('keydown', function (e) {
    var items = results.querySelectorAll('.search-result');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length) setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) setActive(active - 1);
    } else if (e.key === 'Enter') {
      if (active >= 0 && items[active]) {
        window.location.href = items[active].getAttribute('href');
      } else if (items.length === 1) {
        window.location.href = items[0].getAttribute('href');
      }
    } else if (e.key === 'Escape') {
      input.value = '';
      render('');
      input.blur();
    }
  });

  // Re-open the result list when re-focusing a non-empty box.
  input.addEventListener('focus', function () {
    if (input.value.trim()) render(input.value);
  });

  // Close when clicking outside the search box.
  document.addEventListener('click', function (e) {
    if (!container.contains(e.target)) {
      results.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }
  });

  // Press "/" anywhere to jump to the search box.
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });
})();
