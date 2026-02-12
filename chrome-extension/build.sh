#!/bin/bash

# Build script for Chrome Extension
# Converts SVG icons to PNG format

echo "Building Chrome Extension..."

cd "$(dirname "$0")"

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "Converting SVG icons to PNG..."
    
    convert icons/icon16.svg icons/icon16.png
    convert icons/icon48.svg icons/icon48.png
    convert icons/icon128.svg icons/icon128.png
    
    echo "Icons converted successfully!"
else
    echo "Warning: ImageMagick not found. Please install it or convert icons manually."
    echo "You can use online converters like:"
    echo "  - https://convertio.co/svg-png/"
    echo "  - https://cloudconvert.com/svg-to-png"
    echo ""
    echo "Or install ImageMagick:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  macOS: brew install imagemagick"
    echo "  Windows: https://imagemagick.org/script/download.php#windows"
fi

echo ""
echo "Build complete!"
echo ""
echo "To load the extension:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select the chrome-extension folder"
