-- Enhance lesson_responses table to store tool data
-- Run this in your Supabase SQL Editor

-- Add new columns for tool-specific data
ALTER TABLE public.lesson_responses
ADD COLUMN IF NOT EXISTS carbon_data JSONB,
ADD COLUMN IF NOT EXISTS cost_data JSONB,
ADD COLUMN IF NOT EXISTS evidence_urls TEXT[],
ADD COLUMN IF NOT EXISTS impact_comparisons JSONB;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_lesson_responses_employee ON public.lesson_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_corporate ON public.lesson_responses(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_course ON public.lesson_responses(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_completed ON public.lesson_responses(completed_at);

-- Update the table comment
COMMENT ON TABLE public.lesson_responses IS 'Stores detailed employee responses for each lesson, including calculator results, reflections, and evidence';

-- Column comments for clarity
COMMENT ON COLUMN public.lesson_responses.responses IS 'General activity responses (JSONB)';
COMMENT ON COLUMN public.lesson_responses.carbon_data IS 'Carbon calculator results with breakdown and comparisons';
COMMENT ON COLUMN public.lesson_responses.cost_data IS 'Cost calculator results with savings and ROI';
COMMENT ON COLUMN public.lesson_responses.evidence_urls IS 'Array of Supabase Storage URLs for uploaded evidence images';
COMMENT ON COLUMN public.lesson_responses.reflection IS 'Employee reflection text';
COMMENT ON COLUMN public.lesson_responses.action_items IS 'Array of action items committed by employee';
COMMENT ON COLUMN public.lesson_responses.time_spent_minutes IS 'Time spent on the lesson';
COMMENT ON COLUMN public.lesson_responses.impact_comparisons IS 'Impact comparison data shown to employee';

-- Example of data structure for reference:
/*
carbon_data: {
  "total": 1250,
  "breakdown": {
    "electricity": 263.5,
    "gas": 101.5,
    "gasoline": 462,
    "diesel": 268,
    "waste": 230
  },
  "comparisons": {
    "trees": 62,
    "carTrips": 271,
    "lightBulbs": 3125
  }
}

cost_data: {
  "currentMonthlyCost": 10000,
  "reductionPercentage": 20,
  "monthlySavings": 2000,
  "annualSavings": 24000,
  "threeYearSavings": 72000,
  "implementationCost": 5000,
  "paybackMonths": 2.5,
  "roi": 1340
}

evidence_urls: [
  "https://[project].supabase.co/storage/v1/object/public/employee-evidence/[user-id]/before.jpg",
  "https://[project].supabase.co/storage/v1/object/public/employee-evidence/[user-id]/after.jpg"
]

responses: {
  "quiz_answers": {...},
  "reflection_journal": {
    "responses": {
      "0": "I learned that...",
      "1": "I will apply..."
    },
    "wordCount": 87,
    "completedAt": "2025-10-31T12:00:00.000Z"
  }
}
*/

-- Verify changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'lesson_responses'
ORDER BY ordinal_position;

