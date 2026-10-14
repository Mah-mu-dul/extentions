# Blur Web Content Chrome Extension

A simple Chrome extension that allows you to blur or mask selected text and blur images on any webpage.

## Features

- Right-click on selected text to:
  - Blur it with a blur effect
  - Mask it with dots (like a password field)
  - Reveal it (unblur or unmask)
- Right-click on images to:
  - Blur them
  - Reveal them (unblur)
- Works on any website
- No popup UI required

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. Add your own icon files (48x48 and 128x128 PNG) named `icon48.png` and `icon128.png`

## Usage

For text:

1. Select any text on a webpage
2. Right-click and choose:
   - "Blur Content" to apply a blur effect
   - "Mask Content" to replace text with dots
   - "Reveal Content" to unblur or unmask previously modified text
3. The selected text will be modified accordingly

For images:

1. Right-click on any image
2. Choose either:
   - "Blur Content" to blur the image
   - "Reveal Content" to unblur the image
3. The image will be modified accordingly

## Future Enhancements

- Add blur intensity controls
- Support for more content types
- Custom blur styles
- Custom masking characters
- Batch reveal functionality
- Keyboard shortcuts

## Development

The extension is built using Chrome Extension Manifest V3 and includes:

- `manifest.json`: Extension configuration
- `background.js`: Context menu creation and event handling
- Icon files (to be added by user)

## License

MIT License
