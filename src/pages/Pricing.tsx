import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, Check, ArrowLeft, Zap, Shield, Headphones,
  Star, ChevronRight, Loader2, RefreshCw, Sparkles, 
  Search, Globe, Presentation, Calendar, Users, Lock, ExternalLink
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STRIPE_TIERS, getTierByProductId, TierKey } from '@/lib/stripeConfig';
import wiserLogo from '@/assets/wiser-logo.png';

const plans = [
  {
    id: 'lite',
    name: 'Lite',
    description: 'Standard monthly usage',
    monthlyPrice: 20,
    yearlyPrice: 200,
    priceId: STRIPE_TIERS.lite.price_id,
    productId: STRIPE_TIERS.lite.product_id,
    trialDays: 5,
    features: [
      { icon: RefreshCw, text: '200 refresh credits everyday' },
      { icon: Sparkles, text: '2,800 credits per month' },
      { icon: Search, text: 'In-depth research for everyday tasks' },
      { icon: Globe, text: 'Professional websites for standard output' },
      { icon: Presentation, text: 'Insightful slides for regular content' },
      { icon: Zap, text: 'Task scaling with Wide Research' },
      { icon: Lock, text: 'Early access to beta features' },
      { icon: Users, text: '14 concurrent tasks' },
      { icon: Calendar, text: '14 scheduled tasks' },
    ],
    cta: 'Start 5-Day Free Trial',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Customizable monthly usage',
    monthlyPrice: 40,
    yearlyPrice: 400,
    priceId: STRIPE_TIERS.pro.price_id,
    productId: STRIPE_TIERS.pro.product_id,
    trialDays: 5,
    creditOptions: ['5,600 credits / month', '8,400 credits / month', '11,200 credits / month'],
    features: [
      { icon: RefreshCw, text: '200 refresh credits everyday' },
      { icon: Sparkles, text: '5,600 credits per month' },
      { icon: Search, text: 'In-depth research with self-set usage' },
      { icon: Globe, text: 'Professional websites for changing needs' },
      { icon: Presentation, text: 'Insightful slides for steady creation' },
      { icon: Zap, text: 'Wide Research scaled to your chosen plan' },
      { icon: Lock, text: 'Early access to beta features' },
      { icon: Users, text: '14 concurrent tasks' },
      { icon: Calendar, text: '14 scheduled tasks' },
    ],
    cta: 'Start 5-Day Free Trial',
    popular: true
  },
  {
    id: 'max',
    name: 'Max',
    description: 'Extended usage for productivity',
    monthlyPrice: 200,
    yearlyPrice: 1996,
    priceId: STRIPE_TIERS.max.price_id,
    productId: STRIPE_TIERS.max.product_id,
    trialDays: 5,
    features: [
      { icon: RefreshCw, text: '200 refresh credits everyday' },
      { icon: Sparkles, text: '28,000 credits per month' },
      { icon: Search, text: 'In-depth research for large-scale tasks' },
      { icon: Globe, text: 'Professional websites with data analytics' },
      { icon: Presentation, text: 'Insightful slides for batch production' },
      { icon: Zap, text: 'Wide Research for sustained heavy use' },
      { icon: Lock, text: 'Early access to beta features' },
      { icon: Users, text: '14 concurrent tasks' },
      { icon: Calendar, text: '14 scheduled tasks' },
    ],
    cta: 'Start 5-Day Free Trial',
    popular: false
  }
];

const faqs = [
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes! You can upgrade or downgrade at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, you\'ll keep current features until the billing period ends.'
  },
  {
    q: 'What happens when I hit my limits?',
    a: 'We\'ll notify you when you reach 80% of your limits. If you exceed limits, you can either upgrade or wait for the next billing cycle. We never cut off service abruptly.'
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! All paid plans come with a 5-day free trial. No credit card required to start.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, PayPal, and bank transfers for enterprise customers. All payments are processed securely through Stripe.'
  },
  {
    q: 'Do you offer educational discounts?',
    a: 'Yes! Students and educators get 50% off all plans. Contact us with your .edu email for verification.'
  }
];

function PricingContent() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [isYearly, setIsYearly] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<TierKey>('free');
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription successful! Welcome to your new plan.');
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout canceled. No changes made.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    setIsCheckingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      if (data?.product_id) {
        setCurrentTier(getTierByProductId(data.product_id));
      } else {
        setCurrentTier('free');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to subscribe');
      return;
    }

    if (!plan.priceId) {
      return;
    }

    setLoadingPlan(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPlan('manage');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription management.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const getPrice = (plan: typeof plans[0]) => {
    const price = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
    return `$${price}`;
  };

  const getSavingsPercent = () => {
    return 17; // Save 17% with yearly
  };

  const isCurrentPlan = (planId: string) => planId === currentTier;

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
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {currentTier !== 'free' && (
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                disabled={loadingPlan === 'manage'}
              >
                {loadingPlan === 'manage' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Manage Subscription
              </Button>
            )}
            <Link to="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Upgrade for <span className="gradient-text">Wiser 2.0 Max</span> access
            </h1>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button 
                variant={!isYearly ? "default" : "ghost"} 
                onClick={() => setIsYearly(false)}
                className={`rounded-full ${!isYearly ? 'bg-muted text-foreground' : ''}`}
              >
                Monthly
              </Button>
              <Button 
                variant={isYearly ? "default" : "ghost"} 
                onClick={() => setIsYearly(true)}
                className={`rounded-full ${isYearly ? 'bg-muted text-foreground' : ''}`}
              >
                Annually · Save {getSavingsPercent()}%
              </Button>
            </div>
          </div>

          {/* Pricing Cards - Manus-style layout */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col bg-card/50 ${
                  plan.popular 
                    ? 'border-2 border-primary shadow-lg shadow-primary/20' 
                    : isCurrentPlan(plan.id)
                    ? 'border-2 border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-border/50'
                }`}
              >
                {isCurrentPlan(plan.id) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Your Plan
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold">{getPrice(plan)}</span>
                    <span className="text-muted-foreground">/ month, billed {isYearly ? 'yearly' : 'monthly'}</span>
                  </div>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col pt-0">
                  <Button 
                    className={`w-full mb-6 ${
                      plan.popular && !isCurrentPlan(plan.id)
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                        : ''
                    }`}
                    variant={isCurrentPlan(plan.id) ? 'secondary' : plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlan === plan.id || isCurrentPlan(plan.id)}
                  >
                    {loadingPlan === plan.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isCurrentPlan(plan.id) ? 'Current Plan' : plan.cta}
                  </Button>

                  {/* Credit selector for Pro plan */}
                  {plan.creditOptions && (
                    <div className="mb-6">
                      <select className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground">
                        {plan.creditOptions.map((option, i) => (
                          <option key={i} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <feature.icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Team Section */}
          <Card className="max-w-5xl mx-auto mb-6 bg-card/50 border-border/50">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Team</h3>
                  <p className="text-muted-foreground">Scale your team's productivity with Wiser</p>
                </div>
              </div>
              <Button variant="outline">
                Get Team
              </Button>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card className="max-w-5xl mx-auto mb-16 bg-card/50 border-border/50">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold">
                    AICPA<br/>SOC 2
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <Shield className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Security and Compliance</h3>
                  <p className="text-muted-foreground">Enterprise-grade security and industry-standard certifications.</p>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                Learn more <ExternalLink className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Features Comparison */}
          <div className="max-w-4xl mx-auto mb-20">
            <h2 className="text-2xl font-bold text-center mb-8">Why Choose WISER AI?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-card/50 border-border/50 text-center">
                <CardContent className="pt-6">
                  <Zap className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Lightning Fast</h3>
                  <p className="text-sm text-muted-foreground">
                    Responses in under 500ms with our global edge network.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50 text-center">
                <CardContent className="pt-6">
                  <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Enterprise Security</h3>
                  <p className="text-sm text-muted-foreground">
                    SOC 2 compliant with end-to-end encryption.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50 text-center">
                <CardContent className="pt-6">
                  <Headphones className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">24/7 Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Expert help whenever you need it, day or night.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQs */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <Card key={i} className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Help Link */}
          <div className="text-center mt-12 text-muted-foreground">
            Having a problem? <a href="#" className="underline hover:text-foreground">Go to Help center</a>.
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Pricing() {
  return (
    <AuthProvider>
      <PricingContent />
    </AuthProvider>
  );
}