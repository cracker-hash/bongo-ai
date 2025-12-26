// Text-to-Speech utility with proper text cleaning

/**
 * Cleans text for speech synthesis by removing markdown, symbols, and formatting
 */
export function cleanTextForSpeech(text: string): string {
  let cleaned = text;

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' code block ');
  cleaned = cleaned.replace(/`[^`]+`/g, ' code ');

  // Remove markdown formatting
  cleaned = cleaned.replace(/#{1,6}\s*/g, ''); // Headers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // Italic
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1'); // Bold
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1'); // Italic
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1'); // Strikethrough

  // Remove bullet points and list markers
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');

  // Remove links but keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');

  // Remove blockquotes
  cleaned = cleaned.replace(/^>\s*/gm, '');

  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}$/gm, '');

  // Remove special characters and symbols
  cleaned = cleaned.replace(/[#*_~`|<>{}[\]()\\]/g, '');

  // Remove emojis (basic pattern)
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();

  return cleaned;
}

interface SpeakOptions {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Detects if text contains Swahili words
 */
function containsSwahili(text: string): boolean {
  // Common Swahili words and patterns
  const swahiliPatterns = [
    /\b(habari|jambo|karibu|asante|sana|ndio|hapana|ndiyo|kwa|na|ya|wa|ni|la|za)\b/i,
    /\b(mimi|wewe|yeye|sisi|ninyi|wao)\b/i,
    /\b(nyumba|mtu|watu|mtoto|watoto|mama|baba|kaka|dada)\b/i,
    /\b(chakula|maji|kazi|shule|hospitali|duka|soko)\b/i,
    /\b(sasa|kesho|jana|leo|usiku|asubuhi|jioni)\b/i,
    /\b(nzuri|mbaya|kubwa|ndogo|mzuri|vizuri)\b/i,
    /\b(kwenda|kuja|kula|kunywa|kulala|kusoma)\b/i,
    /\b(rafiki|jirani|mwalimu|daktari|askari)\b/i,
  ];
  
  return swahiliPatterns.some(pattern => pattern.test(text));
}

/**
 * Speaks the given text using the Web Speech API with Swahili support
 */
export function speak(options: SpeakOptions): SpeechSynthesisUtterance | null {
  if (!('speechSynthesis' in window)) {
    options.onError?.(new Error('Speech synthesis not supported'));
    return null;
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const cleanedText = cleanTextForSpeech(options.text);
  const utterance = new SpeechSynthesisUtterance(cleanedText);

  // Get available voices
  const voices = speechSynthesis.getVoices();
  
  // Detect language - check if text contains Swahili
  const isSwahili = options.lang === 'sw' || containsSwahili(cleanedText);
  
  // Try to find a matching voice
  if (isSwahili) {
    // Look for Swahili voice first
    const swahiliVoice = voices.find(v => 
      v.lang.toLowerCase().includes('sw') || 
      v.lang.toLowerCase().includes('swahili')
    );
    
    if (swahiliVoice) {
      utterance.voice = swahiliVoice;
      utterance.lang = swahiliVoice.lang;
    } else {
      // Fallback: Use a clear English voice with slower rate for Swahili
      // African English voices or general English voices work better
      const africanVoice = voices.find(v => 
        v.lang.includes('en-KE') || // Kenyan English
        v.lang.includes('en-TZ') || // Tanzanian English  
        v.lang.includes('en-ZA') || // South African English
        v.lang.includes('en-NG')    // Nigerian English
      );
      
      if (africanVoice) {
        utterance.voice = africanVoice;
      } else {
        // Use any English voice but slow down for clarity
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }
      utterance.lang = 'sw-TZ'; // Set Swahili language hint
    }
    
    // Slower rate for clearer Swahili pronunciation
    utterance.rate = options.rate ?? 0.85;
  } else if (options.voice) {
    const matchingVoice = voices.find(v => 
      v.name.toLowerCase().includes(options.voice!.toLowerCase()) ||
      v.lang.toLowerCase().includes(options.voice!.toLowerCase())
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    utterance.rate = options.rate ?? 1;
  } else {
    utterance.rate = options.rate ?? 1;
  }

  // Apply other settings
  utterance.pitch = options.pitch ?? 1;

  // Event handlers
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (event) => options.onError?.(new Error(event.error));

  speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stops any ongoing speech
 */
export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

/**
 * Gets available voices
 */
export function getVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices();
}
