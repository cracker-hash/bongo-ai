-- Replace the overly permissive policy with a proper one
-- The trigger functions use SECURITY DEFINER so they can insert, 
-- but we should still restrict direct user inserts
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a policy that only allows authenticated users to insert their own notifications
-- (though in practice, notifications are created by triggers)
CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);