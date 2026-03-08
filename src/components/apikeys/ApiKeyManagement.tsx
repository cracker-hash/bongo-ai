import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Eye, EyeOff, Key, Plus, Trash2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  key_name: string;
  api_key: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  requests_count: number;
  rate_limit: number;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  { id: 'chat', label: 'Chat', description: 'Chat completions' },
  { id: 'images', label: 'Images', description: 'Image generation' },
  { id: 'audio', label: 'Audio', description: 'Text to speech' },
  { id: 'podcast', label: 'Podcast', description: 'Podcast generation' },
  { id: 'documents', label: 'Documents', description: 'Document analysis' },
  { id: 'automation', label: 'Automation', description: 'Task automation' },
];

export function ApiKeyManagement() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['chat']);
  const [isCreating, setIsCreating] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys((data || []) as ApiKey[]);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'wsr_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const createApiKey = async () => {
    if (!user || !newKeyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    setIsCreating(true);
    try {
      const newKey = generateApiKey();
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_name: newKeyName.trim(),
          api_key: newKey,
          permissions: selectedPermissions,
          rate_limit: 100,
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys([data as ApiKey, ...apiKeys]);
      setNewKeyName('');
      setSelectedPermissions(['chat']);
      setVisibleKeys(new Set([data.id]));
      toast.success('API key created! Make sure to copy it now.');
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id);
      if (error) throw error;
      setApiKeys(apiKeys.filter(k => k.id !== id));
      toast.success('API key deleted');
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (id: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(id)) newVisible.delete(id);
    else newVisible.add(id);
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const maskKey = (key: string) => key.substring(0, 8) + '••••••••••••••••••••••••';

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Create New API Key
          </CardTitle>
          <CardDescription>
            Generate a new API key for accessing the WISER API Gateway
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="keyName" className="sr-only">Key Name</Label>
              <Input
                id="keyName"
                placeholder="Enter key name (e.g., Production, Development)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
              />
            </div>
            <Button onClick={createApiKey} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </div>

          {/* Permissions */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4" />
              Permissions
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedPermissions.includes(perm.id)}
                    onCheckedChange={() => togglePermission(perm.id)}
                  />
                  <div>
                    <div className="text-sm font-medium">{perm.label}</div>
                    <div className="text-xs text-muted-foreground">{perm.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Manage your existing API keys. Use them with the API Gateway endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{key.key_name}</span>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {(key.permissions || ['chat']).map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                    <div className="font-mono text-sm text-muted-foreground">
                      {visibleKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Created {new Date(key.created_at).toLocaleDateString()} • {key.requests_count} requests
                      {key.rate_limit ? ` • ${key.rate_limit} req/min limit` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => toggleKeyVisibility(key.id)}>
                      {visibleKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.api_key)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteApiKey(key.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
