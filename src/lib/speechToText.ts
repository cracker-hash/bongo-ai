// Speech-to-Text utility with deduplication and continuous mode

interface SpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
}

let recognitionInstance: any = null;
let lastTranscript = '';
let shouldAutoRestart = false;

/**
 * Deduplicates transcript by removing repeated words/phrases
 */
function deduplicateTranscript(transcript: string): string {
  const words = transcript.trim().split(/\s+/);
  if (words.length <= 2) return transcript;

  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    let foundRepeat = false;
    
    for (let seqLen = 1; seqLen <= 5 && i + seqLen * 2 <= words.length; seqLen++) {
      const seq1 = words.slice(i, i + seqLen).join(' ').toLowerCase();
      const seq2 = words.slice(i + seqLen, i + seqLen * 2).join(' ').toLowerCase();
      
      if (seq1 === seq2) {
        result.push(...words.slice(i, i + seqLen));
        i += seqLen * 2;
        
        while (i + seqLen <= words.length) {
          const nextSeq = words.slice(i, i + seqLen).join(' ').toLowerCase();
          if (nextSeq === seq1) {
            i += seqLen;
          } else {
            break;
          }
        }
        
        foundRepeat = true;
        break;
      }
    }
    
    if (!foundRepeat) {
      result.push(words[i]);
      i++;
    }
  }

  return result.join(' ');
}

/**
 * Normalizes the transcript by cleaning up common issues
 */
function normalizeTranscript(transcript: string): string {
  let normalized = transcript.trim();
  normalized = normalized.replace(/\s+/g, ' ');
  
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  
  normalized = deduplicateTranscript(normalized);
  return normalized;
}

/**
 * Starts speech recognition
 */
export function startSpeechRecognition(options: SpeechRecognitionOptions): boolean {
  const SpeechRecognition = (window as any).SpeechRecognition || 
                            (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    options.onError?.('Speech recognition not supported in your browser');
    return false;
  }

  // Stop any existing recognition
  stopSpeechRecognition();

  const isContinuous = options.continuous ?? false;
  shouldAutoRestart = isContinuous;

  recognitionInstance = new SpeechRecognition();
  recognitionInstance.continuous = isContinuous;
  recognitionInstance.interimResults = true;
  recognitionInstance.lang = options.language || 'en-US';
  recognitionInstance.maxAlternatives = 1;

  // Reset state
  lastTranscript = '';

  recognitionInstance.onstart = () => {
    options.onStart?.();
  };

  recognitionInstance.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      const normalized = normalizeTranscript(finalTranscript);
      if (normalized !== lastTranscript && normalized.length > 0) {
        lastTranscript = normalized;
        options.onResult(normalized);
      }
    }
  };

  recognitionInstance.onerror = (event: any) => {
    switch (event.error) {
      case 'no-speech':
        // In continuous mode, don't treat no-speech as a fatal error
        if (!isContinuous) {
          options.onError?.('No speech detected. Please try again.');
        }
        break;
      case 'audio-capture':
        options.onError?.('No microphone found. Please check your settings.');
        shouldAutoRestart = false;
        break;
      case 'not-allowed':
        options.onError?.('Microphone permission denied. Please allow access.');
        shouldAutoRestart = false;
        break;
      case 'aborted':
        shouldAutoRestart = false;
        break;
      default:
        options.onError?.(`Speech recognition error: ${event.error}`);
        shouldAutoRestart = false;
    }
  };

  recognitionInstance.onend = () => {
    // Auto-restart in continuous mode unless explicitly stopped
    if (shouldAutoRestart && recognitionInstance) {
      try {
        recognitionInstance.start();
        return; // Don't fire onEnd when auto-restarting
      } catch (e) {
        // Fall through to onEnd
      }
    }
    options.onEnd?.();
    recognitionInstance = null;
  };

  try {
    recognitionInstance.start();
    return true;
  } catch (error) {
    options.onError?.('Failed to start speech recognition');
    return false;
  }
}

/**
 * Stops speech recognition
 */
export function stopSpeechRecognition(): void {
  shouldAutoRestart = false;
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (e) {
      // Ignore errors when stopping
    }
    recognitionInstance = null;
  }
}

/**
 * Checks if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition
  );
}
