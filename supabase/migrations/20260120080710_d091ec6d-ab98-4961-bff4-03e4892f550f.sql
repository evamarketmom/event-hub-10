-- Drop existing RLS policies on conversations that use auth.uid()
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Drop existing RLS policies on messages that use auth.uid()
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update read status" ON public.messages;

-- Create new policies for conversations (since we use custom auth, not Supabase Auth)
-- App filters by user_id in queries
CREATE POLICY "Anyone can view conversations" 
ON public.conversations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update conversations" 
ON public.conversations 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete conversations" 
ON public.conversations 
FOR DELETE 
USING (true);

-- Create new policies for messages (since we use custom auth, not Supabase Auth)
-- App filters by conversation_id in queries
CREATE POLICY "Anyone can view messages" 
ON public.messages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update messages" 
ON public.messages 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete messages" 
ON public.messages 
FOR DELETE 
USING (true);