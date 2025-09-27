import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from './UserAvatar';
import { KarmaDisplay } from './KarmaDisplay';
import { KarmaButton } from './KarmaButton';
import { User } from '@/types/karma';
import { Twitter, Github, Instagram, Music, Youtube } from 'lucide-react';
import { useState } from 'react';

interface UserCardProps {
  user: User;
  showActions?: boolean;
  onGiveKarma?: (userId: string) => void;
  onSlashKarma?: (userId: string) => void;
}

export const UserCard = ({ 
  user, 
  showActions = true, 
  onGiveKarma, 
  onSlashKarma 
}: UserCardProps) => {
  const [isGiving, setIsGiving] = useState(false);
  const [isSlashing, setIsSlashing] = useState(false);

  const handleGiveKarma = async () => {
    if (!onGiveKarma) return;
    setIsGiving(true);
    try {
      await onGiveKarma(user.id);
    } finally {
      setIsGiving(false);
    }
  };

  const handleSlashKarma = async () => {
    if (!onSlashKarma) return;
    setIsSlashing(true);
    try {
      await onSlashKarma(user.id);
    } finally {
      setIsSlashing(false);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return Twitter;
      case 'github':
        return Github;
      case 'instagram':
        return Instagram;
      case 'tiktok':
        return Music;
      case 'youtube':
        return Youtube;
      default:
        return null;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <UserAvatar user={user} size="md" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">
                {user.ensName || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`}
              </h3>
              {user.isVerified && (
                <Badge variant="secondary" className="text-xs">
                  Verified
                </Badge>
              )}
            </div>
            
            <KarmaDisplay karma={user.karma} size="sm" showLabel={false} />
            
            {user.bio && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {user.bio}
              </p>
            )}
            
            {/* Social profiles */}
            <div className="flex gap-1 mt-2">
              {Object.entries(user.socialProfiles).map(([platform, username]) => {
                if (!username) return null;
                const Icon = getSocialIcon(platform);
                if (!Icon) return null;
                
                return (
                  <Badge 
                    key={platform} 
                    variant="outline" 
                    className="text-xs px-1 py-0"
                    title={`${platform}: ${username}`}
                  >
                    <Icon className="h-3 w-3" />
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
        
        {showActions && (
          <div className="flex gap-2 mt-3">
            <KarmaButton
              type="give"
              onClick={handleGiveKarma}
              isLoading={isGiving}
              className="flex-1"
            />
            <KarmaButton
              type="slash"
              onClick={handleSlashKarma}
              isLoading={isSlashing}
              className="flex-1"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};