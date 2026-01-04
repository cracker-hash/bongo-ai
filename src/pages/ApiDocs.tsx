import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, Code, Copy, Check, Key, Zap, ArrowLeft,
  MessageSquare, Image, FileText, Mic, Bot, Search,
  ChevronRight, ExternalLink, BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const endpoints = [
  {
    method: 'POST',
    path: '/v1/chat/completions',
    name: 'Chat Completions',
    description: 'Generate conversational responses with context awareness',
    icon: MessageSquare,
    category: 'Core'
  },
  {
    method: 'POST',
    path: '/v1/images/generate',
    name: 'Image Generation',
    description: 'Generate images from text descriptions using DALL-E',
    icon: Image,
    category: 'Media'
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
  { name: 'Free', requests: '1,000', price: '$0/mo', tokens: '100K' },
  { name: 'Lite', requests: '10,000', price: '$20/mo', tokens: '1M' },
  { name: 'Pro', requests: '100,000', price: '$40/mo', tokens: '10M' },
  { name: 'Max', requests: 'Unlimited', price: '$200/mo', tokens: 'Unlimited' }
];

const codeExamples = {
  curl: `curl -X POST https://api.wiser.ai/v1/chat/completions \\
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
  python: `import wiser

client = wiser.Client(api_key="YOUR_API_KEY")

response = client.chat.completions.create(
    model="wiser-pro",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain quantum computing in simple terms."}
    ],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content, end="")`,
  javascript: `import Wiser from 'wiser-ai';

const client = new Wiser({ apiKey: 'YOUR_API_KEY' });

const stream = await client.chat.completions.create({
  model: 'wiser-pro',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing in simple terms.' }
  ],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`
};

export default function ApiDocs() {
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
            <Link to="/landing" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
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
            <Link to="/">
              <Button variant="outline" size="sm">
                <Key className="h-4 w-4 mr-2" />
                Get API Key
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
                <li><a href="#authentication" className="text-sm text-muted-foreground hover:text-primary">Authentication</a></li>
                <li><a href="#quickstart" className="text-sm text-muted-foreground hover:text-primary">Quickstart</a></li>
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pricing</h3>
              <ul className="space-y-2">
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary">Plans & Limits</a></li>
                <li><a href="#tokens" className="text-sm text-muted-foreground hover:text-primary">Token Usage</a></li>
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
                    <Search className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">OpenAI Compatible</h3>
                    <p className="text-sm text-muted-foreground">Drop-in replacement for OpenAI API</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <Bot className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Manus Automation</h3>
                    <p className="text-sm text-muted-foreground">Advanced agent capabilities built-in</p>
                  </CardContent>
                </Card>
              </div>
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
                    <code>Authorization: Bearer YOUR_API_KEY</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY', 'auth')}
                    >
                      {copiedCode === 'auth' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Quickstart */}
            <section id="quickstart" className="mb-16">
              <h2 className="text-2xl font-bold mb-4">Quickstart</h2>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <Tabs defaultValue="curl" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    </TabsList>
                    {Object.entries(codeExamples).map(([lang, code]) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="bg-muted rounded-lg p-4 font-mono text-sm relative overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{code}</pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => copyToClipboard(code, lang)}
                          >
                            {copiedCode === lang ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                        <code>{endpoint.path}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(endpoint.path, endpoint.path)}
                        >
                          {copiedCode === endpoint.path ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
              <Link to="/">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary">
                  Get Your API Key <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
