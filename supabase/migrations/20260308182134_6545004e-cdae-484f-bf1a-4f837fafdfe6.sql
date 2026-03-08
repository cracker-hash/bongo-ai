
CREATE TABLE public.builder_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  html_code TEXT DEFAULT '',
  css_code TEXT DEFAULT '',
  js_code TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.builder_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own builder projects" ON public.builder_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own builder projects" ON public.builder_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own builder projects" ON public.builder_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own builder projects" ON public.builder_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);
