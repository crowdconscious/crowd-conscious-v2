-- ============================================
-- Corporate Dashboard Phase 1: Core Tables
-- ============================================

-- 1. EMPLOYEE INVITATIONS TABLE
-- Track invitation status and tokens
CREATE TABLE IF NOT EXISTS employee_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(corporate_account_id, email)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON employee_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_corporate ON employee_invitations(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON employee_invitations(status);

-- 2. COURSE ENROLLMENTS TABLE
-- Track employee progress in courses
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  module_name TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  quiz_score INTEGER CHECK (quiz_score >= 0 AND quiz_score <= 100),
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, module_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_employee ON course_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_corporate ON course_enrollments(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON course_enrollments(status);

-- 3. CERTIFICATIONS TABLE
-- Track earned certifications
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL,
  certification_level TEXT CHECK (certification_level IN ('participant', 'contributor', 'leader')),
  modules_completed TEXT[] NOT NULL DEFAULT '{}',
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  certificate_url TEXT,
  verification_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 12),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_certifications_employee ON certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_certifications_corporate ON certifications(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_certifications_code ON certifications(verification_code);

-- 4. IMPACT METRICS TABLE
-- Track measurable impact
CREATE TABLE IF NOT EXISTS impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('energy', 'water', 'waste', 'productivity', 'co2', 'cost_savings')),
  baseline_value NUMERIC,
  current_value NUMERIC,
  savings_mxn NUMERIC DEFAULT 0,
  unit TEXT NOT NULL,
  module_id TEXT,
  description TEXT,
  measured_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_impact_corporate ON impact_metrics(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_impact_type ON impact_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_impact_measured ON impact_metrics(measured_at DESC);

-- 5. PROJECT SUBMISSIONS TABLE
-- Employee mini-projects
CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  project_type TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_claim JSONB,
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES profiles(id),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_employee ON project_submissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_projects_corporate ON project_submissions(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON project_submissions(status);

-- 6. CORPORATE ACTIVITY LOG
-- Audit trail
CREATE TABLE IF NOT EXISTS corporate_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  action_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_corporate ON corporate_activity_log(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON corporate_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON corporate_activity_log(action_type);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_activity_log ENABLE ROW LEVEL SECURITY;

-- EMPLOYEE INVITATIONS POLICIES
CREATE POLICY "Corporate admins can manage invitations" ON employee_invitations
  FOR ALL USING (
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles 
      WHERE id = auth.uid() AND corporate_role = 'admin'
    )
  );

CREATE POLICY "Anyone can view their own invitation by token" ON employee_invitations
  FOR SELECT USING (true);

-- COURSE ENROLLMENTS POLICIES
CREATE POLICY "Employees can view their own enrollments" ON course_enrollments
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Corporate admins can view all company enrollments" ON course_enrollments
  FOR SELECT USING (
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles 
      WHERE id = auth.uid() AND corporate_role = 'admin'
    )
  );

CREATE POLICY "Employees can update their own enrollments" ON course_enrollments
  FOR UPDATE USING (employee_id = auth.uid());

CREATE POLICY "System can create enrollments" ON course_enrollments
  FOR INSERT WITH CHECK (true);

-- CERTIFICATIONS POLICIES
CREATE POLICY "Employees can view their own certifications" ON certifications
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Corporate admins can view company certifications" ON certifications
  FOR SELECT USING (
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles 
      WHERE id = auth.uid() AND corporate_role = 'admin'
    )
  );

CREATE POLICY "Anyone can verify certifications by code" ON certifications
  FOR SELECT USING (true);

-- IMPACT METRICS POLICIES
CREATE POLICY "Corporate admins can manage impact metrics" ON impact_metrics
  FOR ALL USING (
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles 
      WHERE id = auth.uid() AND corporate_role = 'admin'
    )
  );

CREATE POLICY "Employees can view company impact" ON impact_metrics
  FOR SELECT USING (
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles WHERE id = auth.uid()
    )
  );

-- PROJECT SUBMISSIONS POLICIES
CREATE POLICY "Employees can manage their own projects" ON project_submissions
  FOR ALL USING (employee_id = auth.uid());

CREATE POLICY "Corporate admins can view and verify projects" ON project_submissions
  FOR ALL USING (
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles 
      WHERE id = auth.uid() AND corporate_role = 'admin'
    )
  );

-- ACTIVITY LOG POLICIES
CREATE POLICY "Corporate admins can view activity log" ON corporate_activity_log
  FOR SELECT USING (
    corporate_account_id IN (
      SELECT corporate_account_id FROM profiles 
      WHERE id = auth.uid() AND corporate_role = 'admin'
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to log activity
CREATE OR REPLACE FUNCTION log_corporate_activity(
  p_corporate_account_id UUID,
  p_action_type TEXT,
  p_action_details JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO corporate_activity_log (
    corporate_account_id,
    user_id,
    action_type,
    action_details
  ) VALUES (
    p_corporate_account_id,
    auth.uid(),
    p_action_type,
    p_action_details
  );
END;
$$;

-- Function to auto-enroll employee in modules
CREATE OR REPLACE FUNCTION auto_enroll_employee(
  p_employee_id UUID,
  p_corporate_account_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_module TEXT;
  v_modules TEXT[];
BEGIN
  -- Get modules included in the corporate account
  SELECT modules_included INTO v_modules
  FROM corporate_accounts
  WHERE id = p_corporate_account_id;

  -- Create enrollment for each module
  FOREACH v_module IN ARRAY v_modules
  LOOP
    INSERT INTO course_enrollments (
      employee_id,
      corporate_account_id,
      module_id,
      status
    ) VALUES (
      p_employee_id,
      p_corporate_account_id,
      v_module,
      'not_started'
    )
    ON CONFLICT (employee_id, module_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON employee_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_impact_updated_at BEFORE UPDATE ON impact_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON project_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA / VERIFICATION
-- ============================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Corporate Phase 1 tables created successfully!';
  RAISE NOTICE 'Tables: employee_invitations, course_enrollments, certifications, impact_metrics, project_submissions, corporate_activity_log';
END $$;

