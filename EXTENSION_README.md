# Karma Tracker Browser Extension

A browser extension side panel that tracks blockchain karma system data while browsing Twitter/X.

## Features

- **Twitter Username Detection**: Automatically detects Twitter usernames when visiting profiles
- **Karma Data Display**: Shows karma scores, registration status, and social connections from the blockchain
- **Recent Activity**: Displays recent karma transactions (given/slashed)
- **Bold Design**: Clean black and white interface optimized for side panel usage

## Installation

### Development Mode

1. **Build the Extension**:

   ```bash
   npm run build
   ```

2. **Load in Browser**:

   - Open Chrome/Edge/Brave
   - Go to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

3. **Open Side Panel**:
   - Visit Twitter/X
   - Click the Karma Tracker extension icon in the toolbar
   - The side panel will open showing karma data

## How It Works

### Twitter Detection

- Monitors URL changes on Twitter/X
- Extracts usernames from profile URLs
- Filters out non-profile pages automatically

### Blockchain Integration

- Connects to World Sepolia testnet
- Reads karma data from deployed smart contract
- Displays meaningful information about users' karma status

### Data Displayed

- **Karma Score**: Current karma balance with color coding
- **Registration Status**: Whether user is registered in the system
- **Social Connections**: Linked GitHub and Discord accounts
- **Recent Activity**: Last 5 karma transactions with reasons
- **Address**: Shortened blockchain address

## Contract Details

- **Network**: World Sepolia Testnet
- **Contract**: `0x3bB3A124099fddBD20DFEd345D7835fE68c57E87`
- **Features**: Karma giving/slashing, social connections, daily limits

## Technical Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Blockchain**: ethers.js
- **Extension**: Manifest V3 with side panel API

## Design Philosophy

Bold, high-contrast black and white design optimized for:

- Quick information scanning
- Minimal distractions
- Professional appearance
- Extension side panel constraints

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build extension
npm run build

# Type checking
npm run type-check
```

## Browser Support

- Chrome 114+
- Edge 114+
- Brave (Chromium-based)
- Other Chromium browsers with side panel support

## Privacy

- No personal data collection
- Only reads public blockchain data
- Twitter username detection is client-side only
- No tracking or analytics
