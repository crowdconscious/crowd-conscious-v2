# Email Rate Limit Exceeded – Debug Guide

## What Happened

The error **"email rate limit exceeded"** comes from **Supabase Auth**, not from your app. Supabase limits how many auth emails (signup confirmations, password resets) can be sent per hour to prevent abuse.

## Default Limits

- **Built-in Supabase SMTP**: ~4 emails per hour (shared across signup + password reset)
- Limits apply per Supabase project, not per user

## Immediate Fixes Applied

1. **Friendlier error message** – Users now see: *"Too many requests. Please wait a few minutes and try again."* instead of the raw Supabase error.
2. **Signup page** – Now handles rate limit errors (previously showed raw message).
3. **Password reset** – Already handled; message improved for consistency.

## Long-Term Solutions

### 1. Use Custom SMTP (Recommended)

Configure Supabase to use your own email provider (e.g. Resend):

1. **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**
2. Enable custom SMTP
3. Use Resend SMTP:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - User: `resend`
   - Password: your `RESEND_API_KEY`

This bypasses Supabase’s built-in limits and uses Resend’s higher limits.

### 2. Adjust Supabase Rate Limits

If you have a paid Supabase plan, you can change rate limits via the Management API or dashboard (if available).

### 3. For the Affected User

- Ask them to wait **15–30 minutes** before trying again
- If they were testing multiple times, that likely triggered the limit
- Confirm they’re on the correct screen (signup vs. password recovery)

## Verification

- **Signup**: `/signup` – creates account and sends confirmation email
- **Password reset**: `/forgot-password` → `/api/auth/reset-password` – sends reset email

Both flows use Supabase Auth and share the same email rate limit.
