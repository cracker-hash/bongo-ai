// Speech-to-Text utility with deduplication

interface SpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  language?: string;
}

let recognitionInstance: any = null;
let lastTranscript = '';
let transcriptBuffer: string[] = [];

/**
 * Deduplicates transcript by removing repeated words/phrases
 */
function deduplicateTranscript(transcript: string): string {
  // Split into words
  const words = transcript.trim().split(/\s+/);
  if (words.length <= 2) return transcript;

  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    // Check for repeated sequences
    let foundRepeat = false;
    
    // Try different sequence lengths (1 to 5 words)
    for (let seqLen = 1; seqLen <= 5 && i + seqLen * 2 <= words.length; seqLen++) {
      const seq1 = words.slice(i, i + seqLen).join(' ').toLowerCase();
      const seq2 = words.slice(i + seqLen, i + seqLen * 2).join(' ').toLowerCase();
      
      if (seq1 === seq2) {
        // Found a repeat - add sequence once and skip the duplicate
        result.push(...words.slice(i, i + seqLen));
        i += seqLen * 2;
        
        // Continue skipping if there are more repeats of the same sequence
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
  
  // Remove multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Capitalize first letter
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  
  // Deduplicate repeated phrases
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

  recognitionInstance = new SpeechRecognition();
  recognitionInstance.continuous = false;
  recognitionInstance.interimResults = true;
  recognitionInstance.lang = options.language || 'en-US';
  recognitionInstance.maxAlternatives = 1;

  // Reset state
  lastTranscript = '';
  transcriptBuffer = [];

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

    // Process final transcript
    if (finalTranscript) {
      const normalized = normalizeTranscript(finalTranscript);
      
      // Avoid sending duplicate results
      if (normalized !== lastTranscript && normalized.length > 0) {
        lastTranscript = normalized;
        options.onResult(normalized);
      }
    }
  };

  recognitionInstance.onerror = (event: any) => {
    switch (event.error) {
      case 'no-speech':
        options.onError?.('No speech detected. Please try again.');
        break;
      case 'audio-capture':
        options.onError?.('No microphone found. Please check your settings.');
        break;
      case 'not-allowed':
        options.onError?.('Microphone permission denied. Please allow access.');
        break;
      case 'aborted':
        // User cancelled - don't show error
        break;
      default:
        options.onError?.(`Speech recognition error: ${event.error}`);
    }
  };

  recognitionInstance.onend = () => {
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
