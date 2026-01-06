import { useState, useEffect } from 'react';
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
  Plus, Trash2, RefreshCw, Shield, Globe, Terminal,
  Webhook, Lock, Activity, Server, Database, Clock,
  AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import wiserLogo from '@/assets/wiser-ai-logo.png';

const API_BASE_URL = 'https://api.wiser.ai/v1';
const SUPABASE_FUNCTIONS_URL = 'https://gbbqdmgrjtdliiddikwq.supabase.co/functions/v1';

const endpoints = [
  {
    method: 'POST',
    path: '/chat/completions',
    name: 'Chat Completions',
    description: 'Generate conversational responses with context awareness and streaming support',
    icon: MessageSquare,
    category: 'Core',
    rateLimit: '1000 req/min',
    requestBody: {
      model: 'wiser-pro',
      messages: [{ role: 'user', content: 'Hello!' }],
      stream: false,
      temperature: 0.7,
      max_tokens: 2048
    },
    responseExample: {
      id: 'chatcmpl-abc123',
      object: 'chat.completion',
      created: 1699000000,
      model: 'wiser-pro',
      choices: [{ 
        index: 0,
        message: { role: 'assistant', content: 'Hello! How can I help you today?' },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
    }
  },
  {
    method: 'POST',
    path: '/images/generate',
    name: 'Image Generation',
    description: 'Generate high-quality images from text descriptions using state-of-the-art models',
    icon: Image,
    category: 'Media',
    rateLimit: '100 req/min',
    requestBody: {
      prompt: 'A beautiful sunset over African savanna',
      size: '1024x1024',
      quality: 'hd',
      style: 'natural'
    },
    responseExample: {
      created: 1699000000,
      data: [{ 
        url: 'https://api.wiser.ai/images/generated/abc123.png',
        revised_prompt: 'A stunning sunset over the African savanna with golden light'
      }]
    }
  },
  {
    method: 'POST',
    path: '/documents/analyze',
    name: 'Document Analysis',
    description: 'Extract text, analyze structure, and generate insights from PDFs and documents',
    icon: FileText,
    category: 'Core',
    rateLimit: '500 req/min'
  },
  {
    method: 'POST',
    path: '/audio/tts',
    name: 'Text to Speech',
    description: 'Convert text to natural-sounding speech in multiple languages and voices',
    icon: Mic,
    category: 'Media',
    rateLimit: '200 req/min'
  },
  {
    method: 'POST',
    path: '/podcast/generate',
    name: 'Podcast Generator',
    description: 'Create full podcast episodes with AI-generated scripts and professional voices',
    icon: Mic,
    category: 'Media',
    rateLimit: '50 req/min'
  },
  {
    method: 'POST',
    path: '/automation/execute',
    name: 'Wiser Automation',
    description: 'Execute complex automated workflows with browser interaction and tool orchestration',
    icon: Bot,
    category: 'Automation',
    rateLimit: '100 req/min'
  },
  {
    method: 'POST',
    path: '/education/study-plan',
    name: 'Study Plan Generator',
    description: 'Generate personalized study plans from materials with adaptive learning paths',
    icon: BookOpen,
    category: 'Education',
    rateLimit: '200 req/min'
  },
  {
    method: 'POST',
    path: '/education/quiz',
    name: 'Quiz Generation',
    description: 'Create interactive quizzes with multiple question types from any content',
    icon: FileText,
    category: 'Education',
    rateLimit: '200 req/min'
  },
  {
    method: 'POST',
    path: '/webhooks/register',
    name: 'Register Webhook',
    description: 'Register a webhook endpoint to receive real-time event notifications',
    icon: Webhook,
    category: 'Webhooks',
    rateLimit: '100 req/min'
  }
];

const pricingTiers = [
  { name: 'Free', requests: '1,000', price: '$0/mo', tokens: '10K', support: 'Community' },
  { name: 'Lite', requests: '10,000', price: '$20/mo', tokens: '100K', support: 'Email' },
  { name: 'Pro', requests: '100,000', price: '$40/mo', tokens: '500K', support: 'Priority' },
  { name: 'Max', requests: 'Unlimited', price: '$200/mo', tokens: 'Unlimited', support: '24/7 Dedicated' }
];

const codeExamples = {
  curl: `# WISER AI - Chat Completion Example
# Replace YOUR_API_KEY with your actual API key

curl -X POST "${SUPABASE_FUNCTIONS_URL}/chat" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Request-ID: $(uuidgen)" \\
  -d '{
    "model": "wiser-pro",
    "messages": [
      {"role": "system", "content": "You are a helpful AI assistant."},
      {"role": "user", "content": "Explain quantum computing in simple terms."}
    ],
    "temperature": 0.7,
    "max_tokens": 2048,
    "stream": true
  }'

# Response will be streamed as Server-Sent Events (SSE)`,
  javascript: `// WISER AI SDK - JavaScript/TypeScript
// Install: npm install @wiser-ai/sdk

import { WiserAI } from '@wiser-ai/sdk';

// Initialize the client
const wiser = new WiserAI({
  apiKey: process.env.WISER_API_KEY,
  baseURL: '${SUPABASE_FUNCTIONS_URL}'
});

// Chat completion with streaming
async function chat() {
  const response = await wiser.chat.completions.create({
    model: 'wiser-pro',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain quantum computing in simple terms.' }
    ],
    temperature: 0.7,
    max_tokens: 2048,
    stream: true
  });

  // Handle streaming response
  for await (const chunk of response) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

// Non-streaming usage with fetch
async function chatWithFetch() {
  const response = await fetch('${SUPABASE_FUNCTIONS_URL}/chat', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${process.env.WISER_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'wiser-pro',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Explain quantum computing.' }
      ],
      stream: false
    })
  });

  const data = await response.json();
  console.log(data.choices[0].message.content);
}

chat().catch(console.error);`,
  nodejs: `// WISER AI - Node.js Integration
// Production-ready implementation with error handling

const https = require('https');
const { promisify } = require('util');

class WiserAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = '${SUPABASE_FUNCTIONS_URL}';
  }

  async chat(messages, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(\`\${this.baseURL}/chat\`);
      
      const payload = JSON.stringify({
        model: options.model || 'wiser-pro',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2048,
        stream: false
      });

      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.apiKey}\`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(result.error || 'API request failed'));
            } else {
              resolve(result);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}

// Usage
const client = new WiserAIClient(process.env.WISER_API_KEY);

async function main() {
  const response = await client.chat([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing.' }
  ]);
  
  console.log(response.choices[0].message.content);
}

main().catch(console.error);`,
  express: `// WISER AI - Express.js Middleware & Routes
// Production-ready API proxy with rate limiting and caching

const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const app = express();
app.use(express.json());

// Configuration
const WISER_API_KEY = process.env.WISER_API_KEY;
const API_URL = '${SUPABASE_FUNCTIONS_URL}';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Response caching
const cache = new NodeCache({ stdTTL: 300 });

// Middleware for API key validation
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  // Add your API key validation logic here
  next();
};

// Chat endpoint with caching
app.post('/api/chat', limiter, validateApiKey, async (req, res) => {
  try {
    const cacheKey = JSON.stringify(req.body);
    const cached = cache.get(cacheKey);
    
    if (cached && !req.body.stream) {
      return res.json(cached);
    }

    const response = await axios.post(\`\${API_URL}/chat\`, {
      model: 'wiser-pro',
      messages: req.body.messages,
      temperature: req.body.temperature || 0.7,
      max_tokens: req.body.max_tokens || 2048,
      stream: false
    }, {
      headers: {
        'Authorization': \`Bearer \${WISER_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Cache non-streaming responses
    if (!req.body.stream) {
      cache.set(cacheKey, response.data);
    }

    res.json(response.data);
  } catch (error) {
    console.error('WISER API Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Internal server error'
    });
  }
});

// Webhook receiver
app.post('/webhooks/wiser', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-wiser-signature'];
  // Verify signature and process webhook
  console.log('Webhook received:', JSON.parse(req.body));
  res.json({ received: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`WISER AI Proxy running on port \${PORT}\`);
});`,
  php: `<?php
/**
 * WISER AI - PHP SDK
 * Production-ready PHP client with PSR-7 compatibility
 */

namespace WiserAI;

class Client {
    private string $apiKey;
    private string $baseUrl = '${SUPABASE_FUNCTIONS_URL}';
    private int $timeout = 30;

    public function __construct(string $apiKey) {
        $this->apiKey = $apiKey;
    }

    /**
     * Send a chat completion request
     */
    public function chat(array $messages, array $options = []): array {
        $payload = [
            'model' => $options['model'] ?? 'wiser-pro',
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.7,
            'max_tokens' => $options['max_tokens'] ?? 2048,
            'stream' => false
        ];

        return $this->request('POST', '/chat', $payload);
    }

    /**
     * Generate an image from text
     */
    public function generateImage(string $prompt, array $options = []): array {
        return $this->request('POST', '/images/generate', [
            'prompt' => $prompt,
            'size' => $options['size'] ?? '1024x1024',
            'quality' => $options['quality'] ?? 'hd'
        ]);
    }

    private function request(string $method, string $endpoint, array $data): array {
        $ch = curl_init($this->baseUrl . $endpoint);
        
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json',
                'Accept: application/json',
                'X-Request-ID: ' . $this->generateRequestId()
            ],
            CURLOPT_POSTFIELDS => json_encode($data)
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \\Exception("cURL Error: $error");
        }

        $result = json_decode($response, true);

        if ($httpCode >= 400) {
            throw new \\Exception($result['error'] ?? 'API request failed', $httpCode);
        }

        return $result;
    }

    private function generateRequestId(): string {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}

// Usage Example
$wiser = new Client(getenv('WISER_API_KEY'));

try {
    $response = $wiser->chat([
        ['role' => 'system', 'content' => 'You are a helpful assistant.'],
        ['role' => 'user', 'content' => 'Explain quantum computing.']
    ]);

    echo $response['choices'][0]['message']['content'];
} catch (\\Exception $e) {
    error_log('WISER API Error: ' . $e->getMessage());
}`,
  java: `// WISER AI - Java SDK
// Production-ready Java client with async support

import java.net.http.*;
import java.net.URI;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

public class WiserAIClient {
    private static final String BASE_URL = "${SUPABASE_FUNCTIONS_URL}";
    private final String apiKey;
    private final HttpClient httpClient;
    private final Gson gson;

    public WiserAIClient(String apiKey) {
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.gson = new Gson();
    }

    public record Message(String role, String content) {}
    
    public record ChatRequest(
        String model,
        Message[] messages,
        double temperature,
        int max_tokens,
        boolean stream
    ) {}

    public CompletableFuture<JsonObject> chat(Message[] messages) {
        return chat(messages, 0.7, 2048);
    }

    public CompletableFuture<JsonObject> chat(
        Message[] messages, 
        double temperature, 
        int maxTokens
    ) {
        var request = new ChatRequest(
            "wiser-pro", 
            messages, 
            temperature, 
            maxTokens, 
            false
        );

        String jsonBody = gson.toJson(request);

        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/chat"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .timeout(Duration.ofSeconds(30))
            .build();

        return httpClient.sendAsync(httpRequest, HttpResponse.BodyHandlers.ofString())
            .thenApply(response -> {
                if (response.statusCode() >= 400) {
                    throw new RuntimeException("API Error: " + response.body());
                }
                return gson.fromJson(response.body(), JsonObject.class);
            });
    }

    public static void main(String[] args) {
        String apiKey = System.getenv("WISER_API_KEY");
        WiserAIClient client = new WiserAIClient(apiKey);

        Message[] messages = {
            new Message("system", "You are a helpful assistant."),
            new Message("user", "Explain quantum computing in simple terms.")
        };

        client.chat(messages)
            .thenAccept(response -> {
                var content = response
                    .getAsJsonArray("choices")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("message")
                    .get("content").getAsString();
                System.out.println(content);
            })
            .exceptionally(e -> {
                System.err.println("Error: " + e.getMessage());
                return null;
            })
            .join();
    }
}`
};

const webhookExamples = {
  javascript: `// WISER AI - Express.js Webhook Handler
// Production-ready with signature verification and retry handling

const express = require('express');
const crypto = require('crypto');
const app = express();

app.use('/webhooks', express.raw({ type: 'application/json' }));

const WEBHOOK_SECRET = process.env.WISER_WEBHOOK_SECRET;

// Signature verification middleware
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-wiser-signature'];
  const timestamp = req.headers['x-wiser-timestamp'];
  
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature headers' });
  }

  // Prevent replay attacks (5 minute tolerance)
  const age = Date.now() / 1000 - parseInt(timestamp);
  if (age > 300) {
    return res.status(401).json({ error: 'Timestamp too old' });
  }

  const payload = timestamp + '.' + req.body.toString();
  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// Webhook endpoint
app.post('/webhooks/wiser', verifyWebhookSignature, async (req, res) => {
  // Respond immediately to acknowledge receipt
  res.json({ received: true });

  // Process event asynchronously
  const event = JSON.parse(req.body);
  
  try {
    switch (event.type) {
      case 'chat.completed':
        console.log('Chat completed:', event.data.request_id);
        // Handle completion
        break;
        
      case 'usage.limit_reached':
        console.log('Usage limit reached for user:', event.data.user_id);
        // Notify user or upgrade prompt
        break;
        
      case 'subscription.updated':
        console.log('Subscription updated:', event.data);
        // Update user permissions
        break;
        
      case 'task.completed':
        console.log('Automation task completed:', event.data.task_id);
        // Process results
        break;
        
      case 'podcast.generated':
        console.log('Podcast ready:', event.data.download_url);
        // Notify user
        break;
        
      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Implement retry logic or dead letter queue
  }
});

app.listen(3000, () => console.log('Webhook server running'));`,
  php: `<?php
/**
 * WISER AI - PHP Webhook Handler
 * Production-ready with signature verification
 */

// Get raw request body
$payload = file_get_contents('php://input');
$headers = getallheaders();

// Configuration
$webhookSecret = getenv('WISER_WEBHOOK_SECRET');
$signature = $headers['X-Wiser-Signature'] ?? '';
$timestamp = $headers['X-Wiser-Timestamp'] ?? '';

// Verify signature
function verifySignature($payload, $timestamp, $signature, $secret) {
    if (empty($signature) || empty($timestamp)) {
        return false;
    }

    // Check timestamp age (5 minute tolerance)
    if (time() - intval($timestamp) > 300) {
        return false;
    }

    $expectedSig = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    return hash_equals($expectedSig, $signature);
}

if (!verifySignature($payload, $timestamp, $signature, $webhookSecret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Acknowledge receipt immediately
http_response_code(200);
echo json_encode(['received' => true]);

// Flush output to client
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

// Process event
$event = json_decode($payload, true);

try {
    switch ($event['type']) {
        case 'chat.completed':
            // Handle chat completion
            processChat($event['data']);
            break;
            
        case 'usage.limit_reached':
            // Notify user about limit
            sendLimitNotification($event['data']['user_id']);
            break;
            
        case 'subscription.updated':
            // Update user permissions in database
            updateSubscription($event['data']);
            break;
            
        case 'task.completed':
            // Process automation results
            processTaskResult($event['data']);
            break;
            
        case 'podcast.generated':
            // Send download link to user
            notifyPodcastReady($event['data']);
            break;
            
        default:
            error_log('Unhandled webhook event: ' . $event['type']);
    }
} catch (Exception $e) {
    error_log('Webhook error: ' . $e->getMessage());
    // Consider implementing retry queue
}

function processChat($data) {
    // Implementation
}

function sendLimitNotification($userId) {
    // Send email or push notification
}

function updateSubscription($data) {
    // Update database
}

function processTaskResult($data) {
    // Handle automation results
}

function notifyPodcastReady($data) {
    // Send notification with download link
}
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
              <img src={wiserLogo} alt="Wiser AI" className="h-8 w-8 rounded-lg" />
              <span className="font-bold">WISER AI</span>
              <Badge variant="secondary" className="ml-2">API v2.0</Badge>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/support">
              <Button variant="ghost" size="sm">Support</Button>
            </Link>
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
        <aside className="hidden lg:block w-72 fixed left-0 top-20 bottom-0 border-r border-border bg-card/50 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 px-3 py-2 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              All Systems Operational
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Getting Started</h3>
              <ul className="space-y-2">
                <li><a href="#introduction" className="text-sm text-foreground hover:text-primary flex items-center gap-2"><Info className="h-3 w-3" />Introduction</a></li>
                <li><a href="#api-keys" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"><Key className="h-3 w-3" />API Keys</a></li>
                <li><a href="#authentication" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"><Lock className="h-3 w-3" />Authentication</a></li>
                <li><a href="#quickstart" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"><Zap className="h-3 w-3" />Quickstart</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">SDKs & Languages</h3>
              <ul className="space-y-2">
                <li><a href="#javascript" className="text-sm text-muted-foreground hover:text-primary">JavaScript / TypeScript</a></li>
                <li><a href="#nodejs" className="text-sm text-muted-foreground hover:text-primary">Node.js</a></li>
                <li><a href="#express" className="text-sm text-muted-foreground hover:text-primary">Express.js</a></li>
                <li><a href="#php" className="text-sm text-muted-foreground hover:text-primary">PHP</a></li>
                <li><a href="#java" className="text-sm text-muted-foreground hover:text-primary">Java</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">API Reference</h3>
              <ul className="space-y-2">
                {endpoints.map((endpoint, i) => (
                  <li key={i}>
                    <a href={`#${endpoint.path.replace(/\//g, '-')}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1 ${endpoint.method === 'POST' ? 'bg-primary/10 text-primary' : ''}`}>
                        {endpoint.method}
                      </Badge>
                      {endpoint.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Webhooks</h3>
              <ul className="space-y-2">
                <li><a href="#webhooks" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"><Webhook className="h-3 w-3" />Events</a></li>
                <li><a href="#webhook-security" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2"><Shield className="h-3 w-3" />Security</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary">Pricing & Limits</a></li>
                <li><Link to="/support" className="text-sm text-muted-foreground hover:text-primary">Support</Link></li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 p-6 lg:p-12">
          <div className="max-w-4xl mx-auto">
            {/* Hero */}
            <section id="introduction" className="mb-16">
              <div className="flex items-center gap-4 mb-6">
                <img src={wiserLogo} alt="Wiser AI" className="h-14 w-14 rounded-xl" />
                <div>
                  <h1 className="text-4xl font-bold">WISER AI API</h1>
                  <p className="text-muted-foreground">Enterprise-grade AI API for global applications</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-card/50 border-border/50 text-center">
                  <CardContent className="pt-4 pb-4">
                    <Server className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">99.9%</div>
                    <div className="text-xs text-muted-foreground">Uptime SLA</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50 text-center">
                  <CardContent className="pt-4 pb-4">
                    <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">&lt;200ms</div>
                    <div className="text-xs text-muted-foreground">Avg Response</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50 text-center">
                  <CardContent className="pt-4 pb-4">
                    <Globe className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">50+</div>
                    <div className="text-xs text-muted-foreground">Edge Locations</div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50 text-center">
                  <CardContent className="pt-4 pb-4">
                    <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">SOC 2</div>
                    <div className="text-xs text-muted-foreground">Compliant</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <Zap className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Blazing Fast</h3>
                    <p className="text-sm text-muted-foreground">Global edge deployment with sub-200ms latency</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <Shield className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Enterprise Ready</h3>
                    <p className="text-sm text-muted-foreground">SOC 2 compliant with end-to-end encryption</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <Globe className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Multi-Language SDKs</h3>
                    <p className="text-sm text-muted-foreground">Official SDKs for PHP, JS, Java, Python & more</p>
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
                        { event: 'task.completed', desc: 'Wiser automation task completed' },
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
              <h2 className="text-2xl font-bold mb-6">Pricing & Rate Limits</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricingTiers.map((tier, i) => (
                  <Card key={i} className={`bg-card/50 border-border/50 text-center ${tier.name === 'Pro' ? 'border-primary shadow-lg' : ''}`}>
                    {tier.name === 'Pro' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                        Popular
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle>{tier.name}</CardTitle>
                      <div className="text-2xl font-bold text-primary">{tier.price}</div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div>
                        <div className="text-xs text-muted-foreground">Requests/month</div>
                        <div className="font-semibold">{tier.requests}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Tokens/month</div>
                        <div className="font-semibold">{tier.tokens}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Support</div>
                        <div className="font-semibold">{tier.support}</div>
                      </div>
                      {tier.name !== 'Free' && (
                        <Badge variant="secondary" className="text-xs">5-day free trial</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link to="/pricing">
                  <Button variant="outline">
                    View Full Pricing Details <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center py-12 px-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4">Ready to Build?</h2>
              <p className="text-muted-foreground mb-6">Get your API key and start building production-ready AI applications in minutes.</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link to="/pricing">
                  <Button size="lg" variant="outline">
                    View Pricing
                  </Button>
                </Link>
                <Link to="/support">
                  <Button size="lg" variant="outline">
                    Contact Support
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-secondary">
                    Go to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                © 2026 Wiser AI. All Rights Reserved. | <a href="mailto:wiserai@support.com" className="hover:text-primary">wiserai@support.com</a>
              </p>
            </div>
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
