import { Coins, Clock, Zap } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { formatCredits } from '@/lib/creditConfig';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreditBalanceProps {
  showProgress?: boolean;
  compact?: boolean;
}

export function CreditBalance({ showProgress = false, compact = false }: CreditBalanceProps) {
  const { balance, tier, nextResetTime, isLoading } = useCredits();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Coins className="h-4 w-4 animate-pulse" />
        <span className="animate-pulse">...</span>
      </div>
    );
  }

  const maxCredits = tier === 'free' ? 200 : 
    tier === 'lite' ? 15000 : 
    tier === 'pro' ? 50000 : 500000;
  
  const progressPercent = Math.min((balance / maxCredits) * 100, 100);
  const timeToReset = formatDistanceToNow(nextResetTime, { addSuffix: true });
  
  // Determine credit status for styling
  const isLow = balance < maxCredits * 0.2;
  const isCritical = balance < maxCredits * 0.1;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full cursor-default transition-all duration-300",
                isCritical 
                  ? "bg-destructive/20 text-destructive border border-destructive/30" 
                  : isLow 
                    ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30"
                    : "bg-primary/10 text-primary border border-primary/20"
              )}
            >
              <Zap className={cn(
                "h-3.5 w-3.5",
                isCritical && "animate-pulse"
              )} />
              <span className="text-sm font-semibold tabular-nums">{formatCredits(balance)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="font-semibold">{balance.toLocaleString()} credits</p>
              </div>
              
              <Progress 
                value={progressPercent} 
                className={cn(
                  "h-1.5",
                  isCritical && "[&>div]:bg-destructive",
                  isLow && !isCritical && "[&>div]:bg-yellow-500"
                )} 
              />
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Tier</p>
                  <p className="font-medium capitalize">{tier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resets</p>
                  <p className="font-medium">{timeToReset}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  💡 Chat: Free • 🖼️ Image: 50 • 🎬 Video: 200 • 🎵 Audio: 30
                </p>
              </div>
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
          <Zap className={cn(
            "h-5 w-5",
            isCritical ? "text-destructive" : isLow ? "text-yellow-500" : "text-primary"
          )} />
          <span className="font-semibold text-lg tabular-nums">{formatCredits(balance)}</span>
          <span className="text-sm text-muted-foreground">credits</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Resets {timeToReset}</span>
        </div>
      </div>
      
      {showProgress && (
        <Progress 
          value={progressPercent} 
          className={cn(
            "h-2",
            isCritical && "[&>div]:bg-destructive",
            isLow && !isCritical && "[&>div]:bg-yellow-500"
          )} 
        />
      )}
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="capitalize">{tier} Tier</span>
        <span>{balance.toLocaleString()} / {maxCredits === 500000 ? '∞' : maxCredits.toLocaleString()}</span>
      </div>
    </div>
  );
}
