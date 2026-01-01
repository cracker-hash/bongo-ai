-- Create user_gamification table for XP system
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own gamification data" 
ON public.user_gamification 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gamification data" 
ON public.user_gamification 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gamification data" 
ON public.user_gamification 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_gamification_updated_at
BEFORE UPDATE ON public.user_gamification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create generated_images table for image gallery
CREATE TABLE public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own images" 
ON public.generated_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images" 
ON public.generated_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" 
ON public.generated_images 
FOR DELETE 
USING (auth.uid() = user_id);