import { cn } from '@/lib/utils';

interface KarmaDisplayProps {
  karma: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const KarmaDisplay = ({ 
  karma, 
  size = 'md', 
  showLabel = true,
  className 
}: KarmaDisplayProps) => {
  const getKarmaColor = (karma: number) => {
    if (karma >= 1000) return 'text-primary karma-glow';
    if (karma >= 500) return 'text-karma-positive';
    if (karma >= 100) return 'text-foreground';
    return 'text-karma-neutral';
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-2xl font-bold';
      default:
        return 'text-lg font-semibold';
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {showLabel && (
        <span className="text-muted-foreground text-sm">Karma:</span>
      )}
      <span className={cn(
        getSizeClasses(size),
        getKarmaColor(karma),
        'transition-all duration-300'
      )}>
        {karma.toLocaleString()}
      </span>
      {karma >= 1000 && (
        <span className="text-primary animate-pulse">✨</span>
      )}
    </div>
  );
};