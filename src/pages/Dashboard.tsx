import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { ApiKeyManagement } from '@/components/apikeys/ApiKeyManagement';
import { UsageDashboard } from '@/components/usage/UsageDashboard';
import { AuthModal } from '@/components/auth/AuthModal';
import { Key, BarChart3, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getTierByProductId, TierKey } from '@/lib/stripeConfig';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

function DashboardContent() {
  const { isAuthenticated, user } = useAuth();
  const [currentTier, setCurrentTier] = useState<TierKey>('free');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      if (data?.product_id) {
        setCurrentTier(getTierByProductId(data.product_id));
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to access the dashboard.</p>
        </div>
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="pt-20 px-4 pb-8 max-w-6xl mx-auto">
        <Tabs defaultValue="usage" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="usage" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="apikeys" className="gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" onClick={() => navigate('/pricing')} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Manage Subscription
            </Button>
          </div>

          <TabsContent value="usage">
            <UsageDashboard currentTier={currentTier} />
          </TabsContent>

          <TabsContent value="apikeys">
            <ApiKeyManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
