# GoogleScholarExtension for Safari

## Project Overview

GoogleScholarExtension is a Safari web extension that provides quick access to Google Scholar search results directly from your browser. The extension allows you to search academic papers based on the current tab's title or custom search terms, view citations, and interact with Google Scholar's features without leaving your browser.

Current version: 1.0 (refactored popup to a reliable single-file modular script for Safari)

## Features

- **Instant Search**: Automatically searches Google Scholar using the current tab's title
- **Accurate Title Seeding**: Reads publisher metadata when available for precise paper titles
- **Custom Search**: Allows manual search input for specific queries
- **Rich Results**: Displays comprehensive search results including:
  - Paper titles with direct links
  - Author information and publication details
  - Article snippets/abstracts
  - Citation counts
  - Related articles links
  - Version information
- **Citation Management**: 
  - View citations in multiple formats (MLA, APA, etc.)
  - One-click copy for citations
  - Modal dialog for better citation viewing

## Installation Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/GoogleScholarExtension.git
   ```

2. Open the project in Xcode:
   - Navigate to the project directory
   - Open `GoogleScholarExtension.xcodeproj`

3. Build and run the project:
   - Select the appropriate scheme
   - Build and launch the application

4. Enable in Safari:
   - Open Safari Preferences
   - Go to Extensions tab
   - Enable GoogleScholarExtension

## Usage

1. Click the extension icon in Safari's toolbar
2. The extension will automatically search using the current tab's title
3. You can:
   - Modify the search query and press Enter or click Search
   - Click on paper titles to open them
   - Use "Cite" to view and copy citations
   - Access "Cited by", "Related articles", and version information

## Technical Details

### Architecture

The extension consists of several key components:

- `popup.html`: Minimal shell that loads the popup script.
- `popup.js`: Single-file modular script containing:
  - Utils: text cleanup, number parsing, element helper, URL normalization
  - Services: active tab title + background messaging for Scholar and citations
  - Scholar: search HTML parsing + citation URL builder
  - Dom: rendering and event wiring for results
  - Citations: modal with copy-to-clipboard and export links
- `background.js`: Performs cross-origin fetches to Scholar and citation pages with the correct headers.
- `manifest.json`: Extension configuration and permissions.

See `docs/ARCHITECTURE.md` for a deeper dive into code organization and data flow.

### Title Extraction Logic

When you open the popup, it seeds the search field using the active page's best-available title:

- Priority:
  1) `meta[name="citation_title"]`
  2) `meta[name="dc.Title"]`, `meta[name="DC.title"]`, `meta[property="og:title"]`, `meta[name="twitter:title"]`, `meta[name="parsely-title"]`
  3) Fallback to the tab title
- Normalization removes common suffixes like `" | <site/venue>"`.

This improves accuracy over relying on the generic tab title alone.

### Browser Support

- Safari on macOS only. The popup and background scripts use the WebExtension `browser` API exclusively; there is no `chrome` fallback.

### Key Features Implementation

- **Search Processing**: Uses Google Scholar's search API with proper headers
- **Citation Management**: Implements a modal dialog system for citation viewing
- **Result Parsing**: Processes HTML responses to extract structured academic information
- **User Interface**: Responsive design with loading states and error handling

### Browser Compatibility

- Designed for Safari on macOS
- Requires Safari 14.0 or later
- macOS 10.14+

## Development

### Prerequisites

- Xcode 14.0+
- macOS 10.14 or later
- Safari 14.0+

### Project Structure

```
docs/
└── ARCHITECTURE.md     # Detailed architecture and flow

GoogleScholarExtension Extension/
└── Resources/
    ├── popup.html      # Main extension interface
    ├── popup.js        # Single-file modular popup logic
    ├── background.js   # Background processing (fetch)
    ├── manifest.json   # Extension configuration
    └── images/         # Extension icons
```

### Documentation

- Architecture overview: `docs/ARCHITECTURE.md`

### Permissions

The extension uses the following permissions:

- `activeTab`: temporary access to the current page so the popup can read title metadata.
- `scripting`: enables content script injection via the MV3 `browser.scripting` API for metadata extraction.
- `host_permissions` for `https://scholar.google.com/*`: allows background fetches for search results and citations.

### Build

Use the Xcode IDE:

- Open `GoogleScholarExtension.xcodeproj` in Xcode
- Select the "GoogleScholarExtension" scheme
- Build and run; then enable the extension in Safari

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or create issues for bugs and feature requests.
