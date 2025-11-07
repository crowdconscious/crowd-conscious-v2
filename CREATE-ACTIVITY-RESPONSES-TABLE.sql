-- ============================================
-- CREATE ACTIVITY RESPONSES TABLE
-- Stores user responses to lesson activities for ESG reporting
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Enrollment
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  
  -- Lesson Reference
  module_id UUID NOT NULL REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES module_lessons(id) ON DELETE CASCADE,
  
  -- Activity Type
  activity_type TEXT NOT NULL, -- 'audit', 'design', 'assessment', 'reflection', etc.
  
  -- Responses (JSONB for flexibility)
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {
  --   "question_1": "My answer to question 1",
  --   "question_2": ["option_a", "option_b"],
  --   "rating_safety": 7,
  --   "checklist_items": ["item1", "item2", "item3"]
  -- }
  
  -- Evidence (photos, documents)
  evidence_urls TEXT[] DEFAULT ARRAY[]::text[],
  
  -- Completion Data
  completion_data JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "completion_percentage": 100,
  --   "time_spent_minutes": 45,
  --   "score": 85
  -- }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one response per user per lesson
  UNIQUE(user_id, lesson_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_responses_user_id ON public.activity_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_module_id ON public.activity_responses(module_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_lesson_id ON public.activity_responses(lesson_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_activity_type ON public.activity_responses(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_responses_created_at ON public.activity_responses(created_at);

-- Enable Row Level Security
ALTER TABLE public.activity_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own responses
CREATE POLICY "Users can view own activity responses"
  ON public.activity_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own responses
CREATE POLICY "Users can create own activity responses"
  ON public.activity_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own responses
CREATE POLICY "Users can update own activity responses"
  ON public.activity_responses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all responses (for reporting)
CREATE POLICY "Admins can view all activity responses"
  ON public.activity_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- ============================================
-- HELPER FUNCTION: Get activity completion stats by module
-- ============================================

CREATE OR REPLACE FUNCTION public.get_module_activity_stats(p_module_id UUID)
RETURNS TABLE (
  total_lessons INT,
  lessons_with_responses INT,
  total_responses INT,
  avg_completion_percentage NUMERIC,
  activity_types JSONB
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ml.id)::INT as total_lessons,
    COUNT(DISTINCT ar.lesson_id)::INT as lessons_with_responses,
    COUNT(ar.id)::INT as total_responses,
    AVG((ar.completion_data->>'completion_percentage')::NUMERIC) as avg_completion_percentage,
    jsonb_object_agg(
      ar.activity_type,
      COUNT(ar.id)
    ) as activity_types
  FROM module_lessons ml
  LEFT JOIN activity_responses ar ON ml.id = ar.lesson_id
  WHERE ml.module_id = p_module_id
  GROUP BY ml.module_id;
END;
$$;

-- ============================================
-- HELPER FUNCTION: Get user's activity completion for ESG reporting
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_activity_completion(p_user_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_title TEXT,
  total_lessons INT,
  completed_activities INT,
  completion_rate NUMERIC,
  total_time_spent INT,
  evidence_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mm.id as module_id,
    mm.title as module_title,
    COUNT(DISTINCT ml.id)::INT as total_lessons,
    COUNT(DISTINCT ar.lesson_id)::INT as completed_activities,
    (COUNT(DISTINCT ar.lesson_id)::NUMERIC / NULLIF(COUNT(DISTINCT ml.id), 0) * 100) as completion_rate,
    SUM((ar.completion_data->>'time_spent_minutes')::INT)::INT as total_time_spent,
    SUM(array_length(ar.evidence_urls, 1))::INT as evidence_count
  FROM marketplace_modules mm
  LEFT JOIN module_lessons ml ON mm.id = ml.module_id
  LEFT JOIN activity_responses ar ON ml.id = ar.lesson_id AND ar.user_id = p_user_id
  WHERE mm.status = 'published'
  GROUP BY mm.id, mm.title
  ORDER BY mm.title;
END;
$$;

-- ============================================
-- Verification
-- ============================================

SELECT '✅ activity_responses table created successfully!' AS status;
SELECT 'Run this to test: SELECT * FROM activity_responses LIMIT 5;' AS next_step;

