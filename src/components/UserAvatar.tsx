import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User } from '@/types/karma';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showVerification?: boolean;
  className?: string;
}

export const UserAvatar = ({ 
  user, 
  size = 'md', 
  showVerification = true,
  className 
}: UserAvatarProps) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 w-8';
      case 'lg':
        return 'h-16 w-16';
      default:
        return 'h-12 w-12';
    }
  };

  const getInitials = () => {
    if (user.ensName) {
      return user.ensName.slice(0, 2).toUpperCase();
    }
    return user.address.slice(2, 4).toUpperCase();
  };

  return (
    <div className={cn('relative', className)}>
      <Avatar className={cn(getSizeClasses(), user.isVerified && 'ring-2 ring-primary')}>
        <AvatarImage src={user.avatar} alt={user.ensName || user.address} />
        <AvatarFallback className="karma-gradient text-white font-semibold">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      
      {showVerification && user.isVerified && (
        <Badge 
          className="absolute -bottom-1 -right-1 h-4 w-4 p-0 bg-primary hover:bg-primary"
          title="World ID Verified"
        >
          <span className="text-xs">✓</span>
        </Badge>
      )}
    </div>
  );
};