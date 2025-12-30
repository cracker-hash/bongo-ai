import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  math: string;
  display?: boolean;
  className?: string;
}

export function MathRenderer({ math, display = false, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: display,
          throwOnError: false,
          errorColor: '#ef4444',
          trust: true,
          strict: false,
          output: 'html',
          macros: {
            '\\RR': '\\mathbb{R}',
            '\\NN': '\\mathbb{N}',
            '\\ZZ': '\\mathbb{Z}',
            '\\QQ': '\\mathbb{Q}',
            '\\CC': '\\mathbb{C}',
          }
        });
      } catch (error) {
        console.error('KaTeX render error:', error);
        if (containerRef.current) {
          containerRef.current.textContent = math;
        }
      }
    }
  }, [math, display]);

  return (
    <span 
      ref={containerRef} 
      className={`math-renderer ${display ? 'math-display' : 'math-inline'} ${className}`}
    />
  );
}

// Utility to detect and parse math from markdown content
export function parseMathContent(content: string): (string | { type: 'math'; content: string; display: boolean })[] {
  const result: (string | { type: 'math'; content: string; display: boolean })[] = [];
  
  // Pattern for display math ($$...$$)
  const displayMathPattern = /\$\$([^$]+)\$\$/g;
  // Pattern for inline math ($...$) - but not $$
  const inlineMathPattern = /(?<!\$)\$(?!\$)([^$\n]+)\$(?!\$)/g;
  
  let lastIndex = 0;
  let combined = content;
  
  // First, handle display math
  let match;
  const displayMatches: { start: number; end: number; content: string }[] = [];
  
  while ((match = displayMathPattern.exec(content)) !== null) {
    displayMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1].trim()
    });
  }
  
  // Handle inline math
  const inlineMatches: { start: number; end: number; content: string }[] = [];
  while ((match = inlineMathPattern.exec(content)) !== null) {
    // Check if this overlaps with any display math
    const overlaps = displayMatches.some(dm => 
      (match!.index >= dm.start && match!.index < dm.end) ||
      (match!.index + match![0].length > dm.start && match!.index + match![0].length <= dm.end)
    );
    
    if (!overlaps) {
      inlineMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1].trim()
      });
    }
  }
  
  // Combine and sort all matches
  const allMatches = [
    ...displayMatches.map(m => ({ ...m, display: true })),
    ...inlineMatches.map(m => ({ ...m, display: false }))
  ].sort((a, b) => a.start - b.start);
  
  // Build result array
  lastIndex = 0;
  for (const m of allMatches) {
    if (m.start > lastIndex) {
      result.push(content.slice(lastIndex, m.start));
    }
    result.push({ type: 'math', content: m.content, display: m.display });
    lastIndex = m.end;
  }
  
  if (lastIndex < content.length) {
    result.push(content.slice(lastIndex));
  }
  
  return result.length > 0 ? result : [content];
}

// Component to render content with math
export function ContentWithMath({ content }: { content: string }) {
  const parts = parseMathContent(content);
  
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        }
        return (
          <MathRenderer
            key={index}
            math={part.content}
            display={part.display}
          />
        );
      })}
    </>
  );
}
