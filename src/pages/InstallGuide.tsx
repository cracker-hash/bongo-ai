import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Smartphone, Monitor, Share, Plus, MoreVertical, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import wiserLogo from '@/assets/wiser-ai-logo.png';

type DeviceType = 'ios' | 'android' | 'desktop';

export default function InstallGuide() {
  const navigate = useNavigate();
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect device type
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceType('ios');
    } else if (/android/.test(ua)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const iosSteps = [
    {
      icon: <Share className="h-6 w-6" />,
      title: "Tap the Share button",
      description: "Look for the share icon at the bottom of Safari (square with arrow pointing up)"
    },
    {
      icon: <Plus className="h-6 w-6" />,
      title: "Select 'Add to Home Screen'",
      description: "Scroll down in the share menu and tap 'Add to Home Screen'"
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Tap 'Add'",
      description: "Confirm by tapping 'Add' in the top right corner. Wiser AI will appear on your home screen!"
    }
  ];

  const androidSteps = [
    {
      icon: <MoreVertical className="h-6 w-6" />,
      title: "Tap the menu button",
      description: "Look for three dots (⋮) in the top right corner of Chrome"
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Select 'Install app' or 'Add to Home screen'",
      description: "Tap on the install option in the dropdown menu"
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Confirm installation",
      description: "Tap 'Install' to add Wiser AI to your home screen"
    }
  ];

  const desktopSteps = [
    {
      icon: <Menu className="h-6 w-6" />,
      title: "Look for the install icon",
      description: "In Chrome, look for an install icon (⊕) in the address bar or menu"
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Click 'Install'",
      description: "Click the install button when prompted, or use the button below"
    },
    {
      icon: <Monitor className="h-6 w-6" />,
      title: "Launch Wiser AI",
      description: "Find Wiser AI in your applications and launch it like any other app"
    }
  ];

  const steps = deviceType === 'ios' ? iosSteps : deviceType === 'android' ? androidSteps : desktopSteps;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Install Wiser AI</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero section */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl" />
            <img 
              src={wiserLogo} 
              alt="Wiser AI" 
              className="relative h-24 w-24 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold mb-2 gradient-text">Get Wiser AI on Your Device</h2>
          <p className="text-muted-foreground">
            Install Wiser AI for the best experience - instant access, offline support, and more!
          </p>
        </div>

        {/* Device selector */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={deviceType === 'ios' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeviceType('ios')}
          >
            iOS
          </Button>
          <Button
            variant={deviceType === 'android' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeviceType('android')}
          >
            Android
          </Button>
          <Button
            variant={deviceType === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeviceType('desktop')}
          >
            Desktop
          </Button>
        </div>

        {/* Install button for supported browsers */}
        {deferredPrompt && (
          <div className="mb-8">
            <Button 
              onClick={handleInstall}
              className="w-full gradient-bg hover:opacity-90 py-6 text-lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Install Wiser AI Now
            </Button>
          </div>
        )}

        {/* Installation steps */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">
            Installation Steps for {deviceType === 'ios' ? 'iPhone/iPad' : deviceType === 'android' ? 'Android' : 'Desktop'}
          </h3>
          
          {steps.map((step, index) => (
            <div 
              key={index}
              className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {step.icon}
              </div>
              <div>
                <h4 className="font-medium mb-1">
                  <span className="text-primary mr-2">{index + 1}.</span>
                  {step.title}
                </h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="mt-12 p-6 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Why Install Wiser AI?</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Works offline - access your chat history anytime</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Faster load times - instant access from home screen</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Full-screen experience - no browser UI clutter</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Push notifications - never miss an update</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
