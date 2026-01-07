import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditBalance } from './CreditBalance';
import { CreditHistory } from './CreditHistory';
import { CreditCosts } from './CreditCosts';
import { useCredits } from '@/hooks/useCredits';
import { FREE_TIER_DAILY_CREDITS, TIER_MONTHLY_CREDITS } from '@/lib/creditConfig';
import { RefreshCw, Sparkles, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CreditsDashboard() {
  const { tier, fetchCredits, isLoading } = useCredits();
  const navigate = useNavigate();

  const tierInfo = {
    free: {
      icon: <Zap className="h-5 w-5" />,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      allocation: `${FREE_TIER_DAILY_CREDITS} credits/day`,
      description: 'Daily credits reset at midnight UTC',
    },
    lite: {
      icon: <Sparkles className="h-5 w-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      allocation: `${TIER_MONTHLY_CREDITS.lite.toLocaleString()} credits/month`,
      description: 'Monthly allocation with rollover',
    },
    pro: {
      icon: <Crown className="h-5 w-5" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      allocation: `${TIER_MONTHLY_CREDITS.pro.toLocaleString()} credits/month`,
      description: 'High volume for power users',
    },
    max: {
      icon: <Crown className="h-5 w-5" />,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      allocation: `${TIER_MONTHLY_CREDITS.max.toLocaleString()} credits/month`,
      description: 'Effectively unlimited usage',
    },
  };

  const currentTierInfo = tierInfo[tier] || tierInfo.free;

  return (
    <div className="space-y-6">
      {/* Header with Balance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Credits</CardTitle>
            <CardDescription>Available balance for Wiser AI operations</CardDescription>
          </CardHeader>
          <CardContent>
            <CreditBalance showProgress />
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCredits()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {tier === 'free' && (
                <Button
                  size="sm"
                  onClick={() => navigate('/pricing')}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className={`p-1.5 rounded-md ${currentTierInfo.bgColor} ${currentTierInfo.color}`}>
                {currentTierInfo.icon}
              </span>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
            </CardTitle>
            <CardDescription>{currentTierInfo.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Allocation</span>
                <span className="font-medium">{currentTierInfo.allocation}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Reset Type</span>
                <span className="font-medium">{tier === 'free' ? 'Daily' : 'Monthly'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Costs Reference */}
      <CreditCosts />

      {/* Transaction History */}
      <CreditHistory />
    </div>
  );
}
