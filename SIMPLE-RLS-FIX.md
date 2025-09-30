# 🎯 SIMPLE RLS FIX

## **THE PROBLEM**

You have **restrictive policies** that require community membership:

- `"Community members can register for events"` ❌
- `"Community members can vote on polls"` ❌
- `"Community members can create comments"` ❌

## **THE SOLUTION**

Run this **simple SQL fix** in your Supabase SQL Editor:

```sql
-- Remove the restrictive policies
DROP POLICY "Community members can register for events" ON public.event_registrations;
DROP POLICY "Community members can vote on polls" ON public.poll_votes;
DROP POLICY "Community members can create comments" ON public.comments;

-- Add permissive policies
CREATE POLICY "Anyone can register for events" ON public.event_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can vote on polls" ON public.poll_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments already has a good policy: "Users can create comments"
```

## **VERIFICATION**

After running the fix, check the policies:

```sql
SELECT tablename, policyname, cmd, with_check
FROM pg_policies
WHERE tablename IN ('event_registrations', 'poll_votes', 'comments')
AND cmd = 'INSERT'
ORDER BY tablename;
```

**Expected result:**

- `event_registrations`: `"Anyone can register for events"` with simple `auth.uid() = user_id`
- `poll_votes`: `"Anyone can vote on polls"` with simple `auth.uid() = user_id`
- `comments`: `"Users can create comments"` with simple `auth.uid() = user_id`

## **TEST IMMEDIATELY**

1. ✅ Register for any event (should work for any authenticated user)
2. ✅ Vote on any poll (should work for any authenticated user)
3. ✅ Comment on any content (should work for any authenticated user)

---

**🚀 This simple fix will solve your interaction issues in 2 minutes!**
