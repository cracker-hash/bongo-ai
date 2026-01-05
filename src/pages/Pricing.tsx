import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, Check, ArrowLeft, Zap, Shield, Headphones,
  Star, ChevronRight, Loader2
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STRIPE_TIERS, getTierByProductId, TierKey } from '@/lib/stripeConfig';

const plans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceId: null,
    features: [
      '1,000 API requests/month',
      '1 podcast generation',
      'Basic chat modes (Study, Quiz)',
      'Community support',
      '10K tokens/month'
    ],
    limitations: [
      'No Manus automation',
      'No API access',
      'Basic voice only'
    ],
    cta: 'Current Plan',
    popular: false
  },
  {
    id: 'lite',
    name: 'Lite',
    description: 'For growing learners',
    monthlyPrice: 20,
    yearlyPrice: 192,
    priceId: STRIPE_TIERS.lite.price_id,
    productId: STRIPE_TIERS.lite.product_id,
    features: [
      '5,000 API requests/month',
      '5 podcast generations',
      'All chat modes',
      'Priority email support',
      '100K tokens/month',
      'Project management',
      'Basic analytics'
    ],
    limitations: [
      'Limited Manus automation',
      'Basic API access'
    ],
    cta: 'Subscribe',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    monthlyPrice: 40,
    yearlyPrice: 384,
    priceId: STRIPE_TIERS.pro.price_id,
    productId: STRIPE_TIERS.pro.product_id,
    features: [
      '25,000 API requests/month',
      '25 podcasts',
      'Full Manus automation',
      'Full API access',
      '500K tokens/month',
      'Advanced analytics',
      'Custom integrations',
      'Priority support'
    ],
    limitations: [],
    cta: 'Subscribe',
    popular: true
  },
  {
    id: 'max',
    name: 'Max',
    description: 'Enterprise-grade solution',
    monthlyPrice: 200,
    yearlyPrice: 1920,
    priceId: STRIPE_TIERS.max.price_id,
    productId: STRIPE_TIERS.max.product_id,
    features: [
      'Unlimited API requests',
      'Unlimited podcasts',
      'Unlimited tokens',
      'White-label options',
      'Dedicated account manager',
      'Custom SLAs (99.99% uptime)',
      'Advanced security (SSO, 2FA)',
      '24/7 phone support'
    ],
    limitations: [],
    cta: 'Subscribe',
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
    a: 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.'
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
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<TierKey>('free');
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  useEffect(() => {
    // Check for success/cancel params
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
      return; // Free plan
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
    if (plan.monthlyPrice === 0) return 'Free';
    const price = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
    return `$${price}`;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return null;
    const monthlyCost = plan.monthlyPrice * 12;
    const savings = monthlyCost - plan.yearlyPrice;
    return Math.round((savings / monthlyCost) * 100);
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
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
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
              Simple, <span className="gradient-text">Transparent</span> Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that's right for you. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${!isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={`text-sm ${isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Yearly
              </span>
              {isYearly && (
                <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-500 border-green-500/30">
                  Save 20%
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-20">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${
                  plan.popular 
                    ? 'border-primary shadow-lg shadow-primary/20 scale-105' 
                    : isCurrentPlan(plan.id)
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-border/50'
                }`}
              >
                {plan.popular && !isCurrentPlan(plan.id) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Most Popular
                  </div>
                )}
                {isCurrentPlan(plan.id) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Your Plan
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {plan.id === 'max' && <Badge variant="outline">Enterprise</Badge>}
                  </CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{getPrice(plan)}</span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>
                  {isYearly && getSavings(plan) && (
                    <Badge variant="secondary" className="w-fit mt-1">
                      Save ${plan.monthlyPrice * 12 - plan.yearlyPrice}/year
                    </Badge>
                  )}
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full mt-6 ${
                      plan.popular && !isCurrentPlan(plan.id)
                        ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90' 
                        : ''
                    }`}
                    variant={isCurrentPlan(plan.id) ? 'secondary' : plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlan === plan.id || isCurrentPlan(plan.id) || plan.id === 'free'}
                  >
                    {loadingPlan === plan.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isCurrentPlan(plan.id) ? 'Current Plan' : plan.cta}
                    {!isCurrentPlan(plan.id) && plan.id !== 'free' && <ChevronRight className="h-4 w-4 ml-1" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

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

          {/* CTA */}
          <div className="text-center mt-20 py-12 px-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of learners and developers using WISER AI.
            </p>
            <Link to="/">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary">
                Start Your Free Trial <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
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
