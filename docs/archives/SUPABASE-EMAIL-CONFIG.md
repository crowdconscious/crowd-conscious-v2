# Supabase Email Configuration Issue

## Problem

Signup is redirecting to Supabase domain instead of staying on your site.
Error: "No API key found in request"

## Root Cause

Supabase email confirmation is ENABLED, causing redirect to Supabase domain.

## Solution

### Option 1: Disable Email Confirmation (Quick Fix - RECOMMENDED for now)

1. **Open Supabase Dashboard** → Your Project
2. Go to **Authentication** → **Providers** → **Email**
3. Scroll to **"Confirm email"**
4. **TOGGLE OFF** "Enable email confirmation"
5. Click **Save**

This allows users to sign up and use the app immediately without email confirmation.

### Option 2: Configure Email Templates (Proper Fix)

If you want to keep email confirmation:

1. **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Select **"Confirm signup"**
3. Update the confirmation URL to:
   ```
   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
   ```
4. **Save**

Then update your auth callback to handle the token:

```typescript
// app/auth/callback/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  if (token_hash && type) {
    const supabase = await createServerAuth();
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=verification_failed", request.url)
      );
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ... rest of existing code
}
```

## Recommended Action

**For now: Use Option 1** (disable email confirmation)

This will allow immediate signups and you can add email confirmation later when you have time to properly configure it.
