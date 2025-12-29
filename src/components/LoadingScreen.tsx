import { useEffect, useState } from 'react';
import wiserLogo from '@/assets/wiser-ai-logo.png';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function LoadingScreen({ onComplete, minDuration = 2500 }: LoadingScreenProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center">
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      >
        <source src="/loading-animation.mp4" type="video/mp4" />
      </video>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo with pulse animation */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <img 
            src={wiserLogo} 
            alt="Wiser AI" 
            className="relative h-24 w-24 object-contain animate-bounce"
          />
        </div>

        {/* Brand name */}
        <h1 className="text-3xl font-bold gradient-text animate-pulse">
          Wiser AI
        </h1>

        {/* Loading indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        <p className="text-sm text-muted-foreground animate-fade-in">
          Loading your AI assistant...
        </p>
      </div>
    </div>
  );
}
