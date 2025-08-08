/**
 * Popup script (single-file modular structure for Safari reliability)
 * - Keeps logic in small sections (utils/services/scholar/dom/citations)
 * - No ES module imports to avoid popup loading issues
 */

// -- utils -------------------------------------------------------------------
const Utils = (() => {
  function cleanText(text = '') {
    return String(text).replace(/\u00A0/g, ' ').replace(/\u0082/g, '').replace(/\s+/g, ' ').trim();
  }
  function extractNumber(text = '') {
    const m = String(text).match(/\d+/);
    return m ? Number(m[0]) : null;
  }
  function el(tag, opts = {}) {
    const node = document.createElement(tag);
    if (opts.className) node.className = opts.className;
    if (opts.text !== undefined) node.textContent = opts.text;
    if (opts.html !== undefined) node.innerHTML = opts.html;
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    return node;
  }
  function absolutizeScholarUrl(href = '') {
    if (!href) return '';
    return href.startsWith('http') ? href : `https://scholar.google.com${href}`;
  }
  return { cleanText, extractNumber, el, absolutizeScholarUrl };
})();

// -- services ----------------------------------------------------------------
const Services = (() => {
  // Use Safari's browser API; fallback to chrome if present
  const br = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : undefined);

  async function getActiveTabTitle() {
    if (!br?.tabs?.query) return '';
    const tabs = await br.tabs.query({ active: true, currentWindow: true });
    return tabs?.[0]?.title || '';
  }
  async function fetchScholarHtml(query) {
    const res = await br.runtime.sendMessage({ action: 'fetchScholar', query });
    if (!res?.success) throw new Error(res?.error || 'Search failed');
    return res.html;
  }
  async function fetchCitationsHtml(url) {
    const res = await br.runtime.sendMessage({ action: 'fetchCitations', url });
    if (!res?.success) throw new Error(res?.error || 'Citation fetch failed');
    return res.html;
  }
  return { getActiveTabTitle, fetchScholarHtml, fetchCitationsHtml };
})();

// -- scholar (parse + helpers) ----------------------------------------------
const Scholar = (() => {
  const { cleanText, extractNumber, absolutizeScholarUrl } = Utils;

  function buildCitationUrl(dataId) {
    return `https://scholar.google.com/scholar?q=info:${dataId}:scholar.google.com/&output=cite&scirp=0&hl=en`;
  }

  function parseResults(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articles = Array.from(doc.querySelectorAll('.gs_r'));
    const results = [];

    for (const article of articles) {
      if (article.classList.contains('gs_or_svg')) continue; // skip profiles

      const titleEl = article.querySelector('.gs_rt a');
      const authorsEl = article.querySelector('.gs_a');
      const snippetEl = article.querySelector('.gs_rs');

      const citedByLink = article.querySelector('a[href*="cites="]');
      const relatedLink = article.querySelector('a[href*="q=related:"]');
      const versionsLink = article.querySelector('a[href*="cluster="]');

      const citeDataId = article.getAttribute('data-cid') || article.querySelector('[id^="gs_cit"]')?.getAttribute('data-cid') || undefined;

      results.push({
        title: titleEl ? cleanText(titleEl.textContent) : undefined,
        url: titleEl ? absolutizeScholarUrl(titleEl.getAttribute('href') || '') : undefined,
        authors: authorsEl ? cleanText(authorsEl.textContent) : undefined,
        snippet: snippetEl ? cleanText(snippetEl.textContent) : undefined,
        links: {
          citeDataId,
          citedBy: citedByLink ? { url: absolutizeScholarUrl(citedByLink.getAttribute('href') || ''), count: extractNumber(citedByLink.textContent || '') } : undefined,
          related: relatedLink ? { url: absolutizeScholarUrl(relatedLink.getAttribute('href') || '') } : undefined,
          versions: versionsLink ? { url: absolutizeScholarUrl(versionsLink.getAttribute('href') || ''), count: extractNumber(versionsLink.textContent || '') } : undefined,
        },
      });
    }
    return results;
  }
  return { parseResults, buildCitationUrl };
})();

// -- dom (render results) ----------------------------------------------------
const Dom = (() => {
  const { el } = Utils;

  function renderResults(results, container, handlers = {}) {
    for (const r of results) {
      const item = el('div', { className: 'result-item' });

      if (r.title && r.url) {
        const a = el('a', { className: 'result-title', text: r.title });
        a.setAttribute('href', r.url);
        a.setAttribute('target', '_blank');
        item.appendChild(a);
      }
      if (r.authors) item.appendChild(el('div', { className: 'result-authors', text: r.authors }));
      if (r.snippet) item.appendChild(el('div', { className: 'result-snippet', text: r.snippet }));

      const links = el('div', { className: 'result-links' });
      const segs = [];

      if (r.links?.citeDataId && handlers.onCite) {
        const cite = el('a', { text: 'Cite' });
        cite.setAttribute('href', '#');
        cite.addEventListener('click', (e) => { e.preventDefault(); handlers.onCite(r.links.citeDataId); });
        segs.push(cite);
      }
      if (r.links?.citedBy) {
        const { url, count } = r.links.citedBy;
        const cb = el('a', { text: count ? `Cited by ${count}` : 'Cited by' });
        cb.setAttribute('href', url);
        cb.setAttribute('target', '_blank');
        segs.push(cb);
      }
      if (r.links?.related) {
        const rel = el('a', { text: 'Related articles' });
        rel.setAttribute('href', r.links.related.url);
        rel.setAttribute('target', '_blank');
        segs.push(rel);
      }
      if (r.links?.versions) {
        const { url, count } = r.links.versions;
        const v = el('a', { text: count ? `All ${count} versions` : 'All versions' });
        v.setAttribute('href', url);
        v.setAttribute('target', '_blank');
        segs.push(v);
      }

      segs.forEach((node, i) => {
        links.appendChild(node);
        if (i < segs.length - 1) links.appendChild(el('span', { className: 'separator', html: ' &middot; ' }));
      });

      if (segs.length) item.appendChild(links);
      container.appendChild(item);
    }
  }
  return { renderResults };
})();

// -- citations (modal) -------------------------------------------------------
const Citations = (() => {
  function showCitationDialog(citationHtml) {
    document.querySelector('.citation-overlay')?.remove();
    const parser = new DOMParser();
    const doc = parser.parseFromString(citationHtml, 'text/html');

    const overlay = document.createElement('div');
    overlay.className = 'citation-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'citation-dialog';

    const title = document.createElement('div');
    title.className = 'citation-title';
    title.textContent = 'Citation Formats';
    dialog.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => overlay.remove());
    dialog.appendChild(closeButton);

    const table = document.createElement('table');
    table.className = 'citation-table';

    const citationTable = doc.querySelector('#gs_citt');
    if (citationTable) {
      const rows = citationTable.querySelectorAll('tr');
      rows.forEach((row) => {
        const tr = document.createElement('tr');
        const style = document.createElement('td');
        style.className = 'citation-style';
        style.textContent = row.querySelector('th')?.textContent || '';
        const text = document.createElement('td');
        const citationText = row.querySelector('td')?.textContent || '';
        text.className = 'citation-text clickable';
        text.textContent = citationText;
        text.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(citationText);
            const original = text.textContent;
            text.textContent = 'Copied!';
            setTimeout(() => (text.textContent = original), 1000);
          } catch {}
        });
        tr.appendChild(style);
        tr.appendChild(text);
        table.appendChild(tr);
      });
      table.appendChild(document.createElement('tr'));
    } else {
      table.innerHTML = '<tr><td colspan="2">No citations available</td></tr>';
    }

    const exportsSection = doc.querySelector('#gs_citi');
    if (exportsSection) {
      const exportLinks = exportsSection.querySelectorAll('a');
      const exportRow = document.createElement('tr');
      const exportCell = document.createElement('td');
      exportCell.colSpan = 2;
      exportLinks.forEach((link, i) => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.textContent;
        a.className = 'clickable';
        a.target = '_blank';
        exportCell.appendChild(a);
        if (i < exportLinks.length - 1) exportCell.appendChild(document.createTextNode('\t'));
      });
      exportRow.appendChild(exportCell);
      table.appendChild(exportRow);
    }

    dialog.appendChild(table);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }
  return { showCitationDialog };
})();

// -- bootstrap ---------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const resultsDiv = document.getElementById('results');

  async function performSearch(query) {
    if (!query) return;
    resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
    try {
      const html = await Services.fetchScholarHtml(query);
      const results = Scholar.parseResults(html);
      if (!results.length) {
        resultsDiv.innerHTML = '<div class="result-item">No results found</div>';
        return;
      }
      resultsDiv.innerHTML = '';
      Dom.renderResults(results, resultsDiv, {
        onCite: async (dataId) => {
          try {
            const url = Scholar.buildCitationUrl(dataId);
            const citationHtml = await Services.fetchCitationsHtml(url);
            Citations.showCitationDialog(citationHtml);
          } catch (e) {
            console.error('Failed to load citations', e);
          }
        },
      });
    } catch (error) {
      resultsDiv.innerHTML = `
        <div class="result-item">
          Unable to fetch results directly.
          <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(query)}" target="_blank">
            Click here to search on Google Scholar
          </a>
        </div>`;
    }
  }

  // Auto-seed with active tab title, as before
  try {
    const title = await Services.getActiveTabTitle();
    if (title) {
      searchInput.value = title;
      performSearch(title);
    }
  } catch {}

  // Event listeners (Search button and Enter key)
  searchButton.addEventListener('click', () => performSearch(searchInput.value));
  searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(searchInput.value); });
});

