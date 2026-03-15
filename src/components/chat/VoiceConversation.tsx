import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Volume2, VolumeX, Phone, PhoneOff, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { speak, stopSpeaking, getVoiceSettings, cleanTextForSpeech } from '@/lib/textToSpeech';
import { startSpeechRecognition, stopSpeechRecognition, isSpeechRecognitionSupported } from '@/lib/speechToText';
import { toast } from '@/hooks/use-toast';
import { useChat } from '@/contexts/ChatContext';

interface VoiceConversationProps {
  onClose: () => void;
}

const bongoResponses = {
  thinking: ["Hold up...", "Ooh, good question...", "Let me think...", "I'm on it..."],
  listening: ["I'm locked in", "Go ahead", "Speak your mind", "I'm listening"],
  ready: ["Say less", "Let's cook", "I'm ready", "What's good?"],
  speaking: ["Check this out", "Here's the deal", "Facts incoming", "Listen up"]
};

const getRandomPhrase = (phrases: string[]) => phrases[Math.floor(Math.random() * phrases.length)];

/** Wiser Robot SVG Icon with "W" badge */
function WiserRobotIcon({ className, isAnimating }: { className?: string; isAnimating?: boolean }) {
  return (
    <svg viewBox="0 0 120 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <rect x="25" y="10" width="70" height="55" rx="18" fill="hsl(210 100% 50%)" opacity="0.9" />
      {/* Antenna */}
      <line x1="60" y1="10" x2="60" y2="2" stroke="hsl(190 95% 55%)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="60" cy="2" r="3" fill="hsl(190 95% 55%)">
        {isAnimating && <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />}
      </circle>
      {/* Eyes */}
      <ellipse cx="43" cy="35" rx="8" ry="8" fill="hsl(190 95% 70%)" opacity="0.95">
        {isAnimating && <animate attributeName="ry" values="8;6;8" dur="2s" repeatCount="indefinite" />}
      </ellipse>
      <ellipse cx="77" cy="35" rx="8" ry="8" fill="hsl(190 95% 70%)" opacity="0.95">
        {isAnimating && <animate attributeName="ry" values="8;6;8" dur="2s" repeatCount="indefinite" />}
      </ellipse>
      {/* Eye shine */}
      <circle cx="46" cy="32" r="2.5" fill="white" opacity="0.8" />
      <circle cx="80" cy="32" r="2.5" fill="white" opacity="0.8" />
      {/* Mouth - smile */}
      <path d="M 43 48 Q 60 58 77 48" stroke="hsl(190 95% 70%)" strokeWidth="2.5" fill="none" strokeLinecap="round">
        {isAnimating && <animate attributeName="d" values="M 43 48 Q 60 58 77 48;M 43 50 Q 60 54 77 50;M 43 48 Q 60 58 77 48" dur="3s" repeatCount="indefinite" />}
      </path>
      {/* Visor line */}
      <rect x="30" y="25" width="60" height="30" rx="8" stroke="hsl(190 95% 55%)" strokeWidth="1" fill="none" opacity="0.3" />
      {/* Body */}
      <rect x="35" y="68" width="50" height="40" rx="12" fill="hsl(210 100% 50%)" opacity="0.8" />
      {/* W Badge */}
      <rect x="43" y="74" width="34" height="28" rx="6" fill="hsl(220 15% 11%)" opacity="0.9" />
      <text x="60" y="96" textAnchor="middle" fill="hsl(210 100% 50%)" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="20">W</text>
      {/* Arms */}
      <rect x="18" y="72" width="14" height="6" rx="3" fill="hsl(210 100% 45%)" opacity="0.7" />
      <rect x="88" y="72" width="14" height="6" rx="3" fill="hsl(210 100% 45%)" opacity="0.7" />
      {/* Feet */}
      <ellipse cx="47" cy="115" rx="10" ry="6" fill="hsl(210 100% 45%)" opacity="0.7" />
      <ellipse cx="73" cy="115" rx="10" ry="6" fill="hsl(210 100% 45%)" opacity="0.7" />
    </svg>
  );
}

/** Animated waveform bars */
function Waveform({ active, audioLevel }: { active: boolean; audioLevel: number }) {
  const bars = 24;
  return (
    <div className="flex items-center justify-center gap-[3px] h-12 w-full max-w-[280px]">
      {[...Array(bars)].map((_, i) => {
        const distance = Math.abs(i - bars / 2) / (bars / 2);
        const baseHeight = active ? 12 + (1 - distance) * 30 : 4;
        const randomFactor = active ? (audioLevel * 40 * Math.sin(Date.now() / 200 + i * 0.5)) : 0;
        const height = Math.max(4, Math.min(48, baseHeight + randomFactor));
        return (
          <div
            key={i}
            className="w-[3px] rounded-full transition-all duration-75"
            style={{
              height: `${height}px`,
              background: active
                ? `linear-gradient(to top, hsl(210 100% 50%), hsl(190 95% 55%))`
                : 'hsl(210 100% 50% / 0.3)',
              opacity: active ? 0.7 + audioLevel * 0.3 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

export function VoiceConversation({ onClose }: VoiceConversationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationActive, setConversationActive] = useState(false);
  const [statusPhrase, setStatusPhrase] = useState(getRandomPhrase(bongoResponses.ready));
  const [audioLevel, setAudioLevel] = useState(0);
  const { currentMode } = useChat();
  
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechRef = useRef<number>(Date.now());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Memoize particles to prevent re-render flicker
  const particles = useMemo(() => 
    [...Array(30)].map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 4}s`,
      size: 1 + Math.random() * 3,
    })), []
  );

  const startAudioVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.error('Audio visualization error:', error);
    }
  }, []);

  const stopAudioVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAudioLevel(0);
  }, []);

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      toast({ title: "Not Supported", description: "Voice input is not supported in your browser", variant: "destructive" });
      return;
    }

    setTranscript('');
    setStatusPhrase(getRandomPhrase(bongoResponses.listening));
    startAudioVisualization();
    
    const started = startSpeechRecognition({
      continuous: true,
      onResult: (text) => {
        setTranscript(text);
        lastSpeechRef.current = Date.now();
        
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        
        silenceTimeoutRef.current = setTimeout(() => {
          if (text.trim()) {
            stopSpeechRecognition();
            setIsListening(false);
            stopAudioVisualization();
            processVoiceInput(text.trim());
          }
        }, 2500);
      },
      onStart: () => setIsListening(true),
      onEnd: () => {
        setIsListening(false);
        stopAudioVisualization();
        if (transcript.trim()) processVoiceInput(transcript.trim());
      },
      onError: (error) => {
        setIsListening(false);
        stopAudioVisualization();
        if (error !== 'No speech detected. Please try again.') {
          toast({ title: "Voice Error", description: error, variant: "destructive" });
        }
      }
    });

    if (!started) {
      toast({ title: "Error", description: "Failed to start voice recognition", variant: "destructive" });
    }
  }, [transcript, startAudioVisualization, stopAudioVisualization]);

  const stopListening = useCallback(() => {
    stopSpeechRecognition();
    setIsListening(false);
    stopAudioVisualization();
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
  }, [stopAudioVisualization]);

  const processVoiceInput = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setAiResponse('');
    setStatusPhrase(getRandomPhrase(bongoResponses.thinking));

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }],
            mode: currentMode,
            isVoice: true
          })
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                fullResponse += parsed.choices?.[0]?.delta?.content || '';
              } catch {
                fullResponse += data;
              }
            }
          }
        }
      }

      setAiResponse(fullResponse || 'I received your message.');
      setStatusPhrase(getRandomPhrase(bongoResponses.speaking));

      if (!isMuted && fullResponse) {
        const voiceSettings = getVoiceSettings();
        setIsSpeaking(true);
        speak({
          text: fullResponse,
          voice: voiceSettings.voiceId,
          rate: voiceSettings.speed,
          useElevenLabs: voiceSettings.useElevenLabs,
          onEnd: () => {
            setIsSpeaking(false);
            setStatusPhrase(getRandomPhrase(bongoResponses.ready));
            if (conversationActive) setTimeout(startListening, 500);
          },
          onError: () => {
            setIsSpeaking(false);
            setStatusPhrase(getRandomPhrase(bongoResponses.ready));
            if (conversationActive) setTimeout(startListening, 500);
          }
        });
      } else if (conversationActive) {
        setTimeout(startListening, 500);
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      toast({ title: "Error", description: "Failed to get AI response. Please try again.", variant: "destructive" });
      setStatusPhrase(getRandomPhrase(bongoResponses.ready));
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleConversation = useCallback(() => {
    if (conversationActive) {
      setConversationActive(false);
      stopListening();
      stopSpeaking();
      setStatusPhrase(getRandomPhrase(bongoResponses.ready));
    } else {
      setConversationActive(true);
      startListening();
    }
  }, [conversationActive, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopSpeechRecognition();
      stopAudioVisualization();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, [stopAudioVisualization]);

  const isActive = isListening || isSpeaking || isProcessing;

  return (
    <div className="voice-conversation-overlay fixed top-16 inset-x-0 bottom-0 z-50 md:absolute md:top-0 md:inset-0 flex flex-col items-center justify-between overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,30%,8%)] via-[hsl(260,40%,15%)] to-[hsl(210,60%,10%)]" />
      
      {/* Animated glow overlay */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        isListening && "opacity-60",
        isSpeaking && "opacity-40",
        !isActive && "opacity-20"
      )} style={{
        background: 'radial-gradient(ellipse at 50% 40%, hsl(210 100% 50% / 0.15) 0%, transparent 70%)',
      }} />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/20 animate-pulse"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 w-full flex items-center justify-between px-5 pt-5">
        <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
          Wiser AI Voice
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-6 flex-1 justify-center w-full max-w-md px-4">
        
        {/* Robot icon in dotted circle */}
        <div className="relative">
          {/* Outer pulsing ring */}
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-500",
            isListening && "shadow-[0_0_80px_20px_hsl(210,100%,50%,0.3)] animate-pulse",
            isSpeaking && "shadow-[0_0_80px_20px_hsl(190,95%,45%,0.3)] animate-pulse",
            isProcessing && "shadow-[0_0_60px_15px_hsl(210,100%,50%,0.2)]",
          )} style={{ margin: '-20px' }} />

          {/* Dotted circle border */}
          <div 
            className={cn(
              "relative w-44 h-44 rounded-full flex items-center justify-center transition-all duration-500",
              isProcessing && "animate-spin-slow"
            )}
            style={{
              border: '2.5px dashed hsl(210 100% 50% / 0.5)',
              background: isListening 
                ? 'radial-gradient(circle, hsl(210 100% 50% / 0.12) 0%, transparent 70%)'
                : isSpeaking
                ? 'radial-gradient(circle, hsl(190 95% 45% / 0.12) 0%, transparent 70%)'
                : 'radial-gradient(circle, hsl(210 100% 50% / 0.06) 0%, transparent 70%)',
            }}
          >
            {/* Robot icon */}
            <WiserRobotIcon 
              className={cn(
                "w-24 h-28 transition-transform duration-300",
                isSpeaking && "voice-bounce"
              )}
              isAnimating={isActive}
            />

            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                <Loader2 className="h-8 w-8 animate-spin text-primary absolute opacity-40" />
              </div>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            {isListening ? 'Voice Recognition' : isSpeaking ? 'Speaking...' : isProcessing ? 'Processing...' : 'Tap to speak'}
          </h2>
          <p className="text-sm text-primary font-medium">{statusPhrase}</p>
          <p className="text-xs text-muted-foreground">
            {conversationActive 
              ? '🔥 Continuous mode active' 
              : isListening 
              ? 'Listening to your voice...'
              : isSpeaking
              ? 'Playing response...'
              : isProcessing
              ? 'Thinking...'
              : 'Tap the robot to start'}
          </p>
        </div>

        {/* Transcript display */}
        {(transcript || aiResponse) && (
          <div className="w-full space-y-2.5 max-h-40 overflow-y-auto px-2">
            {transcript && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 backdrop-blur-sm">
                <span className="text-primary text-[10px] font-bold uppercase tracking-widest">You</span>
                <p className="text-foreground text-sm mt-1">{transcript}</p>
              </div>
            )}
            {aiResponse && (
              <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3.5 backdrop-blur-sm">
                <span className="text-secondary text-[10px] font-bold uppercase tracking-widest">Wiser AI</span>
                <p className="text-foreground text-sm mt-1 line-clamp-3">{cleanTextForSpeech(aiResponse).slice(0, 200)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 w-full flex flex-col items-center gap-5 pb-8 px-4">
        {/* Waveform */}
        <Waveform active={isListening || isSpeaking} audioLevel={audioLevel} />

        {/* Control buttons */}
        <div className="flex items-center gap-8">
          {/* Mute */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full border-2 transition-all duration-300",
              isMuted 
                ? "border-destructive/50 bg-destructive/10 hover:bg-destructive/20" 
                : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
            )}
            onClick={() => {
              setIsMuted(!isMuted);
              if (isSpeaking) stopSpeaking();
            }}
          >
            {isMuted ? <VolumeX className="h-5 w-5 text-destructive" /> : <Volume2 className="h-5 w-5 text-primary" />}
          </Button>

          {/* Main action button */}
          <button
            className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
              isListening 
                ? "bg-primary shadow-[0_0_40px_8px_hsl(210,100%,50%,0.4)]" 
                : "bg-primary/80 hover:bg-primary shadow-[0_0_20px_4px_hsl(210,100%,50%,0.2)]",
              (isProcessing || isSpeaking) && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => isListening ? stopListening() : startListening()}
            disabled={isProcessing || isSpeaking}
          >
            <WiserRobotIcon className="w-12 h-14" isAnimating={isListening} />
          </button>

          {/* Continuous mode */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full border-2 transition-all duration-300",
              conversationActive 
                ? "border-success/50 bg-success/10 hover:bg-success/20 shadow-[0_0_20px_hsl(142,76%,36%,0.3)]" 
                : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
            )}
            onClick={toggleConversation}
          >
            {conversationActive ? <PhoneOff className="h-5 w-5 text-success" /> : <Phone className="h-5 w-5 text-primary" />}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          {conversationActive 
            ? 'Continuous mode • Tap phone to end' 
            : 'Tap phone for hands-free conversation'}
        </p>
      </div>

      <style>{`
        @keyframes voice-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .voice-bounce {
          animation: voice-bounce 0.5s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
