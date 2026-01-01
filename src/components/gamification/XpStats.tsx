// XP Stats Display Component
import { useGamification } from '@/hooks/useGamification';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Star, Trophy, Zap } from 'lucide-react';

export function XpStats() {
  const { 
    xp, 
    level, 
    streakDays, 
    getProgress, 
    getUserBadges,
    xpForNextLevel,
    isLoading 
  } = useGamification();

  const badges = getUserBadges();
  const progress = getProgress();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg animate-pulse">
        <div className="h-4 w-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
        {/* Level Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span className="absolute -top-1 -right-1 text-[10px] font-bold text-amber-400">
                  {level}
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Level {level}</p>
            <p className="text-xs text-muted-foreground">
              {xp} / {xpForNextLevel} XP to next level
            </p>
          </TooltipContent>
        </Tooltip>

        {/* XP Progress */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 flex-1 min-w-[80px]">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-xs font-medium text-muted-foreground">
                {xp}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{Math.round(progress)}% to Level {level + 1}</p>
          </TooltipContent>
        </Tooltip>

        {/* Streak */}
        {streakDays > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-orange-400">
                <Flame className="h-4 w-4" />
                <span className="text-xs font-bold">{streakDays}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{streakDays} day streak! 🔥</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Badges Preview */}
        {badges.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5">
                {badges.slice(0, 3).map((badge, i) => (
                  <span key={badge.id} className="text-sm" style={{ marginLeft: i > 0 ? -4 : 0 }}>
                    {badge.icon}
                  </span>
                ))}
                {badges.length > 3 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    +{badges.length - 3}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{badges.length} Badges Earned</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {badges.map(badge => (
                  <span key={badge.id} title={badge.name}>
                    {badge.icon}
                  </span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
