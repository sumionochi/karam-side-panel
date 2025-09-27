import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserAvatar } from './UserAvatar';
import { KarmaDisplay } from './KarmaDisplay';
import { User } from '@/types/karma';
import { Slider } from '@/components/ui/slider';

interface KarmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  type: 'give' | 'slash';
  onSubmit: (amount: number, reason: string) => Promise<void>;
  maxAmount: number;
}

export const KarmaModal = ({ 
  isOpen, 
  onClose, 
  user, 
  type, 
  onSubmit, 
  maxAmount 
}: KarmaModalProps) => {
  const [amount, setAmount] = useState([1]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (amount[0] <= 0 || amount[0] > maxAmount) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(amount[0], reason);
      onClose();
      setAmount([1]);
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGive = type === 'give';
  const title = isGive ? 'Give Karma' : 'Slash Karma';
  const buttonText = isGive ? 'Send Karma' : 'Slash Karma';
  const slashCost = isGive ? 0 : Math.ceil(amount[0] / 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            {isGive ? '💫' : '⚡'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <UserAvatar user={user} size="sm" />
            <div>
              <p className="font-semibold text-sm">
                {user.ensName || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`}
              </p>
              <KarmaDisplay karma={user.karma} size="sm" showLabel={false} />
            </div>
          </div>
          
          {/* Amount selection */}
          <div className="space-y-2">
            <Label>Amount ({isGive ? 'max 5' : 'max 5'} per day)</Label>
            <Slider
              value={amount}
              onValueChange={setAmount}
              max={Math.min(maxAmount, 5)}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span className="font-semibold">{amount[0]}</span>
              <span>{Math.min(maxAmount, 5)}</span>
            </div>
          </div>
          
          {/* Slash cost warning */}
          {!isGive && (
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive">
                ⚠️ Slashing costs you {slashCost} karma (1/5th of slashed amount)
              </p>
            </div>
          )}
          
          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder={isGive ? "Why are you giving karma?" : "Why are you slashing karma?"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={amount[0] <= 0 || amount[0] > maxAmount || isSubmitting}
              className={isGive ? 'bg-karma-positive hover:bg-karma-positive/90 flex-1' : 'bg-karma-negative hover:bg-karma-negative/90 flex-1'}
            >
              {isSubmitting ? 'Processing...' : buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};