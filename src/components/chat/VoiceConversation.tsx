import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { speak, stopSpeaking, getVoiceSettings, cleanTextForSpeech } from '@/lib/textToSpeech';
import { startSpeechRecognition, stopSpeechRecognition, isSpeechRecognitionSupported } from '@/lib/speechToText';
import { toast } from '@/hooks/use-toast';
import { useChat } from '@/contexts/ChatContext';
import wiserLogo from '@/assets/wiser-ai-logo.png';

interface VoiceConversationProps {
  onClose: () => void;
}

// BONGO Voice personality phrases
const bongoResponses = {
  thinking: ["Hold up...", "Ooh, good question...", "Let me think...", "I'm on it..."],
  listening: ["I'm locked in", "Go ahead", "Speak your mind", "I'm listening"],
  ready: ["Say less", "Let's cook", "I'm ready", "What's good?"],
  speaking: ["Check this out", "Here's the deal", "Facts incoming", "Listen up"]
};

const getRandomPhrase = (phrases: string[]) => phrases[Math.floor(Math.random() * phrases.length)];

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
  const { currentMode, currentModel } = useChat();
  
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechRef = useRef<number>(Date.now());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio visualization
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

  // Start listening for voice input
  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in your browser",
        variant: "destructive"
      });
      return;
    }

    setTranscript('');
    setStatusPhrase(getRandomPhrase(bongoResponses.listening));
    startAudioVisualization();
    
    const started = startSpeechRecognition({
      onResult: (text) => {
        setTranscript(text);
        lastSpeechRef.current = Date.now();
        
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        silenceTimeoutRef.current = setTimeout(() => {
          if (text.trim()) {
            stopSpeechRecognition();
            setIsListening(false);
            stopAudioVisualization();
            processVoiceInput(text.trim());
          }
        }, 2000);
      },
      onStart: () => setIsListening(true),
      onEnd: () => {
        setIsListening(false);
        stopAudioVisualization();
        if (transcript.trim()) {
          processVoiceInput(transcript.trim());
        }
      },
      onError: (error) => {
        setIsListening(false);
        stopAudioVisualization();
        toast({
          title: "Voice Error",
          description: error,
          variant: "destructive"
        });
      }
    });

    if (!started) {
      toast({
        title: "Error",
        description: "Failed to start voice recognition",
        variant: "destructive"
      });
    }
  }, [transcript, startAudioVisualization, stopAudioVisualization]);

  const stopListening = useCallback(() => {
    stopSpeechRecognition();
    setIsListening(false);
    stopAudioVisualization();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  }, [stopAudioVisualization]);

  // Process voice input and get AI response
  const processVoiceInput = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setAiResponse('');
    setStatusPhrase(getRandomPhrase(bongoResponses.thinking));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }],
            mode: currentMode,
            model: currentModel,
            isVoice: true
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

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
                const content = parsed.choices?.[0]?.delta?.content || '';
                fullResponse += content;
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
            if (conversationActive) {
              setTimeout(startListening, 500);
            }
          },
          onError: () => {
            setIsSpeaking(false);
            setStatusPhrase(getRandomPhrase(bongoResponses.ready));
            if (conversationActive) {
              setTimeout(startListening, 500);
            }
          }
        });
      } else if (conversationActive) {
        setTimeout(startListening, 500);
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
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
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [stopAudioVisualization]);

  // Dynamic orb size based on audio level
  const orbScale = 1 + (audioLevel * 0.3);

  return (
    <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-2 h-2 rounded-full opacity-20 animate-pulse",
              isListening ? "bg-cyan-400" : isSpeaking ? "bg-purple-400" : "bg-primary/30"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 h-10 w-10 hover:bg-destructive/20"
        onClick={onClose}
      >
        <PhoneOff className="h-5 w-5" />
      </Button>

      {/* Main visualization */}
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* AI Avatar with dynamic orb effect */}
        <div className="relative">
          {/* Outer glow rings */}
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            isListening && "animate-ping bg-cyan-500/20",
            isSpeaking && "animate-pulse bg-purple-500/30",
            isProcessing && "animate-spin-slow bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20"
          )} style={{ transform: `scale(${orbScale * 1.5})` }} />
          
          {/* Main orb container */}
          <div 
            className={cn(
              "relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300",
              isListening && "bg-gradient-to-br from-cyan-500/30 to-blue-600/30 shadow-[0_0_60px_rgba(14,165,233,0.5)]",
              isSpeaking && "bg-gradient-to-br from-purple-500/30 to-pink-500/30 shadow-[0_0_60px_rgba(168,85,247,0.5)]",
              isProcessing && "bg-gradient-to-br from-amber-500/30 to-orange-500/30 shadow-[0_0_60px_rgba(245,158,11,0.4)]",
              !isListening && !isSpeaking && !isProcessing && "bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-[0_0_30px_rgba(var(--primary),0.3)]"
            )}
            style={{ transform: `scale(${orbScale})` }}
          >
            {/* Inner gradient ring */}
            <div className={cn(
              "absolute inset-2 rounded-full",
              isListening && "bg-gradient-to-tr from-cyan-400/10 to-transparent animate-pulse",
              isSpeaking && "bg-gradient-to-tr from-purple-400/10 to-transparent animate-pulse"
            )} />
            
            {/* Logo */}
            <img 
              src={wiserLogo} 
              alt="Wiser AI" 
              className={cn(
                "w-24 h-24 object-contain transition-all duration-300 z-10",
                isSpeaking && "animate-bounce-subtle"
              )}
            />
            
            {/* Processing spinner overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 animate-spin" />
                <Loader2 className="h-10 w-10 animate-spin text-amber-400 absolute" />
              </div>
            )}
          </div>

          {/* Audio level indicator bars */}
          {isListening && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-full transition-all duration-100"
                  style={{ 
                    height: `${Math.max(8, audioLevel * 100 * (0.5 + Math.random() * 0.5))}%`,
                    opacity: 0.6 + audioLevel * 0.4
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status text with BONGO personality */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {(isListening || isSpeaking || isProcessing) && (
              <Sparkles className={cn(
                "h-5 w-5",
                isListening && "text-cyan-400",
                isSpeaking && "text-purple-400",
                isProcessing && "text-amber-400"
              )} />
            )}
            <h2 className={cn(
              "text-2xl font-bold tracking-tight",
              isListening && "text-cyan-400",
              isSpeaking && "text-purple-400",
              isProcessing && "text-amber-400"
            )}>
              {statusPhrase}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {conversationActive 
              ? '🔥 Continuous mode active' 
              : isListening 
              ? '🎤 Speak now...'
              : isSpeaking
              ? '🎵 Playing response...'
              : isProcessing
              ? '🧠 Cooking up something...'
              : 'Tap the mic to start'}
          </p>
        </div>

        {/* Transcript display with improved styling */}
        {(transcript || aiResponse) && (
          <div className="w-full space-y-3 max-h-48 overflow-y-auto px-4">
            {transcript && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 backdrop-blur-sm">
                <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">You</span>
                <p className="text-foreground mt-1">{transcript}</p>
              </div>
            )}
            {aiResponse && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 backdrop-blur-sm">
                <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Wiser AI</span>
                <p className="text-foreground mt-1 line-clamp-4">{cleanTextForSpeech(aiResponse).slice(0, 250)}...</p>
              </div>
            )}
          </div>
        )}

        {/* Control buttons with enhanced styling */}
        <div className="flex items-center gap-6 mt-4">
          {/* Mute toggle */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full border-2 transition-all duration-300",
              isMuted 
                ? "border-destructive/50 bg-destructive/10 hover:bg-destructive/20" 
                : "border-muted-foreground/30 hover:border-primary/50"
            )}
            onClick={() => {
              setIsMuted(!isMuted);
              if (isSpeaking) stopSpeaking();
            }}
          >
            {isMuted ? <VolumeX className="h-6 w-6 text-destructive" /> : <Volume2 className="h-6 w-6" />}
          </Button>

          {/* Main mic button */}
          <Button
            size="icon"
            className={cn(
              "h-20 w-20 rounded-full transition-all duration-300 shadow-lg",
              isListening 
                ? "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-[0_0_30px_rgba(14,165,233,0.5)]" 
                : "bg-gradient-to-br from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
            )}
            onClick={() => isListening ? stopListening() : startListening()}
            disabled={isProcessing || isSpeaking}
          >
            {isListening ? (
              <MicOff className="h-9 w-9" />
            ) : (
              <Mic className="h-9 w-9" />
            )}
          </Button>

          {/* Continuous mode toggle */}
          <Button
            variant={conversationActive ? "default" : "outline"}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full border-2 transition-all duration-300",
              conversationActive 
                ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 hover:from-green-600 hover:to-emerald-700 shadow-[0_0_20px_rgba(34,197,94,0.4)]" 
                : "border-muted-foreground/30 hover:border-green-500/50"
            )}
            onClick={toggleConversation}
          >
            {conversationActive ? <PhoneOff className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {conversationActive 
            ? 'Continuous conversation active • Press phone to end' 
            : 'Press phone for hands-free mode'}
        </p>
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 0.6s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
