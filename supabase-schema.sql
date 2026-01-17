-- ============================================
-- LifeBalance Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dimension assessments
CREATE TABLE public.assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension_id TEXT NOT NULL,
  dimension_name TEXT NOT NULL,
  current_score INTEGER NOT NULL,
  target_score INTEGER NOT NULL,
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dimension_id)
);

-- Generated action plans
CREATE TABLE public.action_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  priority INTEGER NOT NULL,
  gap INTEGER NOT NULL,
  status TEXT NOT NULL,
  tasks JSONB NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily habits
CREATE TABLE public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.action_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  icon TEXT,
  category TEXT NOT NULL,
  color_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit completions tracking
CREATE TABLE public.habit_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(habit_id, completed_at)
);

-- Support requests
CREATE TABLE public.support_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Assessments policies
CREATE POLICY "Users can CRUD own assessments" ON public.assessments 
  FOR ALL USING (auth.uid() = user_id);

-- Action plans policies
CREATE POLICY "Users can CRUD own plans" ON public.action_plans 
  FOR ALL USING (auth.uid() = user_id);

-- Habits policies
CREATE POLICY "Users can CRUD own habits" ON public.habits 
  FOR ALL USING (auth.uid() = user_id);

-- Habit completions policies
CREATE POLICY "Users can CRUD own completions" ON public.habit_completions 
  FOR ALL USING (auth.uid() = user_id);

-- Support requests policies
CREATE POLICY "Users can insert support requests" ON public.support_requests 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own support requests" ON public.support_requests 
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- Auto-create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
