import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Mail, Phone, MapPin, MessageSquare, 
  Clock, Send, CheckCircle, Headphones, BookOpen,
  HelpCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import wiserLogo from '@/assets/wiser-ai-logo.png';

const supportCategories = [
  {
    icon: HelpCircle,
    title: 'General Inquiry',
    description: 'Questions about our services'
  },
  {
    icon: FileText,
    title: 'Technical Support',
    description: 'API or integration issues'
  },
  {
    icon: BookOpen,
    title: 'Billing & Subscriptions',
    description: 'Payment and plan questions'
  },
  {
    icon: Headphones,
    title: 'Enterprise Sales',
    description: 'Custom solutions for teams'
  }
];

const faqs = [
  {
    q: 'How do I get started with WISER AI?',
    a: 'Simply create an account, generate an API key from the dashboard, and start integrating our API into your applications.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, PayPal, and wire transfers for enterprise customers.'
  },
  {
    q: 'Can I upgrade or downgrade my plan?',
    a: 'Yes! You can change your plan at any time. Changes take effect immediately.'
  },
  {
    q: 'Do you offer educational discounts?',
    a: 'Yes, we offer 50% off for students and educators. Contact us with your .edu email.'
  },
  {
    q: 'What is your uptime guarantee?',
    a: 'We maintain 99.9% uptime across all services with global edge deployment.'
  }
];

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'General Inquiry',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Your message has been sent! We\'ll get back to you soon.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/docs">
              <Button variant="outline">API Docs</Button>
            </Link>
            <Link to="/chat">
              <Button className="bg-gradient-to-r from-primary to-secondary">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              How Can We <span className="gradient-text">Help You?</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our global support team is here to assist you 24/7. Get in touch with us through any of the channels below.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="bg-card/50 border-border/50 text-center hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Email Support</h3>
                <a href="mailto:wiserai@support.com" className="text-primary hover:underline font-medium">
                  wiserai@support.com
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  We respond within 24 hours
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50 text-center hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Business Hours</h3>
                <p className="text-muted-foreground">
                  Monday - Friday<br />
                  9:00 AM - 6:00 PM EAT
                </p>
                <p className="text-sm text-primary mt-2">
                  24/7 for Enterprise
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50 text-center hover:border-primary/50 transition-colors">
              <CardContent className="pt-8 pb-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Headquarters</h3>
                <p className="text-muted-foreground">
                  Dar es Salaam, Tanzania<br />
                  Africa
                </p>
                <p className="text-sm text-primary mt-2">
                  Serving globally
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              
              {isSubmitted ? (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-12 pb-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground mb-6">
                      Thank you for reaching out. Our team will get back to you within 24 hours.
                    </p>
                    <Button onClick={() => setIsSubmitted(false)} variant="outline">
                      Send Another Message
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground"
                        >
                          {supportCategories.map((cat) => (
                            <option key={cat.title} value={cat.title}>
                              {cat.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          name="subject"
                          placeholder="How can we help?"
                          value={formData.subject}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Describe your issue or question in detail..."
                          rows={5}
                          value={formData.message}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-secondary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>Sending...</>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* FAQ Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <Card key={i} className="bg-card/50 border-border/50">
                    <CardContent className="pt-4 pb-4">
                      <h3 className="font-semibold mb-2">{faq.q}</h3>
                      <p className="text-sm text-muted-foreground">{faq.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Links */}
              <Card className="mt-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Quick Links</h3>
                  <div className="space-y-3">
                    <Link to="/docs" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                      <FileText className="h-4 w-4" />
                      API Documentation
                    </Link>
                    <Link to="/pricing" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                      <MessageSquare className="h-4 w-4" />
                      Pricing & Plans
                    </Link>
                    <a href="mailto:wiserai@support.com" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                      <Mail className="h-4 w-4" />
                      Email Support
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 Wiser AI. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
