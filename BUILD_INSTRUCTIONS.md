# Karma Tracker Extension - Build Instructions

## Quick Build & Install

1. **Build Extension**:
   ```bash
   npm run build
   ```

2. **Install in Browser**:
   - Open Chrome/Edge/Brave
   - Go to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder
   - Extension will be loaded and ready to use

3. **Test Extension**:
   - Visit any Twitter/X profile page (e.g., https://twitter.com/elonmusk)
   - Click the Karma Tracker extension icon in toolbar
   - Side panel opens showing Twitter username detection
   - If user is registered in karma system, shows their karma data

## Development Workflow

```bash
# Install dependencies
npm install

# Development mode (for testing UI)
npm run dev

# Build for extension
npm run build

# Type checking
npm run type-check
```

## Extension Features

### 🎯 Twitter Username Detection
- Monitors Twitter/X URLs for profile pages
- Extracts usernames from URL patterns and DOM elements  
- Filters out non-profile pages automatically
- Real-time detection as you navigate Twitter

### 🔗 Blockchain Integration
- Connects to World Sepolia testnet via Alchemy RPC
- Reads karma data from deployed smart contract
- Shows karma scores, registration status, social links
- Displays recent karma transactions with reasons

### 🎨 Design System
- Bold black & white design optimized for side panels
- High contrast for quick information scanning
- Monospace typography for technical feel
- Sharp borders and strong shadows

## Files Structure

```
dist/                    # Built extension (load this folder)
├── index.html          # Side panel HTML
├── assets/             # Built React app assets
├── manifest.json       # Extension manifest
├── background.js       # Service worker
└── content.js          # Twitter page content script

public/                  # Extension source files
├── manifest.json       # Extension configuration
├── background.js       # Service worker script
├── content.js          # Content script for Twitter
└── favicon.ico         # Extension icon

src/                     # React application
├── services/           # Blockchain & extension services
├── components/         # React components
├── constants/          # Contract ABI & addresses
└── pages/              # Main application page
```

## Troubleshooting

### Extension Won't Load
- Ensure `dist/manifest.json` exists after build
- Check for build errors in console
- Verify all required files are in `dist/`

### Side Panel Won't Open
- Check that extension has "Side Panel" permission
- Ensure you're on Twitter/X when clicking icon
- Look for errors in extension's service worker console

### Username Not Detected
- Ensure you're on a Twitter profile page, not timeline
- Check browser console for content script errors
- Try refreshing the page and reopening side panel

### Karma Data Not Loading
- Check network connectivity to World Sepolia RPC
- Verify contract address and ABI are correct
- Look for blockchain connection errors in console

## Browser Support

- ✅ Chrome 114+ (full support)
- ✅ Edge 114+ (full support)  
- ✅ Brave (Chromium-based, full support)
- ❌ Firefox (no side panel API support)
- ❌ Safari (no extension compatibility)

## Contract Details

- **Network**: World Sepolia Testnet
- **Contract**: `0x3bB3A124099fddBD20DFEd345D7835fE68c57E87`
- **RPC**: `https://worldchain-sepolia.g.alchemy.com/public`
- **Features**: Karma giving/slashing, social connections, daily limits