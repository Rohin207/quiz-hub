
-- Enable real-time for the tests table
ALTER TABLE public.tests REPLICA IDENTITY FULL;

-- Add the tests table to the realtime publication so changes are broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public.tests;
