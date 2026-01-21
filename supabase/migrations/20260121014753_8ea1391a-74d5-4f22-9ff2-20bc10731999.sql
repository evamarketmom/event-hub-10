-- Create account deletion requests table
CREATE TABLE public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '3 days'),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed'))
);

-- Enable Row Level Security
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
ON public.account_deletion_requests
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own deletion requests
CREATE POLICY "Users can create their own deletion requests"
ON public.account_deletion_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own deletion requests (for cancellation)
CREATE POLICY "Users can update their own deletion requests"
ON public.account_deletion_requests
FOR UPDATE
USING (user_id = auth.uid());

-- Create index for efficient queries
CREATE INDEX idx_account_deletion_user_status ON public.account_deletion_requests(user_id, status);