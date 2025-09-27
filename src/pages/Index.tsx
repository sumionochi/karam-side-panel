// src/pages/Index.tsx
import { useState } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { HomePage } from './HomePage';
import { SearchPage } from './SearchPage';
import { LeaderboardPage } from './LeaderboardPage';
import { HistoryPage } from './HistoryPage';
import { ProfilePage } from './ProfilePage';

export type TabKey = 'home' | 'search' | 'leaderboard' | 'history' | 'profile';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

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
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-background w-full max-w-md mx-auto border-x border-border">
      <Header />
      {/* If your <Navigation /> expects (tab: string) => void, adapt via a tiny wrapper */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabKey)}
      />
      <main className="pb-4">
        {renderPage()}
      </main>
    </div>
  );
};

export default Index;