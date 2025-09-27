// Background script for Karma Tracker extension
console.log('Karma Tracker background script loaded');

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Karma Tracker extension installed:', details.reason);
  
  // Set up side panel availability
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked for tab:', tab.id);
  
  try {
    // Open side panel for the current tab
    await chrome.sidePanel.open({ 
      windowId: tab.windowId 
    });
    console.log('Side panel opened successfully');
  } catch (error) {
    console.error('Error opening side panel:', error);
  }
});

// Monitor tab updates to enable/disable side panel
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
    
    const isTwitter = tab.url.includes('twitter.com') || tab.url.includes('x.com');
    
    try {
      if (isTwitter) {
        // Enable side panel for Twitter/X tabs
        await chrome.sidePanel.setOptions({
          tabId,
          path: 'index.html',
          enabled: true
        });
        
        // Update action icon to indicate it's available
        await chrome.action.setTitle({
          tabId,
          title: 'Open Karma Tracker (Twitter/X detected)'
        });
        
        console.log('Side panel enabled for Twitter tab:', tabId);
      } else {
        // Keep side panel available but update title
        await chrome.action.setTitle({
          tabId,
          title: 'Open Karma Tracker'
        });
      }
    } catch (error) {
      console.error('Error updating side panel options:', error);
    }
  }
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender);
  
  if (message.action === 'getTabInfo') {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title,
          tabId: tabs[0].id
        });
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'openSidePanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          await chrome.sidePanel.open({ windowId: tabs[0].windowId });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ error: error.message });
        }
      }
    });
    return true;
  }
});

// Handle startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Karma Tracker extension started');
});

// Log when side panel is opened
chrome.sidePanel.onPanelOpenChanged?.addListener?.(() => {
  console.log('Side panel state changed');
});
