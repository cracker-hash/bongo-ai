// Text-to-Speech utility with ElevenLabs integration and Swahili support
import { supabase } from "@/integrations/supabase/client";

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Cleans text for speech synthesis by removing markdown, symbols, and formatting
 */
export function cleanTextForSpeech(text: string): string {
  let cleaned = text;

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' code block ');
  cleaned = cleaned.replace(/`[^`]+`/g, ' code ');

  // Remove markdown formatting
  cleaned = cleaned.replace(/#{1,6}\s*/g, '');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');

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

  // Remove emojis
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

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

// Available ElevenLabs voices
export const ELEVENLABS_VOICES: VoiceOption[] = [
  { id: 'sarah', name: 'Sarah', description: 'Female - Clear and warm' },
  { id: 'rachel', name: 'Rachel', description: 'Female - Professional' },
  { id: 'alice', name: 'Alice', description: 'Female - Friendly' },
  { id: 'lily', name: 'Lily', description: 'Female - Soft and calm' },
  { id: 'matilda', name: 'Matilda', description: 'Female - Expressive' },
  { id: 'jessica', name: 'Jessica', description: 'Female - Conversational' },
  { id: 'roger', name: 'Roger', description: 'Male - Deep and clear' },
  { id: 'brian', name: 'Brian', description: 'Male - Natural' },
  { id: 'george', name: 'George', description: 'Male - British accent' },
  { id: 'eric', name: 'Eric', description: 'Male - Friendly' },
  { id: 'chris', name: 'Chris', description: 'Male - Energetic' },
  { id: 'daniel', name: 'Daniel', description: 'Male - Authoritative' },
];

interface SpeakOptions {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  lang?: string;
  useElevenLabs?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

let currentAudio: HTMLAudioElement | null = null;

/**
 * Speaks text using ElevenLabs API
 */
async function speakWithElevenLabs(options: SpeakOptions): Promise<void> {
  const cleanedText = cleanTextForSpeech(options.text);
  
  if (!cleanedText) {
    options.onEnd?.();
    return;
  }

  try {
    options.onStart?.();
    
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Please sign in to use text-to-speech');
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: cleanedText,
          voiceId: options.voice || 'sarah',
          speed: options.rate || 1,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'TTS request failed');
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      throw new Error('No audio content received');
    }

    // Use data URI for reliable audio playback
    const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
    
    // Stop any current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const audio = new Audio(audioUrl);
    currentAudio = audio;
    
    audio.onended = () => {
      currentAudio = null;
      options.onEnd?.();
    };
    
    audio.onerror = () => {
      currentAudio = null;
      options.onError?.(new Error('Audio playback failed'));
    };

    await audio.play();
  } catch (error) {
    options.onError?.(error instanceof Error ? error : new Error('TTS failed'));
  }
}

/**
 * Detects if text contains Swahili words
 */
function containsSwahili(text: string): boolean {
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
 * Speaks text using Web Speech API as fallback
 */
function speakWithWebSpeech(options: SpeakOptions): SpeechSynthesisUtterance | null {
  if (!('speechSynthesis' in window)) {
    options.onError?.(new Error('Speech synthesis not supported'));
    return null;
  }

  speechSynthesis.cancel();

  const cleanedText = cleanTextForSpeech(options.text);
  const utterance = new SpeechSynthesisUtterance(cleanedText);

  const voices = speechSynthesis.getVoices();
  const isSwahili = options.lang === 'sw' || containsSwahili(cleanedText);
  
  if (isSwahili) {
    const swahiliVoice = voices.find(v => 
      v.lang.toLowerCase().includes('sw') || 
      v.lang.toLowerCase().includes('swahili')
    );
    
    if (swahiliVoice) {
      utterance.voice = swahiliVoice;
      utterance.lang = swahiliVoice.lang;
    } else {
      const africanVoice = voices.find(v => 
        v.lang.includes('en-KE') || v.lang.includes('en-TZ') || 
        v.lang.includes('en-ZA') || v.lang.includes('en-NG')
      );
      
      if (africanVoice) {
        utterance.voice = africanVoice;
      } else {
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) utterance.voice = englishVoice;
      }
      utterance.lang = 'sw-TZ';
    }
    utterance.rate = options.rate ?? 0.85;
  } else if (options.voice) {
    const matchingVoice = voices.find(v => 
      v.name.toLowerCase().includes(options.voice!.toLowerCase()) ||
      v.lang.toLowerCase().includes(options.voice!.toLowerCase())
    );
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.rate = options.rate ?? 1;
  } else {
    utterance.rate = options.rate ?? 1;
  }

  utterance.pitch = options.pitch ?? 1;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (event) => options.onError?.(new Error(event.error));

  speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Speaks the given text using ElevenLabs or Web Speech API
 */
export function speak(options: SpeakOptions): void {
  const useElevenLabs = options.useElevenLabs !== false; // Default to true
  
  if (useElevenLabs) {
    speakWithElevenLabs(options);
  } else {
    speakWithWebSpeech(options);
  }
}

/**
 * Stops any ongoing speech
 */
export function stopSpeaking(): void {
  // Stop ElevenLabs audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  // Stop Web Speech API
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

/**
 * Gets available Web Speech voices
 */
export function getVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices();
}

/**
 * Gets voice settings from localStorage
 */
export function getVoiceSettings(): { enabled: boolean; voiceId: string; speed: number; useElevenLabs: boolean } {
  const stored = localStorage.getItem('wiser_voice');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }
  return { enabled: true, voiceId: 'sarah', speed: 1, useElevenLabs: true };
}

/**
 * Saves voice settings to localStorage
 */
export function saveVoiceSettings(settings: { enabled: boolean; voiceId: string; speed: number; useElevenLabs: boolean }): void {
  localStorage.setItem('wiser_voice', JSON.stringify(settings));
}
