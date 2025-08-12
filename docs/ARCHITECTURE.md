GoogleScholarExtension Popup Architecture

Purpose
- Developer-facing overview of the popup’s code organization and data flow to speed up onboarding and reviews.

Version
- Current popup design: single-file modular (IIFE sections) in `popup.js`.

Last Updated
- 2025-08-12

Overview
- The popup uses a single-file, modular structure (IIFE sections) for maximum reliability in Safari popups.
- Logic is grouped by responsibility inside `popup.js` (utils, services, scholar, dom, citations) with clear boundaries and comments.

Key Components
- popup.html: Minimal shell that loads `popup.js` with a normal `<script>` tag.
- popup.js: Contains logical modules:
  - Utils: text cleanup, number parsing, DOM helpers, URL normalization
  - Services: active tab title + background messaging for Scholar and citations
  - Scholar: HTML parsing into a structured model + citation URL builder
  - Dom: rendering the model to DOM with interactive handlers
  - Citations: modal creation with copy-to-clipboard and export links
- background.js: Performs cross-origin fetches to Scholar and citation pages.
- manifest.json: Declares permissions and popup entry.

Runtime Flow
1) On load, Services.getActiveTabTitle seeds the search input and triggers a search.
2) Services.fetchScholarHtml retrieves HTML; Scholar.parseResults converts it to a model.
3) Dom.renderResults renders the list and wires link handlers.
4) Cite → Scholar.buildCitationUrl → Services.fetchCitationsHtml → Citations.showCitationDialog.

Notes
- Single-file popup avoids module-loading edge cases in Safari popups while keeping code organized.
- Background fetches centralize CORS-sensitive requests and user agent handling.
- UI failures degrade gracefully to a direct Scholar link.
- Safari-only API: Services uses the WebExtension `browser` API exclusively (no `chrome` fallback).

Title Extraction (Active Tab → Initial Query)
- Goal: seed the popup's search with the most accurate paper title from the active page.
- Strategy: execute a small DOM query in the active tab and collect candidates in a fixed priority, with normalization.
- Priority order for candidates:
  1. `meta[name="citation_title"]` (Highwire/Google Scholar tags)
  2. One of: `meta[name="dc.Title"]`, `meta[name="DC.title"]`, `meta[property="og:title"]`, `meta[name="twitter:title"]`, `meta[name="parsely-title"]`
  3. Fallback: the browser tab’s title
- Normalization: trim whitespace and strip common suffixes like `" | <site/venue>"` when present.
- Injection: `Services.getActiveTabTitle` tries `browser.scripting.executeScript` first (MV3), and falls back to `tabs.executeScript` if needed. Failures silently degrade to the tab title.

Permissions
- `activeTab`: allows temporary access to the active page to read metadata when the user invokes the popup.
- `scripting`: enables MV3 script injection via `browser.scripting.executeScript`.
- `host_permissions`: `https://scholar.google.com/*` for background fetches of search and citations.
