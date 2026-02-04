# GoogleScholarExtension – Implementation Audit TODOs

Date: 2026-02-04

Scope: current macOS host app (Swift), Safari Web Extension wrapper (Swift), and WebExtension assets (manifest/background/popup).

This document is intentionally action-oriented: each TODO includes **problem**, **motivation**, **suggested solution**, **suggested tests**, and **affected areas**.

## Quick Summary (highest leverage)

- Remove **unused permissions/entitlements** (notably `nativeMessaging` and file-access entitlements).
- Harden **citation export links** (potential fragility if Scholar ever returns relative URLs without a `<base>` tag).
- Tighten **security** on all `target="_blank"` links (`rel="noopener noreferrer"`), add an explicit extension-page **CSP**, and minimise any `innerHTML` usage.
- Improve **UX/accessibility** (labels, keyboard, focus, dark mode).
- Add **robustness** for Scholar blocking/captcha and HTML structure drift.

## TODOs

### [P0] Remove unused `nativeMessaging` permission (and native messaging scaffolding if unused)

- **Problem**
  - `GoogleScholarExtension Extension/Resources/manifest.json` requests `nativeMessaging`, and `SafariWebExtensionHandler.swift` is currently an “echo” template. There is no evidence the WebExtension actually calls `browser.runtime.sendNativeMessage`.
- **Motivation**
  - Unnecessary permissions increase user distrust, increase review friction, and expand the attack surface (native messaging bridges are a high-trust boundary).
- **Suggested solution**
  - If native messaging is not a roadmap item: remove `nativeMessaging` from `manifest.json`. Keep the Swift handler minimal (or keep it but ensure it is not reachable/advertised).
  - If native messaging is intended: document the data contract, validate message schemas, and restrict capabilities explicitly (allow-list commands, size limits, logging redaction).
- **Suggested tests**
  - Install/run in Safari and verify the permission prompt no longer mentions native messaging.
  - Smoke test popup search + citations (ensures no implicit dependency on native messaging).
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/manifest.json`
  - `GoogleScholarExtension Extension/SafariWebExtensionHandler.swift`

### [P2] Harden citation export links (relative URL parsing edge case)

- **Problem**
  - In `popup.js`, export links are created via `a.href = link.href` (not the raw attribute). If the parsed citation HTML contains *relative* export URLs and does *not* provide a `<base href="…">`, then `link.href` will resolve against `about:blank` and produce broken URLs (e.g., `about:blank/scholar.bib?...`).
  - If your testing shows export works today, that likely means Scholar currently serves absolute export URLs, or includes a `<base>` tag that makes `link.href` resolve correctly. This TODO is about making it resilient to markup changes.
- **Motivation**
  - “Export” is a core user flow (BibTeX/EndNote/RefMan/RefWorks). Broken links silently degrade trust.
- **Suggested solution**
  - Use `link.getAttribute('href')` (not the `href` property) and run it through `Utils.absolutizeScholarUrl()` before assigning to the clickable link.
  - Optionally: validate scheme/host (`https://scholar.google.com/*`) for export links before rendering.
- **Suggested tests**
  - Manual: open popup → “Cite” → click each export link and confirm it opens a valid Scholar URL (not `about:blank/...`).
  - Regression fixture (optional): store a saved cite-page HTML sample and run a small JS harness that asserts exported links start with `https://scholar.google.com/`.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.js` (`Citations.showCitationDialog`)

### [P0] Add `rel="noopener noreferrer"` to all `target="_blank"` links

- **Problem**
  - The popup renders multiple external links (`result-title`, “Cited by”, “Related articles”, “All versions”, and export links) with `target="_blank"` but without `rel="noopener noreferrer"`.
- **Motivation**
  - Prevents tabnabbing and reduces the chance external pages can access the opener context.
- **Suggested solution**
  - Centralise link creation in `Utils.el()` (or a dedicated helper) so all `target="_blank"` links automatically include `rel`.
- **Suggested tests**
  - Manual: click a result link and confirm the new tab cannot access `window.opener` (can be checked by opening a benign test page).
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.js` (`Dom.renderResults`, `Citations.showCitationDialog`)

### [P0] Minimise/contain `innerHTML` in popup rendering

- **Problem**
  - `popup.js` uses `innerHTML` in a few places (`Utils.el` supports `opts.html`, results loading/error states are injected via `innerHTML`, “No citations” uses `table.innerHTML`).
- **Motivation**
  - Even if current usage is mostly constant strings, keeping a “path to HTML injection” around increases future XSS risk and makes code review harder.
- **Suggested solution**
  - Prefer `textContent` and DOM construction. If `innerHTML` must remain, constrain it to constant strings and document “never pass network-derived HTML here”.
  - Replace the separator `&middot;` with a literal `·` via `textContent`.
- **Suggested tests**
  - Manual: verify all messages still render and no HTML escapes are visible.
  - Optional: add lint rule / code review checklist item to prohibit `innerHTML` except in explicitly allow-listed functions.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.js` (`Utils.el`, search status rendering, citations fallback row)

### [P1] Add explicit Content Security Policy for extension pages (optional)

- **Problem**
  - The Quick Summary recommends an explicit extension-page CSP; there is no CSP defined in the extension’s HTML or manifest, so the browser applies default policies.
- **Motivation**
  - A strict CSP (e.g. script-src 'self'; object-src 'none') reduces XSS impact and makes expectations explicit for reviewers.
- **Suggested solution**
  - Add a CSP meta tag in `popup.html` (or use manifest `content_security_policy` if supported for extension pages) to restrict script and object sources. Ensure inline scripts, if any, are either removed or allowed via nonce/hash.
- **Suggested tests**
  - Load popup and run search + citations; confirm no console CSP violations.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.html` (and optionally `manifest.json` if CSP is set there)

### [P1] Restrict/validate background fetch targets

- **Problem**
  - `background.js` fetches `request.url` directly for citations. If the popup ever became XSS-compromised, it could attempt to make arbitrary requests (bounded by extension host permissions, but still worth constraining).
- **Motivation**
  - Reduces blast radius and makes the system safer-by-default.
- **Suggested solution**
  - Validate `request.url` using `new URL()` and allow-list `https://scholar.google.com/*` for `fetchCitations`.
  - Return a consistent error for unknown `request.action` values.
- **Suggested tests**
  - Manual: citations still work.
  - Negative: simulate a message with a disallowed URL and confirm the background returns `{success:false}` with a stable error message.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/background.js`

### [P1] Remove unused entitlements (least privilege)

- **Problem**
  - Both the host app and the extension wrapper request `com.apple.security.files.user-selected.read-only`; the host app also requests `com.apple.security.network.client`. The current app UI only loads local HTML and opens Safari preferences; the extension’s network access is via WebExtension APIs.
- **Motivation**
  - Least privilege reduces risk and improves user trust/reviewability.
- **Suggested solution**
  - Audit what is strictly required and remove unused entitlements:
    - Host app: consider dropping `com.apple.security.network.client` and file-selection entitlement if not needed.
    - Extension wrapper: consider dropping file-selection entitlement if not needed.
- **Suggested tests**
  - Build and run the app, enable extension in Safari, and verify popup search + citations still function.
- **Affected areas**
  - `GoogleScholarExtension/GoogleScholarExtension.entitlements`
  - `GoogleScholarExtension Extension/GoogleScholarExtension_Extension.entitlements`

### [P1] Fix citation count parsing for thousands separators

- **Problem**
  - `Utils.extractNumber` matches only the first digit run. Strings like `Cited by 1,234` will parse as `1`.
- **Motivation**
  - Incorrect counts degrade UX and can mislead users about impact.
- **Suggested solution**
  - Parse numbers with common separators: strip `,`/spaces/NBSP and then parse, or match `[\d,]+` and normalise.
- **Suggested tests**
  - Add a small JS unit test for `extractNumber` (or manual console check) with inputs like `1,234`, `12 345`, `12\u00A0345`.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.js` (`Utils.extractNumber`, downstream rendering of “Cited by …” and “All … versions”)

### [P1] Detect Scholar “blocked / CAPTCHA / consent” responses and guide the user

- **Problem**
  - If Google Scholar responds with a block page, consent screen, or CAPTCHA, `Scholar.parseResults` may return empty or misleading results.
- **Motivation**
  - This is a common real-world failure mode for automated fetches; a clear message avoids user confusion.
- **Suggested solution**
  - Add heuristics on returned HTML (e.g., presence of known “sorry”/captcha markers) and show a dedicated UI state: “Google Scholar blocked the request; open in a new tab”.
- **Suggested tests**
  - Manual: temporarily point background fetch at a saved HTML fixture to validate detection.
  - Manual: if you can reproduce a CAPTCHA, verify the popup shows the guidance state rather than “No results found”.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/background.js`
  - `GoogleScholarExtension Extension/Resources/popup.js` (`performSearch`, `Scholar.parseResults`)

### [P2] Improve accessibility (labels, keyboard navigation, and modal focus)

- **Problem**
  - The popup lacks a `<label>` for the search input, uses clickable `<td>` cells for copy, and the modal lacks focus management and an Escape-to-close affordance.
- **Motivation**
  - Accessibility improves usability for keyboard-only users and VoiceOver users, and generally improves interaction quality.
- **Suggested solution**
  - Add a label (visually hidden if needed), use buttons for copy actions, add `aria-label` to close, trap focus in the modal, and close on Escape.
- **Suggested tests**
  - Keyboard-only: open popup → search → tab through results → open/close citation modal without mouse.
  - VoiceOver smoke test on macOS.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.html`
  - `GoogleScholarExtension Extension/Resources/popup.js`
  - `GoogleScholarExtension Extension/Resources/popup.css`

### [P2] Make dark mode look intentional (CSS variables + system colours)

- **Problem**
  - `color-scheme: light dark` is set, but many colours are hard-coded (e.g., white citation dialog background), likely producing low-contrast UI in dark mode.
- **Motivation**
  - Safari users often run system dark mode; a mismatched popup looks broken.
- **Suggested solution**
  - Introduce CSS variables for background/text/borders and define light/dark values (or use system colours where appropriate).
- **Suggested tests**
  - Toggle macOS appearance (Light/Dark) and verify readability and contrast.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.css`

### [P2] Improve search UX: debouncing, cancel-in-flight, and clearer errors

- **Problem**
  - Searches are triggered immediately on popup open (auto-seeded) and can be triggered repeatedly without debouncing or cancellation. Failures collapse into a generic “Unable to fetch results” state.
- **Motivation**
  - Reduces accidental rate-limiting and makes the UI feel more responsive/predictable.
- **Suggested solution**
  - Debounce input, cancel previous fetches (background can use `AbortController`), and render structured error states (network error vs. blocked vs. parsing).
- **Suggested tests**
  - Manual: type quickly and confirm it does not fire multiple parallel searches.
  - Manual: turn off network and confirm an actionable error state renders.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.js`
  - `GoogleScholarExtension Extension/Resources/background.js`

### [P2] Make parsing more robust to Scholar HTML drift

- **Problem**
  - `Scholar.parseResults` depends on specific class selectors (`.gs_r`, `.gs_rt a`, `.gs_a`, `.gs_rs`) and a `data-cid` heuristic. Scholar HTML changes can break extraction silently.
- **Motivation**
  - Scraping-based integrations fail over time; resilience reduces maintenance cost.
- **Suggested solution**
  - Add defensive parsing (multiple selector fallbacks), and add “parse diagnostics” so the UI can say “Google changed the page structure” vs “no results”.
  - Consider parsing the “Cite” action ID more directly from citation links when available.
- **Suggested tests**
  - Add 2–3 HTML fixtures (typical result, result without `.gs_rt a`, profile entry) and assert the parsed model shape.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/popup.js` (`Scholar.parseResults`)

### [P3] Remove dead assets / scaffolding (cleanup)

- **Problem**
  - `Resources/content.js` appears to be debug scaffolding and is not referenced by `manifest.json`. `Resources/js/` exists but is empty.
- **Motivation**
  - Reduces confusion, lowers audit surface area, and makes future reviews faster.
- **Suggested solution**
  - Delete unused files/folders (and ensure Xcode project references are updated accordingly).
- **Suggested tests**
  - Build the Xcode project after deletion and verify the extension still packages and runs.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/content.js`
  - `GoogleScholarExtension Extension/Resources/js/`

### [P3] Update extension name/description strings

- **Problem**
  - `_locales/en/messages.json` is still template text (“You should tell us what your extension does here.”).
- **Motivation**
  - Polished UX and clearer permission prompts / extension management UX.
- **Suggested solution**
  - Replace with a clear, user-facing name/description (mention that it queries Google Scholar and does not store data, if that is accurate).
- **Suggested tests**
  - Reload the extension and verify the name/description show correctly in Safari’s Extensions UI.
- **Affected areas**
  - `GoogleScholarExtension Extension/Resources/_locales/en/messages.json`

### [P3] Swift host app hardening (remove force unwraps/casts)

- **Problem**
  - The macOS host app uses force unwraps and a force cast in `ViewController.swift` (e.g., `message.body as! String`, force-unwrapped bundle URLs).
- **Motivation**
  - Avoids avoidable crash paths if the embedded web view sends unexpected messages or if resources are missing.
- **Suggested solution**
  - Convert to `guard let` / safe casts, and early-return with a user-visible error state when required resources are missing.
- **Suggested tests**
  - Run the host app, click the “Open Safari Extensions Preferences…” button, and verify behaviour remains unchanged.
- **Affected areas**
  - `GoogleScholarExtension/ViewController.swift`
