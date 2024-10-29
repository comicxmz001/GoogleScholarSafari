# GoogleScholarExtension

## Project Overview

GoogleScholarExtension is a Safari web extension that provides quick access to Google Scholar search results directly from your browser. The extension allows you to search academic papers based on the current tab's title or custom search terms, view citations, and interact with Google Scholar's features without leaving your browser.

## Features

- **Instant Search**: Automatically searches Google Scholar using the current tab's title
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

- **popup.html**: The main user interface
- **popup.js**: Core functionality and search logic
- **background.js**: Handles API requests to Google Scholar
- **manifest.json**: Extension configuration and permissions

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
GoogleScholarExtension Extension/
├── Resources/
│   ├── popup.html      # Main extension interface
│   ├── popup.js        # Core extension logic
│   ├── background.js   # Background processing
│   ├── manifest.json   # Extension configuration
│   └── images/         # Extension icons
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or create issues for bugs and feature requests.
