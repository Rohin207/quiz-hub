
-- Drop the existing restrictive policy
DROP POLICY "Users can view their own tests" ON public.tests;

-- Create a new policy that allows users to see their own tests AND public tests from others
CREATE POLICY "Users can view their own tests and public tests" 
  ON public.tests 
  FOR SELECT 
  USING (auth.uid() = user_id OR is_public = true);
