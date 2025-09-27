import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Minus, Zap } from 'lucide-react';

interface KarmaButtonProps {
  type: 'give' | 'slash';
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const KarmaButton = ({ 
  type, 
  onClick, 
  disabled, 
  isLoading,
  className 
}: KarmaButtonProps) => {
  const isGive = type === 'give';
  
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'transition-all duration-300 hover:scale-105',
        isGive
          ? 'bg-karma-positive hover:bg-karma-positive/90 text-white'
          : 'bg-karma-negative hover:bg-karma-negative/90 text-white',
        className
      )}
      size="sm"
    >
      {isLoading ? (
        <Zap className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {isGive ? (
            <Plus className="h-4 w-4 mr-1" />
          ) : (
            <Minus className="h-4 w-4 mr-1" />
          )}
          {isGive ? 'Give Karma' : 'Slash Karma'}
        </>
      )}
    </Button>
  );
};