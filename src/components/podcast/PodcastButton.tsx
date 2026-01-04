import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PodcastGeneratorDialog } from './PodcastGeneratorDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Custom podcast icon component that changes based on theme
function PodcastIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      {/* Outer waves */}
      <path 
        d="M12 22c0 0 0-2 0-4" 
        strokeLinecap="round"
      />
      <path 
        d="M8 22h8" 
        strokeLinecap="round"
      />
      {/* Person/mic head */}
      <circle cx="12" cy="9" r="3" fill="currentColor" />
      {/* Wave rings */}
      <path 
        d="M12 3c-3.866 0-7 3.134-7 7 0 2.209 1.021 4.177 2.618 5.464" 
        strokeLinecap="round"
      />
      <path 
        d="M12 3c3.866 0 7 3.134 7 7 0 2.209-1.021 4.177-2.618 5.464" 
        strokeLinecap="round"
      />
      <path 
        d="M12 6c-2.209 0-4 1.791-4 4 0 1.254.577 2.374 1.482 3.107" 
        strokeLinecap="round"
      />
      <path 
        d="M12 6c2.209 0 4 1.791 4 4 0 1.254-.577 2.374-1.482 3.107" 
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PodcastButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setIsOpen(true)}
            size="icon"
            className="fixed top-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg 
                       bg-gradient-to-br from-fuchsia-500 via-purple-500 to-violet-600
                       dark:from-fuchsia-400 dark:via-purple-500 dark:to-violet-500
                       hover:from-fuchsia-600 hover:via-purple-600 hover:to-violet-700
                       dark:hover:from-fuchsia-500 dark:hover:via-purple-600 dark:hover:to-violet-600
                       text-white border-0
                       animate-pulse hover:animate-none
                       before:absolute before:inset-0 before:rounded-full before:bg-purple-500/30 before:blur-xl before:-z-10
                       after:absolute after:inset-[-4px] after:rounded-full after:bg-gradient-to-r after:from-fuchsia-400/50 after:to-purple-600/50 after:blur-md after:-z-10"
          >
            <PodcastIcon className="h-6 w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border-border">
          <p>Generate Podcast</p>
        </TooltipContent>
      </Tooltip>

      <PodcastGeneratorDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
