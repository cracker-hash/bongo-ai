import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Link as LinkIcon, 
  Unlink, 
  Mail, 
  HardDrive, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConnectedAccount {
  provider: string;
  account_email: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const providers = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Access and manage your Google Drive files',
    icon: HardDrive,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read and send emails through Gmail',
    icon: Mail,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
];

function ConnectedAccountsContent() {
  const { isAuthenticated, setShowAuthModal, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'list' },
      });

      if (error) throw error;
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const { provider } = JSON.parse(state);
      setConnectingProvider(provider);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({ title: 'Error', description: 'Please sign in first', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: {
          action: 'exchange_token',
          code,
          provider,
          redirect_uri: `${window.location.origin}/connected-accounts`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Account Connected',
        description: `Successfully connected ${data.email}`,
      });

      // Clear URL params and refresh
      navigate('/connected-accounts', { replace: true });
      fetchAccounts();
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setConnectingProvider(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAccounts();
    }
  }, [isAuthenticated, user, fetchAccounts]);

  const handleConnect = async (providerId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setConnectingProvider(providerId);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: {
          action: 'get_auth_url',
          provider: providerId,
          redirect_uri: `${window.location.origin}/connected-accounts`,
        },
      });

      if (error) throw error;

      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate connection. Please try again.',
        variant: 'destructive',
      });
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    try {
      const { error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'disconnect', provider: providerId },
      });

      if (error) throw error;

      toast({
        title: 'Account Disconnected',
        description: 'Successfully disconnected the account.',
      });

      fetchAccounts();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect account.',
        variant: 'destructive',
      });
    }
  };

  const getAccountForProvider = (providerId: string) => {
    return accounts.find(a => a.provider === providerId);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <LinkIcon className="h-20 w-20 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3">Connected Accounts</h2>
          <p className="text-muted-foreground mb-6">
            Sign in to connect your Google Drive, Gmail, and other services to Wiser AI.
          </p>
          <Button onClick={() => setShowAuthModal(true)} className="gradient-bg">
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/chat')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Connected Accounts</h1>
            <p className="text-muted-foreground">
              Manage your connected services and integrations
            </p>
          </div>
        </div>

        {/* Accounts List */}
        <div className="space-y-4">
          {providers.map((provider) => {
            const account = getAccountForProvider(provider.id);
            const isConnecting = connectingProvider === provider.id;
            const Icon = provider.icon;

            return (
              <Card key={provider.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`h-14 w-14 rounded-xl ${provider.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-7 w-7 ${provider.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{provider.name}</h3>
                        {account && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {provider.description}
                      </p>
                      {account && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {account.account_email}
                          </span>
                          <span>
                            Connected {format(new Date(account.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {account ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(provider.id)}
                            disabled={isConnecting}
                            className="gap-2"
                          >
                            <RefreshCw className={`h-4 w-4 ${isConnecting ? 'animate-spin' : ''}`} />
                            Reconnect
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                                <Unlink className="h-4 w-4" />
                                Disconnect
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Disconnect {provider.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove access to your {provider.name} account. You can reconnect anytime.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDisconnect(provider.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Disconnect
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleConnect(provider.id)}
                          disabled={isConnecting}
                          className="gap-2"
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LinkIcon className="h-4 w-4" />
                          )}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <Card className="mt-8 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              About Connected Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Connected accounts allow Wiser AI to access your files and services on your behalf. 
              Your credentials are securely stored and encrypted.
            </p>
            <p>
              You can disconnect any account at any time. Disconnecting will revoke Wiser AI's 
              access to that service.
            </p>
            <a 
              href="https://myaccount.google.com/permissions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Manage Google permissions <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ConnectedAccounts() {
  return (
    <AuthProvider>
      <ConnectedAccountsContent />
      <AuthModal />
    </AuthProvider>
  );
}
