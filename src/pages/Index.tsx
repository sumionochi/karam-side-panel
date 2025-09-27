import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { HomePage } from './HomePage';
import { SearchPage } from './SearchPage';
import { LeaderboardPage } from './LeaderboardPage';
import { HistoryPage } from './HistoryPage';
import { ProfilePage } from './ProfilePage';

type TabKey = 'home' | 'search' | 'leaderboard' | 'history' | 'profile';
const TAB_KEYS: TabKey[] = ['home', 'search', 'leaderboard', 'history', 'profile'];
const STORAGE_KEY = 'karam:lastTab';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  // Init from hash or persisted last tab
  useEffect(() => {
    const hash = (window.location.hash || '').replace('#', '').toLowerCase();
    if (TAB_KEYS.includes(hash as TabKey)) {
      setActiveTab(hash as TabKey);
      return;
    }
    const saved = (localStorage.getItem(STORAGE_KEY) || '') as TabKey;
    if (TAB_KEYS.includes(saved)) setActiveTab(saved);
  }, []);

  // Persist + update hash
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTab);
    // keep the hash in sync so we can deep-link
    if (`#${activeTab}` !== window.location.hash) {
      window.location.hash = activeTab;
    }
    // nice UX: scroll to top on tab switch
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Keyboard shortcuts: ⌘/Ctrl + 1..5
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;
    const idx = parseInt(e.key, 10);
    if (!Number.isNaN(idx) && idx >= 1 && idx <= TAB_KEYS.length) {
      setActiveTab(TAB_KEYS[idx - 1]);
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  const renderPage = () => {
    switch (activeTab) {
      case 'search':
        return <SearchPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'history':
        return <HistoryPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-background w-full max-w-md mx-auto border-x border-border">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="pb-4">
        {renderPage()}
      </main>
    </div>
  );
};

export default Index;
