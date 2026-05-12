-- =====================================================
-- DELETION REQUEST SYSTEM (SIMPLIFIED)
-- Create only the deletion_requests table first
-- =====================================================

BEGIN;

-- Create deletion_requests table
CREATE TABLE IF NOT EXISTS public.deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('community', 'user', 'content')),
    target_id UUID NOT NULL,
    target_name TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deletion_requests
CREATE POLICY "Admins can view all deletion requests" ON public.deletion_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );

CREATE POLICY "Users can view their own deletion requests" ON public.deletion_requests
    FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Community founders can request community deletion" ON public.deletion_requests
    FOR INSERT WITH CHECK (
        request_type = 'community' AND
        requested_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = target_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'founder'
        )
    );

CREATE POLICY "Admins can create any deletion request" ON public.deletion_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );

CREATE POLICY "Admins can update deletion requests" ON public.deletion_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for deletion_requests
CREATE TRIGGER update_deletion_requests_updated_at
    BEFORE UPDATE ON public.deletion_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_type ON public.deletion_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_by ON public.deletion_requests(requested_by);

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check table was created
SELECT 'deletion_requests table created' as status, count(*) as row_count FROM public.deletion_requests;

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'deletion_requests'
ORDER BY cmd;
