# Product Price Tracker - Chrome Extension

A Chrome extension that extracts product data from e-commerce websites and sends it to the backend API for price tracking.

## Features

- 🔍 **Automatic Product Detection**: Scans pages for product information using multiple extraction strategies
- 📊 **Universal Extraction**: Supports JSON-LD, OpenGraph, Microdata, and heuristic extraction
- 💾 **Direct API Integration**: Sends extracted data directly to the backend
- 🎨 **Clean UI**: Modern popup interface with product preview
- ⚡ **Fast & Lightweight**: Minimal performance impact

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `chrome-extension` folder
4. The extension icon should appear in your toolbar

### Generate Icons (Required)

The extension requires PNG icons. Convert the SVG files to PNG:

```bash
# Using a tool like ImageMagick
convert icons/icon16.svg icons/icon16.png
convert icons/icon48.svg icons/icon48.png
convert icons/icon128.svg icons/icon128.png

# Or use an online converter like:
# https://convertio.co/svg-png/
# https://cloudconvert.com/svg-to-png
```

Update the manifest.json to use `.png` instead of `.svg` if needed.

## Usage

1. Navigate to any product page on an e-commerce website
2. Click the extension icon in your toolbar
3. The extension will automatically analyze the page
4. Review the extracted product data
5. Click "Track This Product" to send to the backend

## Extraction Methods

The extension uses the same universal extraction logic as the backend:

1. **JSON-LD (Schema.org)**: Most reliable, works on ~75% of e-commerce sites
2. **OpenGraph Meta Tags**: Very common, works on ~60% of sites
3. **HTML5 Microdata**: Semantic markup, works on ~40% of sites
4. **Heuristic Pattern Matching**: Fallback for sites without structured data

## Configuration

The extension stores the API URL in Chrome's local storage. By default, it uses:
- `http://localhost:3000/api/v1/products/extension`

You can change this in the popup's footer input field.

## API Endpoints

The extension communicates with the following backend endpoints:

- `POST /api/v1/products/extension` - Submit extracted product data
- `GET /api/v1/products/jobs/:jobId` - Check job processing status

## File Structure

```
chrome-extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── src/
│   ├── content/
│   │   └── index.js          # Content script - runs on pages
│   ├── popup/
│   │   ├── popup.html        # Popup UI
│   │   ├── popup.css         # Popup styles
│   │   └── popup.js          # Popup logic
│   ├── background/
│   │   └── service-worker.js # Service worker for background tasks
│   └── utils/
│       └── extraction.js     # Universal extraction logic
├── icons/
│   ├── icon16.svg/png        # 16x16 icon
│   ├── icon48.svg/png        # 48x48 icon
│   └── icon128.svg/png       # 128x128 icon
└── README.md
```

## Data Flow

```
User visits product page
        ↓
User clicks extension icon
        ↓
Content script extracts product data
        ↓
Popup displays extracted data
        ↓
User confirms → Data sent to backend
        ↓
Backend processes and stores product
        ↓
Extension shows success message
```

## Supported Websites

The extension works on any website with product information, including:
- Amazon
- Mercado Livre
- Magazine Luiza
- Casas Bahia
- Americanas
- And many more...

## Browser Compatibility

- Chrome 88+ (Manifest V3 required)
- Edge 88+ 
- Other Chromium-based browsers supporting Manifest V3

## Troubleshooting

### Extension not detecting products
- Some websites use custom product layouts without structured data
- Try refreshing the page before clicking the extension
- Check the browser console for extraction errors

### API connection errors
- Ensure the backend is running on the configured URL
- Check the API URL in the popup footer
- Verify CORS is properly configured on the backend

### Icons not showing
- Make sure to convert SVG icons to PNG format
- Check the manifest.json paths match your icon files

## Development

To modify the extraction logic:

1. Edit `src/utils/extraction.js`
2. Reload the extension in `chrome://extensions/`
3. Test on various e-commerce sites

The extraction logic is a pure JavaScript port of the backend TypeScript extractor at `backend/src/extractors/universal.ts`.

## Security Notes

- The extension requests permission to read page content (`activeTab`)
- Data is only sent when the user explicitly clicks "Track This Product"
- No data is stored locally except configuration and job tracking IDs
- API calls use the configured backend URL only

## License

Same as the main project.
