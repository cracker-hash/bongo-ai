import wiserLogo from '@/assets/wiser-ai-logo.png';

export function TypingIndicator() {
  return (
    <div className="flex gap-4 animate-fade-in">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
        <img 
          src={wiserLogo} 
          alt="Wiser AI" 
          className="w-full h-full object-cover animate-pulse"
        />
      </div>
      
      {/* Typing bubble */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground font-medium">Wiser AI is typing...</span>
        <div className="flex items-center gap-2 px-4 py-3 bg-chat-ai rounded-2xl rounded-tl-md border border-border/50">
          <div className="flex gap-1.5">
            <span 
              className="w-2 h-2 rounded-full bg-primary animate-bounce" 
              style={{ animationDelay: '0ms', animationDuration: '0.6s' }} 
            />
            <span 
              className="w-2 h-2 rounded-full bg-primary animate-bounce" 
              style={{ animationDelay: '150ms', animationDuration: '0.6s' }} 
            />
            <span 
              className="w-2 h-2 rounded-full bg-primary animate-bounce" 
              style={{ animationDelay: '300ms', animationDuration: '0.6s' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
