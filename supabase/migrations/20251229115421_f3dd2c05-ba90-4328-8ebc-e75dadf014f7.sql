-- Create feedback table for analytics
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can create their own feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback" 
ON public.feedback 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX idx_feedback_chat_id ON public.feedback(chat_id);