import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KarmaTransaction } from '@/types/karma';
import { ArrowRight, Gift, Zap, Coins, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionItemProps {
  transaction: KarmaTransaction;
  currentUserId: string;
}

export const TransactionItem = ({ transaction, currentUserId }: TransactionItemProps) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'give':
        return Gift;
      case 'slash':
        return Zap;
      case 'redistribution':
        return Coins;
      case 'social_bonus':
        return UserPlus;
      default:
        return ArrowRight;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount < 0) return 'text-karma-negative';
    if (type === 'redistribution' || type === 'social_bonus') return 'text-primary';
    return 'text-karma-positive';
  };

  const getTransactionDescription = () => {
    const { type, from, to, amount } = transaction;
    const isOutgoing = from === currentUserId;
    const isIncoming = to === currentUserId;
    
    if (type === 'redistribution') {
      return 'Random redistribution event';
    }
    
    if (type === 'social_bonus') {
      return 'Social media bonus';
    }
    
    if (isOutgoing) {
      return type === 'give' ? 'Gave karma' : 'Slashed karma';
    }
    
    if (isIncoming) {
      return type === 'give' ? 'Received karma' : 'Karma slashed';
    }
    
    return `${type} transaction`;
  };

  const Icon = getTransactionIcon(transaction.type);

  return (
    <Card className="hover:shadow-sm transition-shadow duration-200">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-full',
            transaction.amount >= 0 ? 'bg-karma-positive/10' : 'bg-karma-negative/10'
          )}>
            <Icon className={cn(
              'h-4 w-4',
              getTransactionColor(transaction.type, transaction.amount)
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {getTransactionDescription()}
              </span>
              <Badge 
                variant={transaction.amount >= 0 ? 'default' : 'destructive'}
                className="text-xs"
              >
                {transaction.amount >= 0 ? '+' : ''}{transaction.amount}
              </Badge>
            </div>
            
            {transaction.reason && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {transaction.reason}
              </p>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              {transaction.timestamp.toLocaleDateString()} {transaction.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};