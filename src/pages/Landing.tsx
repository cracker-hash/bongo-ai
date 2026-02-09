import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, Zap, Mic, Code, GraduationCap, Shield, 
  ArrowRight, Check, Star, Users, BookOpen, Globe,
  Sparkles, Bot, Rocket, ChevronRight
} from 'lucide-react';
import wiserLogo from '@/assets/wiser-ai-logo.png';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Learning',
    description: 'Personalized study plans, quizzes, and research assistance powered by advanced AI.'
  },
  {
    icon: Bot,
    title: 'Wiser Automation',
    description: 'Full automation with agent loops, browser interaction, and custom workflows.'
  },
  {
    icon: Mic,
    title: 'Podcast Generator',
    description: 'Transform documents and notes into professional podcasts with AI voice synthesis.'
  },
  {
    icon: Code,
    title: 'Developer API',
    description: 'Public API gateway with comprehensive documentation for seamless integration.'
  },
  {
    icon: GraduationCap,
    title: 'Gamified Progress',
    description: 'XP system, badges, streaks, and leaderboards to keep you motivated.'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, 2FA, and compliance with global standards.'
  }
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: ['1,000 API requests/month', '5 podcast generations', 'Basic chat modes', 'Community support'],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Lite',
    price: '$20',
    period: '/month',
    description: 'For growing learners',
    features: ['10,000 API requests/month', '50 podcast generations', 'All chat modes', 'Priority support', 'Project management', '5-day free trial'],
    cta: 'Start Free Trial',
    popular: false
  },
  {
    name: 'Pro',
    price: '$40',
    period: '/month',
    description: 'For power users',
    features: ['100,000 API requests/month', 'Unlimited podcasts', 'Wiser automation', 'API access', 'Advanced analytics', 'Custom integrations', '5-day free trial'],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    name: 'Max',
    price: '$200',
    period: '/month',
    description: 'Enterprise-grade solution',
    features: ['Unlimited API requests', 'White-label options', 'Dedicated support', 'Custom SLAs', 'On-premise deployment', 'Team management', '5-day free trial'],
    cta: 'Contact Sales',
    popular: false
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={wiserLogo} alt="Wiser AI" className="h-10 w-10 rounded-xl" />
            <span className="text-xl font-bold">WISER AI</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">API Docs</Link>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors">Support</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/chat">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/chat?signup=true">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Sparkles className="h-4 w-4" />
            Africa's Premier AI Education Platform
          </div>

          {/* Wiser Logo Hero */}
          <div className="flex justify-center mb-8">
            <img src={wiserLogo} alt="Wiser AI" className="h-24 w-24 md:h-32 md:w-32 rounded-2xl shadow-2xl" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">WISER AI</span>
            <br />
            <span className="text-foreground text-3xl md:text-4xl">Your Education & Automation Assistant</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            WISER AI combines cutting-edge artificial intelligence with powerful automation 
            to revolutionize how you learn, create, and build across Africa and beyond.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/chat?signup=true">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 h-14 px-8 text-lg">
                Start Learning Free <Rocket className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                View API Docs <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: '50K+', label: 'Active Learners' },
              { value: '1M+', label: 'API Requests' },
              { value: '99.9%', label: 'Uptime' },
              { value: '4.9★', label: 'User Rating' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to accelerate your learning and automation journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that's right for you. All paid plans include a 5-day free trial.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <Card key={i} className={`relative ${plan.popular ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/50'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full ${plan.popular ? 'bg-gradient-to-r from-primary to-secondary' : ''}`} variant={plan.popular ? 'default' : 'outline'}>
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of learners and developers who are already using WISER AI.
          </p>
          <Link to="/chat?signup=true">
            <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 h-14 px-8 text-lg">
              Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={wiserLogo} alt="Wiser AI" className="h-8 w-8 rounded-lg" />
                <span className="font-bold">WISER AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Africa's premier AI education and automation platform.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/chat" className="hover:text-foreground">Features</Link></li>
                <li><Link to="/docs" className="hover:text-foreground">API Docs</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/docs" className="hover:text-foreground">Documentation</Link></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/support" className="hover:text-foreground">Help Center</Link></li>
                <li><a href="mailto:wiserai@support.com" className="hover:text-foreground">Contact Us</a></li>
                <li><a href="#" className="hover:text-foreground">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 Wiser AI. All Rights Reserved.</p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy Policy</a>
              <a href="#" className="hover:text-foreground">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
