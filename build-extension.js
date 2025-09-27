import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Building Karma Tracker Extension...');

// Build the React app
console.log('1. Building React application...');
execSync('npm run build', { stdio: 'inherit' });

// Ensure extension files are in the dist folder
console.log('2. Copying extension files...');

const filesToCopy = [
  'public/manifest.json',
  'public/background.js', 
  'public/content.js'
];

filesToCopy.forEach(file => {
  const source = file;
  const destination = `dist/${path.basename(file)}`;
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
    console.log(`Copied ${file} to dist/`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

// Verify manifest.json exists in dist
if (fs.existsSync('dist/manifest.json')) {
  console.log('✅ Extension built successfully!');
  console.log('📁 Extension files are in the dist/ folder');
  console.log('🔧 Load the dist/ folder as an unpacked extension in your browser');
} else {
  console.error('❌ Build failed: manifest.json not found in dist/');
}

console.log('\nNext steps:');
console.log('1. Open Chrome/Edge/Brave');
console.log('2. Go to chrome://extensions/ (or edge://extensions/)');
console.log('3. Enable "Developer mode"');
console.log('4. Click "Load unpacked"');
console.log('5. Select the dist/ folder');
console.log('6. Visit Twitter/X and click the extension icon!');