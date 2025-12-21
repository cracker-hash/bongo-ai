import bongoLogo from '@/assets/bongo-ai-logo.png';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary p-0.5">
        <img 
          src={bongoLogo} 
          alt="Bongo AI" 
          className="w-full h-full object-cover rounded-full"
        />
      </div>
      <div className="bg-chat-ai border border-primary/20 rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-primary rounded-full animate-typing" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-typing" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-primary rounded-full animate-typing" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
