
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create tests table for storing uploaded PDF tests
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT,
  duration_minutes INTEGER DEFAULT 60,
  total_questions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table for extracted MCQs
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test attempts table for tracking user test sessions
CREATE TABLE public.test_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  total_time_seconds INTEGER,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Create user answers table for storing individual question responses
CREATE TABLE public.user_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  time_spent_seconds INTEGER DEFAULT 0,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for tests
CREATE POLICY "Users can view their own tests" 
  ON public.tests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tests" 
  ON public.tests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tests" 
  ON public.tests FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tests" 
  ON public.tests FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for questions
CREATE POLICY "Users can view questions from their tests" 
  ON public.questions FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.tests 
    WHERE tests.id = questions.test_id 
    AND tests.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert questions to their tests" 
  ON public.questions FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tests 
    WHERE tests.id = questions.test_id 
    AND tests.user_id = auth.uid()
  ));

-- Create RLS policies for test attempts
CREATE POLICY "Users can view their own test attempts" 
  ON public.test_attempts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test attempts" 
  ON public.test_attempts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test attempts" 
  ON public.test_attempts FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create RLS policies for user answers
CREATE POLICY "Users can view their own answers" 
  ON public.user_answers FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.test_attempts 
    WHERE test_attempts.id = user_answers.attempt_id 
    AND test_attempts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own answers" 
  ON public.user_answers FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.test_attempts 
    WHERE test_attempts.id = user_answers.attempt_id 
    AND test_attempts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own answers" 
  ON public.user_answers FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.test_attempts 
    WHERE test_attempts.id = user_answers.attempt_id 
    AND test_attempts.user_id = auth.uid()
  ));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('test-pdfs', 'test-pdfs', false);

-- Create storage policies for PDF bucket
CREATE POLICY "Users can upload their own PDFs" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'test-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own PDFs" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'test-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own PDFs" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'test-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
