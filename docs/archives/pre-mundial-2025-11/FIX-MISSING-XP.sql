-- ================================================================
-- FIX: Update XP for completed lessons and modules
-- After bug fix where xp_earned wasn't being saved to enrollments
-- ================================================================

-- Step 1: Calculate and update XP for each enrollment based on completed lessons
DO $$
DECLARE
    enrollment_record RECORD;
    completed_lesson_count INTEGER;
    calculated_xp INTEGER;
BEGIN
    RAISE NOTICE '🔧 Fixing XP for all enrollments...';
    
    FOR enrollment_record IN 
        SELECT id, user_id, module_id, progress_percentage, completed, xp_earned
        FROM course_enrollments
        WHERE xp_earned = 0 OR xp_earned IS NULL
    LOOP
        -- Count completed lessons for this enrollment
        SELECT COUNT(*) INTO completed_lesson_count
        FROM lesson_responses
        WHERE enrollment_id = enrollment_record.id
          AND completed = TRUE;
        
        -- Calculate XP (50 XP per lesson)
        calculated_xp := completed_lesson_count * 50;
        
        IF calculated_xp > 0 THEN
            -- Update enrollment with calculated XP
            UPDATE course_enrollments
            SET xp_earned = calculated_xp,
                last_accessed_at = NOW()
            WHERE id = enrollment_record.id;
            
            RAISE NOTICE '✅ Updated enrollment % - % lessons completed, % XP earned', 
                enrollment_record.id, completed_lesson_count, calculated_xp;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎉 XP fix complete!';
END $$;

-- Step 2: Verify the fix
SELECT 
    ce.id as enrollment_id,
    ce.user_id,
    mm.title as module_name,
    ce.progress_percentage,
    ce.completed,
    ce.xp_earned,
    (
        SELECT COUNT(*) 
        FROM lesson_responses lr 
        WHERE lr.enrollment_id = ce.id 
          AND lr.completed = TRUE
    ) as completed_lessons,
    (
        SELECT COUNT(*) 
        FROM lesson_responses lr 
        WHERE lr.enrollment_id = ce.id 
          AND lr.completed = TRUE
    ) * 50 as expected_xp
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON mm.id = ce.module_id
ORDER BY ce.purchased_at DESC
LIMIT 10;

