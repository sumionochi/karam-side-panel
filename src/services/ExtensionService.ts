// Service to handle browser extension specific functionality

export class ExtensionService {
  static isExtensionContext(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
  }

  static async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    if (!this.isExtensionContext()) return null;
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0] || null;
    } catch (error) {
      console.error('Error getting current tab:', error);
      return null;
    }
  }

  static async sendMessageToContentScript(message: any): Promise<any> {
    if (!this.isExtensionContext()) return null;
    
    try {
      const tab = await this.getCurrentTab();
      if (!tab?.id) return null;
      
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      console.error('Error sending message to content script:', error);
      return null;
    }
  }

  static async getTwitterUsername(): Promise<string | null> {
    if (!this.isExtensionContext()) {
      // Fallback for development - try to detect from current page
      return this.detectUsernameFromDOM();
    }

    try {
      const response = await this.sendMessageToContentScript({ action: 'getUsername' });
      return response?.username || null;
    } catch (error) {
      console.error('Error getting Twitter username:', error);
      return null;
    }
  }

  static detectUsernameFromDOM(): string | null {
    try {
      // This is a fallback for development mode
      const hostname = window.location.hostname;
      if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) {
        return null;
      }

      const pathname = window.location.pathname;
      const usernameMatch = pathname.match(/^\/([a-zA-Z0-9_]+)(?:\/|$)/);
      
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        const excludedPaths = [
          'home', 'explore', 'notifications', 'messages', 'bookmarks',
          'lists', 'profile', 'settings', 'help', 'search', 'i', 'intent',
          'login', 'logout', 'signup', 'welcome', 'tos', 'privacy'
        ];
        
        if (!excludedPaths.includes(username.toLowerCase())) {
          return username;
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting username from DOM:', error);
      return null;
    }
  }

  static isOnTwitter(): boolean {
    const hostname = window.location.hostname;
    return hostname.includes('twitter.com') || hostname.includes('x.com');
  }

  static async storeData(key: string, value: any): Promise<void> {
    if (!this.isExtensionContext()) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }

    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Error storing data:', error);
    }
  }

  static async getData(key: string): Promise<any> {
    if (!this.isExtensionContext()) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }

    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      console.error('Error getting data:', error);
      return null;
    }
  }
}