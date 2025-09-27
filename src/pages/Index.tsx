import { useState } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { HomePage } from './HomePage';
import { SearchPage } from './SearchPage';
import { LeaderboardPage } from './LeaderboardPage';
import { HistoryPage } from './HistoryPage';
import { ProfilePage } from './ProfilePage';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');

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
