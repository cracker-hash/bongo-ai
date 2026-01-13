-- Allow service role to insert notifications (for triggers/edge functions)
-- First, add a policy to allow system inserts via trigger
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to send welcome notification on new user
CREATE OR REPLACE FUNCTION public.create_welcome_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    '🎉 Welcome to Wiser AI!',
    'Your account has been created successfully. You have 200 free credits to start exploring!',
    'success',
    '/dashboard'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on user_credits insert (created when user signs up)
CREATE TRIGGER on_user_credits_created
AFTER INSERT ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.create_welcome_notification();

-- Create function to notify on low credits
CREATE OR REPLACE FUNCTION public.check_low_credits_notification()
RETURNS TRIGGER AS $$
DECLARE
  tier_limit INTEGER;
  usage_percent INTEGER;
BEGIN
  -- Get tier limit
  IF NEW.subscription_tier = 'free' THEN
    tier_limit := 200;
  ELSIF NEW.subscription_tier = 'lite' THEN
    tier_limit := 7000;
  ELSIF NEW.subscription_tier = 'pro' THEN
    tier_limit := 14000;
  ELSIF NEW.subscription_tier = 'max' THEN
    tier_limit := 70000;
  ELSE
    tier_limit := 200;
  END IF;

  -- Calculate usage percentage
  usage_percent := ((tier_limit - NEW.balance) * 100) / tier_limit;

  -- Notify at 80% usage (20% remaining)
  IF NEW.balance <= (tier_limit * 0.2) AND OLD.balance > (tier_limit * 0.2) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      '⚠️ Credits Running Low',
      'You have only ' || NEW.balance || ' credits remaining. Consider upgrading your plan for more credits!',
      'warning',
      '/pricing'
    );
  END IF;

  -- Notify at 95% usage (5% remaining)
  IF NEW.balance <= (tier_limit * 0.05) AND OLD.balance > (tier_limit * 0.05) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      '🚨 Credits Almost Depleted',
      'You have only ' || NEW.balance || ' credits left! Upgrade now to avoid service interruption.',
      'error',
      '/pricing'
    );
  END IF;

  -- Notify when credits reach 0
  IF NEW.balance <= 0 AND OLD.balance > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      '❌ Out of Credits',
      'You have run out of credits. Upgrade your plan to continue using Wiser AI.',
      'error',
      '/pricing'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on user_credits update
CREATE TRIGGER on_credits_updated
AFTER UPDATE OF balance ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.check_low_credits_notification();