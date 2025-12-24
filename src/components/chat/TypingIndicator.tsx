import bongoLogo from '@/assets/bongo-ai-logo.png';

export function TypingIndicator() {
  return (
    <div className="flex gap-4 animate-fade-in">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
        <img 
          src={bongoLogo} 
          alt="Bongo AI" 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex items-center gap-1 px-4 py-3 bg-chat-ai rounded-2xl rounded-tl-md border border-border/50">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
