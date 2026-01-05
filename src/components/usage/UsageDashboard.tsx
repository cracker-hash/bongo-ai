import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Activity, Zap, Mic, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getTierLimits, TierKey } from '@/lib/stripeConfig';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalPodcasts: number;
  dailyUsage: Array<{ date: string; requests: number; tokens: number }>;
}

interface UsageDashboardProps {
  currentTier?: TierKey;
}

export function UsageDashboard({ currentTier = 'free' }: UsageDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UsageStats>({
    totalRequests: 0,
    totalTokens: 0,
    totalPodcasts: 0,
    dailyUsage: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const limits = getTierLimits(currentTier);

  useEffect(() => {
    if (user) {
      fetchUsageStats();
    }
  }, [user]);

  const fetchUsageStats = async () => {
    try {
      // Get current month's start
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch usage logs
      const { data: logs, error } = await supabase
        .from('usage_logs')
        .select('*')
        .gte('created_at', monthStart)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process stats
      let totalRequests = 0;
      let totalTokens = 0;
      let totalPodcasts = 0;
      const dailyMap = new Map<string, { requests: number; tokens: number }>();

      (logs || []).forEach((log: any) => {
        totalRequests++;
        totalTokens += log.tokens_used || 0;
        if (log.action_type === 'podcast') totalPodcasts++;

        const date = new Date(log.created_at).toLocaleDateString();
        const existing = dailyMap.get(date) || { requests: 0, tokens: 0 };
        dailyMap.set(date, {
          requests: existing.requests + 1,
          tokens: existing.tokens + (log.tokens_used || 0),
        });
      });

      // Convert to array and fill in missing days
      const dailyUsage = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));

      setStats({ totalRequests, totalTokens, totalPodcasts, dailyUsage });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Unlimited';
    return limit.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usage Dashboard</h2>
          <p className="text-muted-foreground">Monitor your API usage and limits</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {limits.name} Plan
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              of {formatLimit(limits.requests)} this month
            </p>
            <Progress 
              value={getUsagePercentage(stats.totalRequests, limits.requests)} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              of {formatLimit(limits.tokens)} this month
            </p>
            <Progress 
              value={getUsagePercentage(stats.totalTokens, limits.tokens)} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Podcasts Generated</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPodcasts}</div>
            <p className="text-xs text-muted-foreground">
              of {formatLimit(limits.podcasts)} this month
            </p>
            <Progress 
              value={getUsagePercentage(stats.totalPodcasts, limits.podcasts)} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Usage Over Time
          </CardTitle>
          <CardDescription>Daily API requests this month</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.dailyUsage.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p>No usage data yet. Start making API calls!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  className="fill-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Limits</CardTitle>
          <CardDescription>Your current plan includes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{formatLimit(limits.requests)}</div>
              <div className="text-sm text-muted-foreground">API Requests/month</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{formatLimit(limits.tokens)}</div>
              <div className="text-sm text-muted-foreground">Tokens/month</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{formatLimit(limits.podcasts)}</div>
              <div className="text-sm text-muted-foreground">Podcasts/month</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
