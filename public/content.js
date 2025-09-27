// Content script for Twitter/X username detection
console.log('Karma Tracker content script loaded on:', window.location.href);

// State management
let currentUsername = null;
let currentUrl = window.location.href;
let isDetecting = false;

// Initialize
initialize();

function initialize() {
  console.log('Initializing Karma Tracker content script');
  
  // Initial detection
  detectAndNotify();
  
  // Set up URL change monitoring
  setupUrlMonitoring();
  
  // Set up message listener
  setupMessageListener();
  
  // Set up periodic detection for SPA navigation
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log('URL changed detected:', currentUrl);
      setTimeout(detectAndNotify, 500); // Delay to let page load
    }
  }, 1000);
}

function setupMessageListener() {
  // Listen for messages from background script or side panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'getUsername') {
      const username = detectUsername();
      console.log('Responding with username:', username);
      sendResponse({ 
        username, 
        url: window.location.href,
        isTwitter: isOnTwitter()
      });
    }
    
    if (request.action === 'forceDetect') {
      detectAndNotify();
      sendResponse({ success: true });
    }
  });
}

function setupUrlMonitoring() {
  // Monitor for SPA navigation
  const observer = new MutationObserver((mutations) => {
    let shouldDetect = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any new nodes contain profile information
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (element.querySelector('[data-testid="UserName"]') || 
                element.querySelector('h1[role="heading"]') ||
                element.matches('[data-testid="UserName"]') ||
                element.matches('h1[role="heading"]')) {
              shouldDetect = true;
            }
          }
        });
      }
    });
    
    if (shouldDetect && !isDetecting) {
      setTimeout(detectAndNotify, 200);
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  // Listen for history changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(detectAndNotify, 300);
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(detectAndNotify, 300);
  };

  window.addEventListener('popstate', () => {
    setTimeout(detectAndNotify, 300);
  });
}

function detectAndNotify() {
  if (isDetecting) return;
  
  isDetecting = true;
  
  try {
    const username = detectUsername();
    
    if (username !== currentUsername) {
      currentUsername = username;
      console.log('Username changed to:', username);
      
      // Notify background script of username change
      chrome.runtime.sendMessage({
        action: 'usernameDetected',
        username: username,
        url: window.location.href,
        timestamp: Date.now()
      }).catch(error => {
        console.log('Could not send message to background script:', error);
      });
    }
  } catch (error) {
    console.error('Error in detectAndNotify:', error);
  } finally {
    isDetecting = false;
  }
}

function detectUsername() {
  try {
    if (!isOnTwitter()) {
      return null;
    }

    // Method 1: Extract from URL
    const pathname = window.location.pathname;
    const usernameMatch = pathname.match(/^\/([a-zA-Z0-9_]+)(?:\/|$)/);
    
    if (usernameMatch && usernameMatch[1]) {
      const username = usernameMatch[1];
      
      // Filter out common non-username paths
      const excludedPaths = [
        'home', 'explore', 'notifications', 'messages', 'bookmarks',
        'lists', 'profile', 'settings', 'help', 'search', 'i', 'intent',
        'login', 'logout', 'signup', 'welcome', 'tos', 'privacy', 'compose',
        'about', 'download', 'jobs', 'press', 'developers', 'status',
        'accessibility', 'embed', 'privacy', 'brand', 'blog', 'advertising'
      ];
      
      if (!excludedPaths.includes(username.toLowerCase())) {
        console.log('Username detected from URL:', username);
        return username;
      }
    }

    // Method 2: Extract from profile page elements
    const profileSelectors = [
      // New Twitter selectors
      '[data-testid="UserName"] span[dir="ltr"]',
      '[data-testid="UserName"] span',
      'h1[data-testid="UserName"] span',
      
      // Additional selectors
      'h1[role="heading"] span[dir="ltr"]',
      'h1[role="heading"] span',
      
      // Legacy selectors
      '.ProfileHeaderCard-name',
      '.ProfileNameTruncated-link',
      
      // More specific selectors
      '[data-testid="primaryColumn"] h1 span',
      '[aria-label*="@"] span'
    ];

    for (const selector of profileSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        if (element && element.textContent) {
          let text = element.textContent.trim();
          
          // Remove @ symbol if present
          text = text.replace(/^@/, '');
          
          // Check if it looks like a username (alphanumeric + underscore)
          if (text && /^[a-zA-Z0-9_]+$/.test(text) && text.length > 0) {
            console.log('Username detected from element:', text, 'selector:', selector);
            return text;
          }
        }
      }
    }

    // Method 3: Look for @ mentions in the page
    const mentionElements = document.querySelectorAll('span[dir="ltr"]');
    for (const element of mentionElements) {
      const text = element.textContent?.trim();
      if (text && text.startsWith('@') && text.length > 1) {
        const username = text.slice(1);
        if (/^[a-zA-Z0-9_]+$/.test(username)) {
          // Verify this is likely the profile owner by checking context
          const parent = element.closest('[data-testid="UserCell"], [data-testid="primaryColumn"]');
          if (parent) {
            console.log('Username detected from mention:', username);
            return username;
          }
        }
      }
    }

    console.log('No username detected on current page');
    return null;
  } catch (error) {
    console.error('Error detecting Twitter username:', error);
    return null;
  }
}

function isOnTwitter() {
  const hostname = window.location.hostname;
  return hostname.includes('twitter.com') || hostname.includes('x.com');
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectUsername, isOnTwitter };
}