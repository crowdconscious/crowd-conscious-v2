# 📧 Resend Email System - Configuration & Debugging

## Problem

Emails are showing "domain not confirmed" error in Resend, even though:
- ✅ Resend API key is configured
- ✅ Domain `crowdconscious.app` is confirmed in Resend dashboard

---

## Root Cause: DNS Configuration

The "domain not confirmed" error usually means:

1. **DNS records not properly set** in your domain registrar
2. **Verification pending** (can take 24-48 hours)
3. **Wrong domain used** in code vs. Resend dashboard
4. **Subdomain issues** (using `comunidad@` requires special setup)

---

## Fix 1: Verify DNS Records

### Step 1: Check Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Find `crowdconscious.app`
3. Check status:
   - ✅ **Verified** = Good!
   - ⏳ **Pending** = Wait 24-48 hours
   - ❌ **Failed** = DNS records wrong

### Step 2: Required DNS Records

Resend requires these DNS records (exact values from your Resend dashboard):

```
Type: TXT
Name: @crowdconscious.app (or just @)
Value: [resend-verification-code]

Type: MX
Name: @crowdconscious.app (or just @)
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com

Type: TXT
Name: resend._domainkey.crowdconscious.app
Value: [DKIM key from Resend]

Type: TXT
Name: @crowdconscious.app (or just @)
Value: v=spf1 include:amazonses.com ~all
```

### Step 3: Verify DNS Propagation

Use these tools to check if DNS records are live:

```bash
# Check DNS records
dig crowdconscious.app TXT
dig crowdconscious.app MX

# Or use online tool:
https://dnschecker.org/
```

**Expected**: Should see Resend's verification TXT and MX records.

---

## Fix 2: Update Domain Registrar

### Where to Add DNS Records:

**GoDaddy**:
1. Go to Domain Settings → DNS Management
2. Add Custom Records (TXT, MX)
3. Wait 1-24 hours for propagation

**Cloudflare**:
1. Go to DNS → Records
2. Add records (TXT, MX)
3. Wait 5-60 minutes for propagation

**Namecheap**:
1. Domain List → Manage → Advanced DNS
2. Add records
3. Wait 30 minutes

**Vercel Domains**:
1. Domain Settings → DNS Records
2. Add records
3. Instant (but verify in Resend)

---

## Fix 3: Resend Configuration Check

### Current Configuration:

**File**: `lib/resend.ts` (Line 9)

```typescript
const FROM_EMAIL = 'Crowd Conscious <comunidad@crowdconscious.app>'
```

This is correct! ✅

### Verify in Resend Dashboard:

1. Go to Resend → Domains
2. Click on `crowdconscious.app`
3. Check "Verified" status
4. If not verified, copy DNS records and add to domain registrar

---

## Fix 4: Use Resend Test Mode (Temporary)

While waiting for DNS verification, use Resend's onboarding email:

```typescript
// TEMPORARY FIX - Use Resend's verified email
const FROM_EMAIL = 'Crowd Conscious <onboarding@resend.dev>'
```

**Note**: This only works in development! For production, you MUST verify your domain.

---

## Fix 5: Environment Variables

### Check Vercel Environment Variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Look for `RESEND_API_KEY`
3. Value should start with `re_`
4. Should be set for **Production**, **Preview**, and **Development**

### Test Locally:

```bash
# In .env.local
RESEND_API_KEY=re_YourKeyHere
NEXT_PUBLIC_APP_URL=https://crowdconscious.app
```

Then restart your dev server:
```bash
npm run dev
```

---

## Testing Email System

### Test 1: API Route Test

Create `app/api/test-email/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { resend, emailTemplates } from '@/lib/resend'

export async function GET() {
  try {
    if (!resend) {
      return NextResponse.json({ 
        error: 'Resend not configured - check RESEND_API_KEY' 
      }, { status: 500 })
    }

    // Send test email
    const { data, error } = await resend.emails.send({
      from: 'Crowd Conscious <comunidad@crowdconscious.app>',
      to: ['YOUR_EMAIL_HERE'], // ⚠️ Replace with your email
      subject: 'Test Email from Crowd Conscious',
      html: `
        <h1>Test Email</h1>
        <p>If you received this, your email system is working!</p>
        <p>Sent from: comunidad@crowdconscious.app</p>
      `
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully!',
      emailId: data?.id 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**Test**: Visit `https://crowdconscious.app/api/test-email`

**Expected Response**:
```json
{
  "success": true,
  "message": "Email sent successfully!",
  "emailId": "abc123..."
}
```

**If Error**:
```json
{
  "error": "Domain not verified"
}
```
→ Follow DNS setup steps above

---

### Test 2: Manual Resend API Test

Use curl to test Resend API directly:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Crowd Conscious <comunidad@crowdconscious.app>",
    "to": ["your@email.com"],
    "subject": "Test from curl",
    "html": "<p>Test email</p>"
  }'
```

**Expected Response**:
```json
{
  "id": "abc123...",
  "from": "comunidad@crowdconscious.app",
  "to": ["your@email.com"]
}
```

**If Error**:
```json
{
  "message": "Domain not verified"
}
```
→ DNS not configured correctly

---

## Common Errors & Solutions

### Error 1: "Domain not verified"

**Cause**: DNS records not set up or still propagating

**Solution**:
1. Check DNS records in your registrar
2. Copy exact values from Resend dashboard
3. Wait 24-48 hours for DNS propagation
4. Use `onboarding@resend.dev` temporarily

### Error 2: "RESEND_API_KEY is not set"

**Cause**: Environment variable missing

**Solution**:
1. Add to Vercel: Settings → Environment Variables
2. Add to `.env.local` for local dev
3. Redeploy on Vercel

### Error 3: "Invalid from address"

**Cause**: Using unverified email address

**Solution**:
- Only use `comunidad@crowdconscious.app` after domain is verified
- Or use `onboarding@resend.dev` for testing

### Error 4: Emails going to spam

**Cause**: Missing SPF/DKIM records

**Solution**:
- Add all DNS records from Resend
- Especially the TXT records for SPF and DKIM
- Wait for DNS propagation

---

## Email Addresses Updated

All email references in the codebase now use `comunidad@crowdconscious.app`:

### Files Updated:
- ✅ `lib/resend.ts` - FROM_EMAIL (already correct)
- ✅ `app/sponsorship/success/page.tsx` - Support link
- ✅ `app/sponsorship/cancelled/page.tsx` - Support link
- ✅ `components/Footer.tsx` - Help & Contact links
- ✅ `app/(public)/privacy/page.tsx` - Privacy contact (4 occurrences)
- ✅ `app/(public)/terms/page.tsx` - Legal contact (2 occurrences)
- ✅ `app/(public)/cookies/page.tsx` - Cookies contact (2 occurrences)

### Total: 12 email references updated to `comunidad@crowdconscious.app`

---

## Resend Dashboard Checklist

**Before emails will work**:

- [ ] Domain `crowdconscious.app` added to Resend
- [ ] DNS TXT record added (verification)
- [ ] DNS MX record added (receiving)
- [ ] DNS TXT record added (SPF)
- [ ] DNS TXT record added (DKIM)
- [ ] Domain status shows "Verified" ✅
- [ ] `RESEND_API_KEY` set in Vercel
- [ ] Test email sent successfully

**After all checked**:
- Wait 10-30 minutes for final propagation
- Test with `/api/test-email` route
- Check Resend logs for delivery status

---

## Step-by-Step: First Time Setup

### 1. Get DNS Records from Resend

```
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: crowdconscious.app
4. Copy all DNS records shown
```

### 2. Add to Domain Registrar

```
Go to your domain provider (GoDaddy, Cloudflare, etc.)
→ DNS Settings
→ Add each record exactly as shown
→ Save
```

### 3. Wait for Verification

```
Check Resend dashboard every hour
Status will change from "Pending" → "Verified"
Usually takes 1-24 hours
```

### 4. Test

```
Visit: https://crowdconscious.app/api/test-email
Should see: { "success": true }
```

### 5. Enable in Production

```
All emails will now send automatically from:
comunidad@crowdconscious.app ✅
```

---

## Monitoring Email Delivery

### Resend Logs:

1. Go to Resend Dashboard → Logs
2. See all sent emails
3. Check delivery status:
   - ✅ Delivered
   - ⏳ Processing
   - ❌ Failed (shows reason)

### Types of Emails Sent:

1. **Welcome emails** - On user signup
2. **Password reset** - Password recovery
3. **Sponsorship notifications** - Payment approved
4. **Monthly reports** - Impact summaries
5. **Achievement unlocked** - Gamification

---

## Quick Fixes Reference

### If emails aren't sending at all:

```bash
# 1. Check API key is set
echo $RESEND_API_KEY

# 2. Check domain is verified
# Go to Resend dashboard → Domains

# 3. Check DNS propagation
dig crowdconscious.app TXT
dig crowdconscious.app MX

# 4. Test with Resend's email temporarily
# Change FROM_EMAIL to: onboarding@resend.dev
```

### If emails go to spam:

```bash
# 1. Verify SPF record exists
dig crowdconscious.app TXT

# Expected: v=spf1 include:amazonses.com ~all

# 2. Verify DKIM record exists
dig resend._domainkey.crowdconscious.app TXT

# 3. Add DMARC record (optional but recommended)
Type: TXT
Name: _dmarc.crowdconscious.app
Value: v=DMARC1; p=none; rua=mailto:comunidad@crowdconscious.app
```

---

## Summary

**Current State**:
- ✅ Code configured correctly (`comunidad@crowdconscious.app`)
- ✅ All email references updated
- ⏳ Waiting for DNS verification in Resend

**Action Required**:
1. Add DNS records to domain registrar (from Resend dashboard)
2. Wait 1-24 hours for verification
3. Test with `/api/test-email` route
4. Monitor Resend logs for delivery

**Temporary Workaround** (while waiting):
- Use `onboarding@resend.dev` in `lib/resend.ts`
- This works immediately but only in dev/testing

**Production Ready** (after DNS verified):
- All emails will send from `comunidad@crowdconscious.app`
- Professional, branded email address
- Full delivery tracking in Resend dashboard

**The code is ready! Just need DNS records to be verified.** 📧✅

