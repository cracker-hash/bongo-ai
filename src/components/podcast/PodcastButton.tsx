import { useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PodcastGeneratorDialog } from './PodcastGeneratorDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
                       bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                       text-white border-0
                       animate-pulse hover:animate-none
                       before:absolute before:inset-0 before:rounded-full before:bg-blue-500/30 before:blur-xl before:-z-10
                       after:absolute after:inset-[-4px] after:rounded-full after:bg-gradient-to-r after:from-blue-400/50 after:to-blue-600/50 after:blur-md after:-z-10"
          >
            <Mic className="h-6 w-6" />
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
