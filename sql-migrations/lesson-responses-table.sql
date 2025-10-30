-- Create table for storing employee lesson responses and answers
CREATE TABLE IF NOT EXISTS lesson_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  
  -- Response data
  responses JSONB NOT NULL DEFAULT '{}',
  reflection TEXT,
  action_items TEXT[],
  
  -- Metadata
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_minutes INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one response per employee per lesson
  UNIQUE(employee_id, course_id, module_id, lesson_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_lesson_responses_employee ON lesson_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_corporate ON lesson_responses(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_course ON lesson_responses(course_id, module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_responses_completed ON lesson_responses(completed_at);

-- Enable RLS
ALTER TABLE lesson_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view and insert their own responses
CREATE POLICY "Employees can view own responses"
  ON lesson_responses
  FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees can insert own responses"
  ON lesson_responses
  FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update own responses"
  ON lesson_responses
  FOR UPDATE
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

-- Corporate admins can view all responses from their company
CREATE POLICY "Corporate admins can view company responses"
  ON lesson_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.corporate_account_id = lesson_responses.corporate_account_id
      AND profiles.corporate_role = 'admin'
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_lesson_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_responses_updated_at
BEFORE UPDATE ON lesson_responses
FOR EACH ROW
EXECUTE FUNCTION update_lesson_responses_updated_at();

-- Add comment
COMMENT ON TABLE lesson_responses IS 'Stores employee responses and answers for lesson activities';

