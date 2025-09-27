// Background script for Karam Side Panel Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Karam Side Panel extension installed');

    // Set up side panel for all tabs (with compatibility check)
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
});

// Handle tab updates to ensure side panel is available
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && chrome.sidePanel && chrome.sidePanel.setOptions) {
        // Enable side panel for all tabs
        chrome.sidePanel.setOptions({
            tabId: tabId,
            path: 'index.html',
            enabled: true
        });
    }
});

// Handle action button clicks
chrome.action.onClicked.addListener((tab) => {
    if (chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});

// Handle messages from content scripts or side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    switch (request.action) {
        case 'openSidePanel':
            if (chrome.sidePanel && chrome.sidePanel.open) {
                chrome.sidePanel.open({ tabId: sender.tab?.id });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Side panel API not available' });
            }
            break;

        case 'getTabInfo':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                sendResponse({
                    success: true,
                    tab: tabs[0]
                });
            });
            return true; // Keep message channel open for async response

        case 'storage':
            if (request.operation === 'get') {
                chrome.storage.local.get(request.key, (result) => {
                    sendResponse({ success: true, data: result });
                });
                return true;
            } else if (request.operation === 'set') {
                chrome.storage.local.set({ [request.key]: request.value }, () => {
                    sendResponse({ success: true });
                });
                return true;
            }
            break;

        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// Handle side panel focus events (with compatibility check)
if (chrome.sidePanel && chrome.sidePanel.onFocus) {
    chrome.sidePanel.onFocus.addListener((windowId) => {
        console.log('Side panel focused in window:', windowId);
    });
}

// Handle side panel blur events (with compatibility check)
if (chrome.sidePanel && chrome.sidePanel.onBlur) {
    chrome.sidePanel.onBlur.addListener((windowId) => {
        console.log('Side panel blurred in window:', windowId);
    });
}

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Add any functions you want to test
    };
}