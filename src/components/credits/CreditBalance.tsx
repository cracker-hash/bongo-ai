import { Coins, Clock } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { formatCredits } from '@/lib/creditConfig';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';

interface CreditBalanceProps {
  showProgress?: boolean;
  compact?: boolean;
}

export function CreditBalance({ showProgress = false, compact = false }: CreditBalanceProps) {
  const { balance, tier, nextResetTime, isLoading } = useCredits();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Coins className="h-4 w-4" />
        <span className="animate-pulse">...</span>
      </div>
    );
  }

  const maxCredits = tier === 'free' ? 200 : 
    tier === 'lite' ? 15000 : 
    tier === 'pro' ? 50000 : 500000;
  
  const progressPercent = Math.min((balance / maxCredits) * 100, 100);
  const timeToReset = formatDistanceToNow(nextResetTime, { addSuffix: true });

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary cursor-default">
              <Coins className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">{formatCredits(balance)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{balance.toLocaleString()} credits available</p>
              <p className="text-xs text-muted-foreground">
                {tier === 'free' ? 'Daily reset' : 'Monthly allocation'} {timeToReset}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {tier} tier
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">{formatCredits(balance)}</span>
          <span className="text-sm text-muted-foreground">credits</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Resets {timeToReset}</span>
        </div>
      </div>
      
      {showProgress && (
        <Progress value={progressPercent} className="h-2" />
      )}
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="capitalize">{tier} Tier</span>
        <span>{balance.toLocaleString()} / {maxCredits === 500000 ? '∞' : maxCredits.toLocaleString()}</span>
      </div>
    </div>
  );
}
