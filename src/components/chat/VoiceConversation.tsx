import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { speak, stopSpeaking, getVoiceSettings, cleanTextForSpeech } from '@/lib/textToSpeech';
import { startSpeechRecognition, stopSpeechRecognition, isSpeechRecognitionSupported } from '@/lib/speechToText';
import { toast } from '@/hooks/use-toast';
import { useChat } from '@/contexts/ChatContext';
import wiserLogo from '@/assets/wiser-ai-logo.png';

interface VoiceConversationProps {
  onClose: () => void;
}

export function VoiceConversation({ onClose }: VoiceConversationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationActive, setConversationActive] = useState(false);
  const { currentMode, currentModel } = useChat();
  
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechRef = useRef<number>(Date.now());

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
    
    const started = startSpeechRecognition({
      onResult: (text) => {
        setTranscript(text);
        lastSpeechRef.current = Date.now();
        
        // Reset silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Auto-send after 2 seconds of silence
        silenceTimeoutRef.current = setTimeout(() => {
          if (text.trim()) {
            stopSpeechRecognition();
            setIsListening(false);
            processVoiceInput(text.trim());
          }
        }, 2000);
      },
      onStart: () => setIsListening(true),
      onEnd: () => {
        setIsListening(false);
        // Process if we have a transcript
        if (transcript.trim()) {
          processVoiceInput(transcript.trim());
        }
      },
      onError: (error) => {
        setIsListening(false);
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
  }, [transcript]);

  const stopListening = useCallback(() => {
    stopSpeechRecognition();
    setIsListening(false);
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  }, []);

  // Process voice input and get AI response
  const processVoiceInput = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setAiResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: [{ role: 'user', content: text }],
          mode: currentMode,
          model: currentModel
        }
      });

      if (error) throw error;

      const response = data.response || data.message || '';
      setAiResponse(response);

      // Speak the response
      if (!isMuted && response) {
        const voiceSettings = getVoiceSettings();
        setIsSpeaking(true);
        
        speak({
          text: response,
          voice: voiceSettings.voiceId,
          rate: voiceSettings.speed,
          useElevenLabs: voiceSettings.useElevenLabs,
          onEnd: () => {
            setIsSpeaking(false);
            // Auto-continue listening in conversation mode
            if (conversationActive) {
              setTimeout(startListening, 500);
            }
          },
          onError: () => {
            setIsSpeaking(false);
            if (conversationActive) {
              setTimeout(startListening, 500);
            }
          }
        });
      } else if (conversationActive) {
        // If muted, just continue listening
        setTimeout(startListening, 500);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle continuous conversation mode
  const toggleConversation = useCallback(() => {
    if (conversationActive) {
      setConversationActive(false);
      stopListening();
      stopSpeaking();
    } else {
      setConversationActive(true);
      startListening();
    }
  }, [conversationActive, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopSpeechRecognition();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  // Visual feedback animation
  const pulseClass = isListening 
    ? "animate-pulse shadow-[0_0_30px_rgba(14,165,233,0.5)]" 
    : isSpeaking 
    ? "animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.5)]"
    : "";

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 h-10 w-10"
        onClick={onClose}
      >
        <PhoneOff className="h-5 w-5" />
      </Button>

      {/* Main visualization */}
      <div className="flex flex-col items-center gap-8 max-w-md w-full">
        {/* AI Avatar with pulse effect */}
        <div className={cn(
          "relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center transition-all duration-300",
          pulseClass
        )}>
          <img 
            src={wiserLogo} 
            alt="Wiser AI" 
            className="w-20 h-20 object-contain"
          />
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Status text */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">
            {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : 'Voice Chat'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {conversationActive 
              ? 'Continuous conversation mode active' 
              : 'Tap the mic to speak'}
          </p>
        </div>

        {/* Transcript display */}
        {(transcript || aiResponse) && (
          <div className="w-full space-y-3 max-h-48 overflow-y-auto">
            {transcript && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground text-xs">You:</span>
                <p>{transcript}</p>
              </div>
            )}
            {aiResponse && (
              <div className="bg-primary/10 rounded-lg p-3 text-sm">
                <span className="text-primary text-xs">Wiser AI:</span>
                <p className="line-clamp-4">{cleanTextForSpeech(aiResponse).slice(0, 200)}...</p>
              </div>
            )}
          </div>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-4">
          {/* Mute toggle */}
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => {
              setIsMuted(!isMuted);
              if (isSpeaking) stopSpeaking();
            }}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          {/* Main mic button */}
          <Button
            size="icon"
            className={cn(
              "h-16 w-16 rounded-full transition-all",
              isListening 
                ? "bg-destructive hover:bg-destructive/90" 
                : "gradient-bg hover:opacity-90"
            )}
            onClick={() => isListening ? stopListening() : startListening()}
            disabled={isProcessing || isSpeaking}
          >
            {isListening ? (
              <MicOff className="h-7 w-7" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
          </Button>

          {/* Continuous mode toggle */}
          <Button
            variant={conversationActive ? "default" : "outline"}
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full",
              conversationActive && "bg-green-600 hover:bg-green-700"
            )}
            onClick={toggleConversation}
          >
            {conversationActive ? <PhoneOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {conversationActive 
            ? 'Press the phone button to end continuous mode' 
            : 'Press the phone button for continuous conversation'}
        </p>
      </div>
    </div>
  );
}
