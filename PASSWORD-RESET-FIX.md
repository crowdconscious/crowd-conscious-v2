# Password Reset Fix - 504 Timeout Issue

## Problem
The password reset form was getting stuck with a 504 timeout error when trying to send the reset email.

## Solution
Created a server-side API route to handle password reset requests, avoiding client-side timeout issues.

## Changes Made

### 1. Created API Route
- **File**: `app/api/auth/reset-password/route.ts`
- Handles password reset requests server-side
- Better error handling and timeout management
- Uses server-side Supabase client

### 2. Updated Forgot Password Page
- **File**: `app/(public)/forgot-password/page.tsx`
- Now calls the API route instead of Supabase directly
- Removed unused imports
- Better error messages for users

## Important: Supabase Configuration Required

**You MUST configure the redirect URL in Supabase:**

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Under **"Redirect URLs"**, add:
   - **Production**: `https://crowdconscious.app/reset-password`
   - **Development**: `http://localhost:3000/reset-password` (if testing locally)

3. Also verify the **"Site URL"** is set correctly:
   - **Production**: `https://crowdconscious.app`
   - **Development**: `http://localhost:3000`

## Testing

After deploying these changes:

1. Go to `/forgot-password`
2. Enter your email
3. Click "Send Reset Link"
4. Should see success message immediately
5. Check email inbox for reset link

## If Still Having Issues

1. **Check Supabase Logs**: Dashboard → Logs → Auth
2. **Verify Environment Variables**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. **Check Network Tab**: Look for any CORS or network errors
4. **Verify Email Service**: Ensure Supabase email service is enabled and configured

## Environment Variables

Make sure these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (optional, will use request origin if not set)

