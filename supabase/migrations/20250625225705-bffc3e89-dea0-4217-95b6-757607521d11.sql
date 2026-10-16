
-- Add missing columns to tests table for categorization and visibility
ALTER TABLE public.tests 
ADD COLUMN exam_pattern TEXT DEFAULT 'custom',
ADD COLUMN is_public BOOLEAN DEFAULT false;
