import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Brain, Code, Copy, Check, Key, Zap, ArrowLeft,
  MessageSquare, Image, FileText, Mic, Bot, Search,
  ChevronRight, ExternalLink, BookOpen, Eye, EyeOff,
  Plus, Trash2, RefreshCw, Shield, Globe, Terminal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const endpoints = [
  {
    method: 'POST',
    path: '/v1/chat/completions',
    name: 'Chat Completions',
    description: 'Generate conversational responses with context awareness',
    icon: MessageSquare,
    category: 'Core',
    requestBody: {
      model: 'wiser-pro',
      messages: [{ role: 'user', content: 'Hello!' }],
      stream: false
    },
    responseExample: {
      id: 'chatcmpl-abc123',
      object: 'chat.completion',
      choices: [{ message: { role: 'assistant', content: 'Hello! How can I help you?' } }]
    }
  },
  {
    method: 'POST',
    path: '/v1/images/generate',
    name: 'Image Generation',
    description: 'Generate images from text descriptions using DALL-E',
    icon: Image,
    category: 'Media',
    requestBody: {
      prompt: 'A beautiful sunset over mountains',
      size: '1024x1024',
      quality: 'hd'
    },
    responseExample: {
      created: 1699000000,
      data: [{ url: 'https://api.wiser.ai/images/generated/abc123.png' }]
    }
  },
  {
    method: 'POST',
    path: '/v1/documents/analyze',
    name: 'Document Analysis',
    description: 'Extract and analyze text from PDFs and documents',
    icon: FileText,
    category: 'Core'
  },
  {
    method: 'POST',
    path: '/v1/audio/tts',
    name: 'Text to Speech',
    description: 'Convert text to natural-sounding speech',
    icon: Mic,
    category: 'Media'
  },
  {
    method: 'POST',
    path: '/v1/podcast/generate',
    name: 'Podcast Generator',
    description: 'Create full podcast episodes from text content',
    icon: Mic,
    category: 'Media'
  },
  {
    method: 'POST',
    path: '/v1/manus/execute',
    name: 'Manus Automation',
    description: 'Execute automated tasks with the Manus agent',
    icon: Bot,
    category: 'Automation'
  },
  {
    method: 'POST',
    path: '/v1/study/plan',
    name: 'Study Plan',
    description: 'Generate personalized study plans from materials',
    icon: BookOpen,
    category: 'Education'
  },
  {
    method: 'POST',
    path: '/v1/quiz/generate',
    name: 'Quiz Generation',
    description: 'Create quizzes from study materials',
    icon: FileText,
    category: 'Education'
  }
];

const pricingTiers = [
  { name: 'Free', requests: '1,000', price: '$0/mo', tokens: '10K' },
  { name: 'Lite', requests: '5,000', price: '$20/mo', tokens: '100K' },
  { name: 'Pro', requests: '25,000', price: '$40/mo', tokens: '500K' },
  { name: 'Max', requests: 'Unlimited', price: '$200/mo', tokens: 'Unlimited' }
];

const API_BASE_URL = 'https://gbbqdmgrjtdliiddikwq.supabase.co/functions/v1';

const codeExamples = {
  curl: `curl -X POST "${API_BASE_URL}/chat" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "wiser-pro",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain quantum computing in simple terms."}
    ],
    "stream": true
  }'`,
  javascript: `// Using Fetch API
const response = await fetch('${API_BASE_URL}/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'wiser-pro',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain quantum computing in simple terms.' }
    ],
    stream: false
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`,
  nodejs: `const https = require('https');

const options = {
  hostname: 'gbbqdmgrjtdliiddikwq.supabase.co',
  path: '/functions/v1/chat',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log(result.choices[0].message.content);
  });
});

req.write(JSON.stringify({
  model: 'wiser-pro',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing.' }
  ]
}));

req.end();`,
  express: `const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const WISER_API_KEY = process.env.WISER_API_KEY;
const API_URL = '${API_BASE_URL}/chat';

// Proxy endpoint for WISER AI
app.post('/api/chat', async (req, res) => {
  try {
    const response = await axios.post(API_URL, {
      model: 'wiser-pro',
      messages: req.body.messages,
      stream: false
    }, {
      headers: {
        'Authorization': \`Bearer \${WISER_API_KEY}\`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));`,
  php: `<?php

$apiKey = 'YOUR_API_KEY';
$apiUrl = '${API_BASE_URL}/chat';

$data = [
    'model' => 'wiser-pro',
    'messages' => [
        ['role' => 'system', 'content' => 'You are a helpful assistant.'],
        ['role' => 'user', 'content' => 'Explain quantum computing.']
    ],
    'stream' => false
];

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($data)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    echo $result['choices'][0]['message']['content'];
} else {
    echo "Error: " . $response;
}
?>`,
  java: `import java.net.http.*;
import java.net.URI;

public class WiserAIClient {
    private static final String API_KEY = "YOUR_API_KEY";
    private static final String API_URL = "${API_BASE_URL}/chat";
    
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        
        String jsonBody = """
            {
                "model": "wiser-pro",
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "Explain quantum computing."}
                ],
                "stream": false
            }
            """;
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(API_URL))
            .header("Authorization", "Bearer " + API_KEY)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();
        
        HttpResponse<String> response = client.send(request, 
            HttpResponse.BodyHandlers.ofString());
        
        System.out.println(response.body());
    }
}`
};

const webhookExamples = {
  javascript: `// Express.js Webhook Handler
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.raw({ type: 'application/json' }));

const WEBHOOK_SECRET = process.env.WISER_WEBHOOK_SECRET;

app.post('/webhook/wiser', (req, res) => {
  const signature = req.headers['x-wiser-signature'];
  const timestamp = req.headers['x-wiser-timestamp'];
  
  // Verify webhook signature
  const payload = timestamp + '.' + req.body.toString();
  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSig) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = JSON.parse(req.body);
  
  switch (event.type) {
    case 'usage.limit_reached':
      console.log('User reached usage limit:', event.data);
      break;
    case 'subscription.updated':
      console.log('Subscription updated:', event.data);
      break;
    case 'task.completed':
      console.log('Manus task completed:', event.data);
      break;
  }
  
  res.json({ received: true });
});

app.listen(3000);`,
  php: `<?php
// PHP Webhook Handler

$webhookSecret = getenv('WISER_WEBHOOK_SECRET');
$signature = $_SERVER['HTTP_X_WISER_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_WISER_TIMESTAMP'] ?? '';
$payload = file_get_contents('php://input');

// Verify signature
$expectedSig = hash_hmac('sha256', $timestamp . '.' . $payload, $webhookSecret);

if (!hash_equals($expectedSig, $signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

$event = json_decode($payload, true);

switch ($event['type']) {
    case 'usage.limit_reached':
        // Handle usage limit
        error_log('Usage limit reached: ' . json_encode($event['data']));
        break;
    case 'subscription.updated':
        // Handle subscription update
        error_log('Subscription updated: ' . json_encode($event['data']));
        break;
    case 'task.completed':
        // Handle Manus task completion
        error_log('Task completed: ' . json_encode($event['data']));
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);
?>`
};

interface ApiKey {
  id: string;
  key_name: string;
  api_key: string;
  created_at: string;
  is_active: boolean;
  requests_count: number;
}

function ApiKeyGenerator() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!user || !newKeyName.trim()) {
      toast({ title: 'Please enter a key name', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const keyValue = `wsk_${crypto.randomUUID().replace(/-/g, '')}`;
      
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_name: newKeyName.trim(),
          api_key: keyValue,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys([data, ...apiKeys]);
      setNewKeyName('');
      setShowKeys({ ...showKeys, [data.id]: true });
      toast({ title: 'API key generated successfully!' });
    } catch (error: any) {
      toast({ title: 'Failed to generate key', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setApiKeys(apiKeys.filter(k => k.id !== id));
      toast({ title: 'API key deleted' });
    } catch (error: any) {
      toast({ title: 'Failed to delete key', variant: 'destructive' });
    }
  };

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    toast({ title: 'API key copied to clipboard' });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys({ ...showKeys, [id]: !showKeys[id] });
  };

  if (!isAuthenticated) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6 text-center">
          <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Sign in to generate API keys</h3>
          <p className="text-muted-foreground mb-4">Create an account to get your production-ready API keys.</p>
          <Button onClick={() => navigate('/chat')} className="bg-gradient-to-r from-primary to-secondary">
            Sign In / Register
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Your API Keys
            </CardTitle>
            <CardDescription>Generate and manage your production API keys</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchApiKeys} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate New Key */}
        <div className="flex gap-2">
          <Input
            placeholder="Key name (e.g., Production, Development)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={generateApiKey} disabled={isLoading || !newKeyName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Generate
          </Button>
        </div>

        {/* API Keys List */}
        <div className="space-y-3">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Terminal className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No API keys yet. Generate your first key above.</p>
            </div>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{key.key_name}</span>
                    <Badge variant={key.is_active ? 'default' : 'secondary'} className="text-xs">
                      {key.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <code className="text-sm text-muted-foreground font-mono">
                    {showKeys[key.id] ? key.api_key : `wsk_${'•'.repeat(32)}`}
                  </code>
                  <div className="text-xs text-muted-foreground mt-1">
                    {key.requests_count} requests • Created {new Date(key.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => toggleKeyVisibility(key.id)}>
                    {showKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.api_key, key.id)}>
                    {copiedKey === key.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteApiKey(key.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ApiDocsContent() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="h-6 w-px bg-border" />
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold">WISER AI</span>
              <Badge variant="secondary" className="ml-2">API</Badge>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <Key className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-20 flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 fixed left-0 top-20 bottom-0 border-r border-border bg-card/50 p-6 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Getting Started</h3>
              <ul className="space-y-2">
                <li><a href="#introduction" className="text-sm text-foreground hover:text-primary">Introduction</a></li>
                <li><a href="#api-keys" className="text-sm text-muted-foreground hover:text-primary">API Keys</a></li>
                <li><a href="#authentication" className="text-sm text-muted-foreground hover:text-primary">Authentication</a></li>
                <li><a href="#quickstart" className="text-sm text-muted-foreground hover:text-primary">Quickstart</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Code Examples</h3>
              <ul className="space-y-2">
                <li><a href="#javascript" className="text-sm text-muted-foreground hover:text-primary">JavaScript</a></li>
                <li><a href="#nodejs" className="text-sm text-muted-foreground hover:text-primary">Node.js</a></li>
                <li><a href="#express" className="text-sm text-muted-foreground hover:text-primary">Express.js</a></li>
                <li><a href="#php" className="text-sm text-muted-foreground hover:text-primary">PHP</a></li>
                <li><a href="#java" className="text-sm text-muted-foreground hover:text-primary">Java</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Endpoints</h3>
              <ul className="space-y-2">
                {endpoints.map((endpoint, i) => (
                  <li key={i}>
                    <a href={`#${endpoint.path.replace(/\//g, '-')}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1">{endpoint.method}</Badge>
                      {endpoint.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Webhooks</h3>
              <ul className="space-y-2">
                <li><a href="#webhooks" className="text-sm text-muted-foreground hover:text-primary">Webhook Events</a></li>
                <li><a href="#webhook-security" className="text-sm text-muted-foreground hover:text-primary">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pricing</h3>
              <ul className="space-y-2">
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary">Plans & Limits</a></li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-6 lg:p-12">
          <div className="max-w-4xl mx-auto">
            {/* Hero */}
            <section id="introduction" className="mb-16">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">WISER AI API</h1>
                  <p className="text-muted-foreground">Build powerful AI applications with our comprehensive API</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <Zap className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Fast & Reliable</h3>
                    <p className="text-sm text-muted-foreground">99.9% uptime with global edge deployment</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <Shield className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Production Ready</h3>
                    <p className="text-sm text-muted-foreground">Enterprise-grade security and scaling</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <Globe className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Multi-Language</h3>
                    <p className="text-sm text-muted-foreground">SDKs for PHP, JS, Java, Node.js & more</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* API Keys Generator */}
            <section id="api-keys" className="mb-16">
              <h2 className="text-2xl font-bold mb-4">API Keys</h2>
              <p className="text-muted-foreground mb-6">
                Generate production-ready API keys to authenticate your requests. Keep your keys secure and never expose them in client-side code.
              </p>
              <ApiKeyGenerator />
            </section>

            {/* Authentication */}
            <section id="authentication" className="mb-16">
              <h2 className="text-2xl font-bold mb-4">Authentication</h2>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">
                    All API requests require a valid API key. Include your key in the <code className="bg-muted px-1.5 py-0.5 rounded text-sm">Authorization</code> header:
                  </p>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm relative">
                    <code>Authorization: Bearer wsk_your_api_key_here</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => copyToClipboard('Authorization: Bearer wsk_your_api_key_here', 'auth')}
                    >
                      {copiedCode === 'auth' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Code Examples */}
            <section id="quickstart" className="mb-16">
              <h2 className="text-2xl font-bold mb-4">Code Examples</h2>
              <p className="text-muted-foreground mb-6">
                Ready-to-use code examples in multiple languages. Copy and paste into your project.
              </p>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <Tabs defaultValue="javascript" className="w-full">
                    <TabsList className="mb-4 flex-wrap h-auto gap-1">
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                      <TabsTrigger value="javascript" id="javascript">JavaScript</TabsTrigger>
                      <TabsTrigger value="nodejs" id="nodejs">Node.js</TabsTrigger>
                      <TabsTrigger value="express" id="express">Express</TabsTrigger>
                      <TabsTrigger value="php" id="php">PHP</TabsTrigger>
                      <TabsTrigger value="java" id="java">Java</TabsTrigger>
                    </TabsList>
                    {Object.entries(codeExamples).map(([lang, code]) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="bg-muted rounded-lg p-4 font-mono text-sm relative overflow-x-auto max-h-[500px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{code}</pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 bg-muted"
                            onClick={() => copyToClipboard(code, lang)}
                          >
                            {copiedCode === lang ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* Endpoints */}
            <section id="endpoints" className="mb-16">
              <h2 className="text-2xl font-bold mb-6">API Endpoints</h2>
              <div className="space-y-4">
                {endpoints.map((endpoint, i) => (
                  <Card key={i} id={endpoint.path.replace(/\//g, '-')} className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <endpoint.icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                          <Badge variant="secondary">{endpoint.category}</Badge>
                        </div>
                        <Badge variant={endpoint.method === 'POST' ? 'default' : 'outline'} className="font-mono">
                          {endpoint.method}
                        </Badge>
                      </div>
                      <CardDescription>{endpoint.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted rounded-lg p-3 font-mono text-sm flex items-center justify-between">
                        <code>{API_BASE_URL}{endpoint.path}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(`${API_BASE_URL}${endpoint.path}`, endpoint.path)}
                        >
                          {copiedCode === endpoint.path ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Webhooks */}
            <section id="webhooks" className="mb-16">
              <h2 className="text-2xl font-bold mb-4">Webhooks</h2>
              <p className="text-muted-foreground mb-6">
                Receive real-time notifications when events happen in your WISER AI integration.
              </p>
              
              <div className="space-y-4 mb-8">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Available Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { event: 'usage.limit_reached', desc: 'Triggered when user reaches usage limit' },
                        { event: 'subscription.updated', desc: 'Subscription plan changed or renewed' },
                        { event: 'task.completed', desc: 'Manus automation task completed' },
                        { event: 'podcast.generated', desc: 'Podcast generation finished' },
                        { event: 'document.analyzed', desc: 'Document analysis completed' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <code className="text-sm font-mono text-primary">{item.event}</code>
                          <span className="text-sm text-muted-foreground">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card/50 border-border/50" id="webhook-security">
                <CardHeader>
                  <CardTitle className="text-lg">Webhook Handler Examples</CardTitle>
                  <CardDescription>Secure webhook handlers with signature verification</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="javascript" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="javascript">Express.js</TabsTrigger>
                      <TabsTrigger value="php">PHP</TabsTrigger>
                    </TabsList>
                    {Object.entries(webhookExamples).map(([lang, code]) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="bg-muted rounded-lg p-4 font-mono text-sm relative overflow-x-auto max-h-[400px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{code}</pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 bg-muted"
                            onClick={() => copyToClipboard(code, `webhook-${lang}`)}
                          >
                            {copiedCode === `webhook-${lang}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* Pricing */}
            <section id="pricing" className="mb-16">
              <h2 className="text-2xl font-bold mb-6">Pricing & Limits</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricingTiers.map((tier, i) => (
                  <Card key={i} className="bg-card/50 border-border/50 text-center">
                    <CardHeader>
                      <CardTitle>{tier.name}</CardTitle>
                      <div className="text-2xl font-bold text-primary">{tier.price}</div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Requests/month</div>
                        <div className="font-semibold">{tier.requests}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Tokens/month</div>
                        <div className="font-semibold">{tier.tokens}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="text-center py-12 px-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4">Ready to build?</h2>
              <p className="text-muted-foreground mb-6">Get your API key and start building in minutes.</p>
              <div className="flex items-center justify-center gap-4">
                <Link to="/pricing">
                  <Button size="lg" variant="outline">
                    View Pricing
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-secondary">
                    Go to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ApiDocs() {
  return (
    <AuthProvider>
      <ApiDocsContent />
    </AuthProvider>
  );
}
