import { Button } from '@/components/ui/button';
import { Home, Users, History, Trophy, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="border-b border-border bg-card">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={cn(
                'flex-1 rounded-none border-b-2 border-transparent py-3',
                isActive && 'border-primary bg-primary/5 text-primary'
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};