-- CHECK-ALL-MODULES.sql
-- This script lists all platform modules and their lessons

SELECT 
    mm.id as module_id,
    mm.title as module_title,
    mm.core_value,
    mm.status,
    mm.is_template,
    COUNT(ml.id) as lesson_count,
    jsonb_agg(
        jsonb_build_object(
            'lesson_id', ml.id,
            'lesson_order', ml.lesson_order,
            'title', ml.title,
            'has_story', (ml.story_content IS NOT NULL),
            'has_objectives', (ml.learning_objectives IS NOT NULL),
            'has_activities', (ml.activity_config IS NOT NULL),
            'has_tools', (ml.tools_used IS NOT NULL)
        ) ORDER BY ml.lesson_order
    ) as lessons
FROM public.marketplace_modules mm
LEFT JOIN public.module_lessons ml ON mm.id = ml.module_id
WHERE mm.status = 'published'
GROUP BY mm.id, mm.title, mm.core_value, mm.status, mm.is_template
ORDER BY mm.title;

