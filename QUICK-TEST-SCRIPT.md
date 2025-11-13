# ⚡ Quick Test Script

Run these tests after Vercel deployment:

---

## 🧪 **Test 1: Lesson Completion (2 minutes)**

1. Log in to your app
2. Go to a module → Start a lesson
3. Complete the lesson
4. **Check**: Browser console should show:
   ```
   ✅ XP awarded: { xp_amount: 50, total_xp: 50, tier_changed: false }
   ```
5. **Check**: Network tab → API response should include `xp` object

**Expected**: ✅ 50 XP awarded, achievement unlocked if first lesson

---

## 🧪 **Test 2: Module Completion (5 minutes)**

1. Complete ALL lessons in a module
2. When last lesson completes
3. **Check**: Console should show:
   ```
   ✅ Module completion XP awarded: { xp_amount: 200, ... }
   ```
4. **Check**: API response includes `module_xp` object

**Expected**: ✅ 200 XP awarded, "Module Master" achievement unlocked

---

## 🧪 **Test 3: Voting (1 minute)**

1. Go to a poll in a community
2. Cast a vote
3. **Check**: Console should show:
   ```
   ✅ XP awarded for vote: { xp_amount: 10, ... }
   ```
4. **Check**: API response includes `xp` object

**Expected**: ✅ 10 XP awarded

---

## 🧪 **Test 4: Sponsorship (3 minutes)**

1. Go to a community need
2. Create a sponsorship (test with small amount)
3. Complete payment
4. **Check**: Vercel logs should show:
   ```
   ✅ XP awarded for sponsorship: { xp_amount: 100, ... }
   ```

**Expected**: ✅ 100 XP awarded, "First Sponsor" achievement unlocked

---

## 🧪 **Test 5: Tier Progression (5 minutes)**

1. Complete multiple lessons to earn XP
2. Reach 501+ XP (Tier 2: Contributor)
3. **Check**: Call `/api/gamification/xp` endpoint
4. **Verify**: `current_tier` should be 2

**Expected**: ✅ Tier updates correctly at thresholds

---

## 🧪 **Test 6: Achievements (2 minutes)**

1. Complete first lesson → Should unlock "First Steps" 🎯
2. Complete first module → Should unlock "Module Master" 🏆
3. Make first sponsorship → Should unlock "First Sponsor" 💝

**Check Database**:
```sql
SELECT achievement_name, unlocked_at 
FROM user_achievements 
WHERE user_id = 'your-user-id'
ORDER BY unlocked_at DESC;
```

**Expected**: ✅ Achievements unlock correctly

---

## ✅ **All Tests Pass?**

If all tests pass:
- ✅ Phase 2 is successful!
- ✅ Ready for Phase 3 (Frontend Celebrations)
- ✅ Let me know and we'll proceed!

If any tests fail:
- ❌ Check error logs
- ❌ Verify database functions exist
- ❌ Check `xp_rewards` table has entries
- ❌ Share error details and we'll fix!

---

**Total Test Time**: ~15 minutes

**Ready to test?** 🚀

