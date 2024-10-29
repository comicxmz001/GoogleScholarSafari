# GoogleScholarExtension

## Project Overview

GoogleScholarExtension is a macOS application with a Safari web extension that allows users to interact with Google Scholar directly from their browser. The extension provides quick access to Google Scholar search results based on the current tab's URL.

## Installation Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/GoogleScholarExtension.git
   ```

2. Open the project in Xcode:
   - Navigate to the project directory.
   - Open `GoogleScholarExtension.xcodeproj`.

3. Build and run the project:
   - Select the appropriate scheme for the GoogleScholarExtension.
   - Click the Run button in Xcode to build and launch the application.

## Usage

- Once the application is running, you can enable the extension in Safari:
  - Open Safari.
  - Go to Safari Preferences > Extensions.
  - Enable the GoogleScholarExtension.

- Use the extension by clicking on the toolbar icon to search Google Scholar with the current page's URL.

## Development

### Prerequisites
Developed on:
- Xcode 16.0
- macOS 15.1

Suppose to work on:
- macOS 10.14 or later

### Code Structure

- The main application logic is in `AppDelegate.swift` and `ViewController.swift`.
- The Safari web extension logic is in `SafariWebExtensionHandler.swift`.
- HTML, CSS, and JavaScript resources for the extension are located in the `Resources` directory.

### Key Files

- `manifest.json`: Defines the extension's metadata, permissions, and scripts.
- `popup.js`: Contains the logic to redirect the popup to Google Scholar and close it automatically.
- `popup.html`: The HTML structure for the popup interface. web extension.

### Building the Extension

- The extension is defined in the `GoogleScholarExtension Extension` target.
- The `manifest.json` file specifies the extension's permissions and scripts.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
