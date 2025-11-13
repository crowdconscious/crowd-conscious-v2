# Supabase Password Reset Email Template Setup Guide

## Step-by-Step Instructions

### Step 1: Navigate to Email Templates

1. Go to your **Supabase Dashboard**
2. Click **Authentication** in the left sidebar
3. Click **Email Templates** tab
4. Select **"Reset Password"** template from the dropdown

### Step 2: Configure the Email Template

In the **"Body"** editor (Source tab), replace the content with this HTML:

```html
<h2>Reset Your Password</h2>

<p>Hi there!</p>

<p>We received a request to reset your password for your Crowd Conscious account.</p>

<p>Click the button below to reset your password:</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="background: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
    Reset Password
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p style="word-break: break-all; color: #64748b;">{{ .ConfirmationURL }}</p>

<p style="color: #64748b; font-size: 14px;">
  This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
</p>

<p style="color: #64748b; font-size: 14px; margin-top: 20px;">
  Best regards,<br>
  The Crowd Conscious Team
</p>
```

### Step 3: Configure the Subject Line

In the **"Subject"** field, enter:

```
Reset Your Password - Crowd Conscious
```

### Step 4: Configure Redirect URLs (IMPORTANT!)

1. Still in **Authentication** settings
2. Click **URL Configuration** tab
3. Under **"Redirect URLs"**, add these URLs:

**For Development:**
```
http://localhost:3000/reset-password
```

**For Production:**
```
https://yourdomain.com/reset-password
```

⚠️ **Important**: Replace `yourdomain.com` with your actual production domain!

### Step 5: Understanding Template Variables

Here's what each template variable does:

- **`{{ .ConfirmationURL }}`** ✅ **USE THIS** - Contains the full reset link with token
- **`{{ .Token }}`** - Just the token (not needed for our implementation)
- **`{{ .TokenHash }}`** - Hashed token (not needed)
- **`{{ .SiteURL }}`** - Your site URL
- **`{{ .Email }}`** - User's email address
- **`{{ .RedirectTo }}`** - The redirect URL you specified

### Step 6: Preview the Template

1. Click the **"Preview"** tab to see how the email will look
2. The `{{ .ConfirmationURL }}` will show as a placeholder
3. Make sure the button/link is visible and styled correctly

### Step 7: Save and Test

1. Click **"Save"** button
2. Test the flow:
   - Go to your app's login page
   - Click "Forgot password?"
   - Enter your email
   - Check your inbox for the reset email

## Alternative: Simple Text-Only Template

If you prefer a simpler template without HTML styling:

```html
Reset Your Password

Hi there!

We received a request to reset your password for your Crowd Conscious account.

Click this link to reset your password:
{{ .ConfirmationURL }}

This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.

Best regards,
The Crowd Conscious Team
```

## Troubleshooting

### Issue: Reset link doesn't work

**Check:**
1. ✅ Redirect URL is added in URL Configuration
2. ✅ URL matches exactly (including `http://` vs `https://`)
3. ✅ No trailing slashes in the URL

### Issue: Email not received

**Check:**
1. ✅ Check spam folder
2. ✅ Verify email address is correct
3. ✅ Check Supabase logs: **Logs** → **Auth** → Look for email sending errors
4. ✅ Verify email service is enabled in Supabase project settings

### Issue: Template variables not working

**Solution:**
- Make sure you're using `{{ .ConfirmationURL }}` (with the dot and capital letters)
- Don't use spaces: `{{ .ConfirmationURL }}` ✅ not `{{ . ConfirmationURL }}` ❌

## Visual Guide

When you're in the Supabase template editor:

```
┌─────────────────────────────────────────┐
│ Source  │  Preview                      │
├─────────────────────────────────────────┤
│ Body:                                   │
│ ┌─────────────────────────────────────┐ │
│ │ <h2>Reset Your Password</h2>        │ │
│ │ <p>Click here: {{ .ConfirmationURL }}│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Template Variables (click to insert):  │
│ [{{ .ConfirmationURL }}] [{{ .Token }}] │
└─────────────────────────────────────────┘
```

## Quick Checklist

- [ ] Selected "Reset Password" template
- [ ] Added HTML with `{{ .ConfirmationURL }}` link
- [ ] Set subject line
- [ ] Added redirect URL(s) in URL Configuration
- [ ] Saved the template
- [ ] Tested the flow end-to-end

---

**Need Help?** If you encounter issues, check:
1. Supabase Dashboard → Logs → Auth (for email sending logs)
2. Browser console (for frontend errors)
3. Network tab (to see if reset request is being sent)

