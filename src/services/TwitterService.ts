import { ExtensionService } from './ExtensionService';

export class TwitterService {
  static async detectTwitterUsername(): Promise<string | null> {
    try {
      // First try extension service (will use content script if available)
      const username = await ExtensionService.getTwitterUsername();
      if (username) {
        return username;
      }

      // Fallback to direct DOM detection
      return this.detectUsernameFromDOM();
    } catch (error) {
      console.error('Error detecting Twitter username:', error);
      return null;
    }
  }

  static detectUsernameFromDOM(): string | null {
    try {
      // Check if we're on Twitter/X
      const hostname = window.location.hostname;
      if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) {
        return null;
      }

      // Try to extract username from URL
      const pathname = window.location.pathname;
      const usernameMatch = pathname.match(/^\/([a-zA-Z0-9_]+)(?:\/|$)/);
      
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        
        // Filter out common non-username paths
        const excludedPaths = [
          'home', 'explore', 'notifications', 'messages', 'bookmarks',
          'lists', 'profile', 'settings', 'help', 'search', 'i', 'intent',
          'login', 'logout', 'signup', 'welcome', 'tos', 'privacy', 'compose',
          'about', 'download', 'jobs', 'press', 'developers', 'status'
        ];
        
        if (!excludedPaths.includes(username.toLowerCase())) {
          return username;
        }
      }

      // Try to extract from profile page elements
      const profileElements = [
        '[data-testid="UserName"] span[dir="ltr"]',
        '[data-testid="UserName"] span',
        'h1[data-testid="UserName"] span',
        'h1[role="heading"] span[dir="ltr"]',
        'h1[role="heading"] span',
        '.ProfileHeaderCard-name',
        '.ProfileNameTruncated-link'
      ];

      for (const selector of profileElements) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          let text = element.textContent.trim();
          // Remove @ symbol if present
          text = text.replace(/^@/, '');
          if (text && /^[a-zA-Z0-9_]+$/.test(text) && text.length > 0) {
            return text;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting Twitter username:', error);
      return null;
    }
  }

  static isOnTwitter(): boolean {
    const hostname = window.location.hostname;
    return hostname.includes('twitter.com') || hostname.includes('x.com');
  }

  static getCurrentUrl(): string {
    return window.location.href;
  }
}