import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TwitterService } from '@/services/TwitterService';

interface TwitterDetectorProps {
  onUsernameDetected: (username: string | null) => void;
}

export const TwitterDetector = ({ onUsernameDetected }: TwitterDetectorProps) => {
  const [detectedUsername, setDetectedUsername] = useState<string | null>(null);
  const [isOnTwitter, setIsOnTwitter] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    const checkTwitter = async () => {
      try {
        const username = await TwitterService.detectTwitterUsername();
        const onTwitter = TwitterService.isOnTwitter();
        const url = TwitterService.getCurrentUrl();
        
        setDetectedUsername(username);
        setIsOnTwitter(onTwitter);
        setCurrentUrl(url);
        onUsernameDetected(username);
      } catch (error) {
        console.error('Error checking Twitter:', error);
      }
    };

    // Initial check
    checkTwitter();

    // Set up periodic checking for extension context
    const interval = setInterval(checkTwitter, 2000);

    // Listen for URL changes (for SPA navigation)
    const observer = new MutationObserver(() => {
      setTimeout(checkTwitter, 300);
    });
    
    if (document.body) {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    }

    // Listen for history changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkTwitter, 300);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkTwitter, 300);
    };

    window.addEventListener('popstate', () => {
      setTimeout(checkTwitter, 300);
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', checkTwitter);
    };
  }, [onUsernameDetected]);

  if (!isOnTwitter) {
    return (
      <Card className="border-2 border-border bg-card shadow-sharp">
        <div className="p-4 text-center">
          <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            STATUS
          </div>
          <div className="text-lg font-black">
            NOT ON TWITTER
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Navigate to Twitter/X to detect usernames
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border bg-card shadow-sharp">
      <div className="p-4">
        <div className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
          TWITTER DETECTOR
        </div>
        
        {detectedUsername ? (
          <div className="space-y-2">
            <div className="text-lg font-black text-success">
              @{detectedUsername}
            </div>
            <div className="text-xs text-muted-foreground">
              Username detected on current page
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-lg font-black text-warning">
              NO USERNAME DETECTED
            </div>
            <div className="text-xs text-muted-foreground">
              Visit a profile page to detect username
            </div>
          </div>
        )}
        
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground break-all">
            {currentUrl}
          </div>
        </div>
      </div>
    </Card>
  );
};