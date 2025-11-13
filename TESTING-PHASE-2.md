# 🧪 Phase 2 Testing Checklist

Test these features after Vercel deployment:

---

## ✅ **1. Lesson Completion XP**

### Test Steps:
1. Log in to your account
2. Go to a module/lesson
3. Complete a lesson (first time)
4. Check browser console for XP logs
5. Check API response includes XP data

### Expected Results:
- ✅ Console shows: `✅ XP awarded: { xp_amount: 50, total_xp: 50, ... }`
- ✅ API response includes `xp` object with `gained`, `total`, `tier_changed`
- ✅ If first lesson: Achievement unlocked (check console)

### Database Check (Optional):
```sql
-- Check XP was awarded
SELECT * FROM xp_transactions 
WHERE user_id = 'your-user-id' 
AND action_type = 'lesson_completed'
ORDER BY created_at DESC LIMIT 5;

-- Check user XP total
SELECT total_xp, current_tier FROM user_xp 
WHERE user_id = 'your-user-id';
```

---

## ✅ **2. Module Completion XP**

### Test Steps:
1. Complete ALL lessons in a module
2. When last lesson completes, module should complete
3. Check console for module completion XP logs

### Expected Results:
- ✅ Console shows: `✅ Module completion XP awarded: { xp_amount: 200, ... }`
- ✅ API response includes `module_xp` object
- ✅ If first module: Achievement unlocked

### Database Check:
```sql
-- Check module completion XP
SELECT * FROM xp_transactions 
WHERE user_id = 'your-user-id' 
AND action_type = 'module_completed'
ORDER BY created_at DESC LIMIT 5;
```

---

## ✅ **3. Sponsorship XP**

### Test Steps:
1. Go to a community need
2. Create a sponsorship (test with small amount or volunteer)
3. Complete payment flow
4. Check webhook logs (Vercel logs) for XP award

### Expected Results:
- ✅ Webhook logs show: `✅ XP awarded for sponsorship: { xp_amount: 100, ... }`
- ✅ If first sponsorship: Achievement unlocked

### Database Check:
```sql
-- Check sponsorship XP
SELECT * FROM xp_transactions 
WHERE user_id = 'your-user-id' 
AND action_type = 'sponsor_need'
ORDER BY created_at DESC LIMIT 5;
```

---

## ✅ **4. Voting XP**

### Test Steps:
1. Go to a poll in a community
2. Cast a vote
3. Check browser console for XP logs
4. Check API response includes XP

### Expected Results:
- ✅ Console shows: `✅ XP awarded for vote: { xp_amount: 10, ... }`
- ✅ API response includes `xp` object

### Database Check:
```sql
-- Check vote XP
SELECT * FROM xp_transactions 
WHERE user_id = 'your-user-id' 
AND action_type = 'vote_content'
ORDER BY created_at DESC LIMIT 5;
```

---

## ✅ **5. Tier Progression**

### Test Steps:
1. Complete multiple lessons/actions to earn XP
2. Check `/api/gamification/xp` endpoint
3. Verify tier updates correctly

### Expected Results:
- ✅ Tier updates when XP thresholds reached:
  - Tier 1 (Explorer): 0-500 XP
  - Tier 2 (Contributor): 501+ XP
  - Tier 3 (Changemaker): 1501+ XP
  - Tier 4 (Impact Leader): 3501+ XP
  - Tier 5 (Legend): 7501+ XP

### API Test:
```bash
# Get your XP data
curl https://your-app.vercel.app/api/gamification/xp \
  -H "Cookie: your-auth-cookie"
```

---

## ✅ **6. Achievements**

### Test Steps:
1. Complete first lesson → Should unlock "First Steps" 🎯
2. Complete first module → Should unlock "Module Master" 🏆
3. Make first sponsorship → Should unlock "First Sponsor" 💝
4. Reach tier thresholds → Should unlock tier achievements

### Database Check:
```sql
-- Check achievements
SELECT * FROM user_achievements 
WHERE user_id = 'your-user-id'
ORDER BY unlocked_at DESC;
```

---

## ✅ **7. Error Handling**

### Test Steps:
1. Try completing same lesson twice (should not award duplicate XP)
2. Check that lesson completion still works if XP award fails
3. Verify no breaking errors in console

### Expected Results:
- ✅ No duplicate XP for same action
- ✅ Lesson completion succeeds even if XP fails (non-fatal)
- ✅ No console errors

---

## 🐛 **Common Issues & Fixes**

### Issue: XP not awarding
**Check:**
- Database function `award_xp` exists
- `xp_rewards` table has entries for action types
- User exists in `user_xp` table

**Fix:**
```sql
-- Check XP rewards exist
SELECT * FROM xp_rewards;

-- Initialize user XP if missing
INSERT INTO user_xp (user_id, total_xp, current_tier)
VALUES ('your-user-id', 0, 1)
ON CONFLICT (user_id) DO NOTHING;
```

### Issue: Achievements not unlocking
**Check:**
- `check_achievements` function exists
- Achievement already unlocked (won't duplicate)

### Issue: Tier not updating
**Check:**
- XP total is correct
- Tier calculation function works

---

## 📊 **Performance Checks**

- ✅ API responses < 500ms
- ✅ No N+1 queries
- ✅ Database indexes working
- ✅ No memory leaks

---

## ✅ **Success Criteria**

Phase 2 is successful if:
- ✅ XP awards for all 4 actions (lesson, module, sponsorship, vote)
- ✅ Achievements unlock correctly
- ✅ Tiers update correctly
- ✅ No breaking errors
- ✅ Existing functionality still works

---

**Test thoroughly before Phase 3!** 🚀

