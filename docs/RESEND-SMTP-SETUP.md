# Resend SMTP Setup for Supabase Auth

## Errors You're Seeing

- **Signup**: "Error sending confirmation email"
- **Password reset**: "Error sending recovery email"

These come from **Supabase Auth** when its SMTP (Resend) fails to send. The fix is in the Supabase Dashboard, not in your app code.

---

## Step-by-Step Supabase + Resend Setup

### 1. Verify Your Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your domain (e.g. `crowdconscious.app`)
3. Add the DNS records Resend provides (MX, TXT, etc.)
4. Wait until the domain shows as **Verified**

**Important**: The sender email must use a verified domain. If you use `comunidad@crowdconscious.app`, that domain must be verified.

### 2. Get Resend SMTP Credentials

1. Go to [Resend API Keys](https://resend.com/api-keys)
2. Create an API key (or use existing)
3. For SMTP, use:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL)
   - **Username**: `resend`
   - **Password**: Your Resend API key (starts with `re_`)

### 3. Configure Supabase SMTP

1. Go to **Supabase Dashboard** → your project
2. **Authentication** (left sidebar) → **Email** (under Providers)
3. Scroll to **SMTP Settings**
4. Enable **Custom SMTP**
5. Fill in:
   - **Sender email**: `comunidad@crowdconscious.app` (must match a verified Resend domain)
   - **Sender name**: `Crowd Conscious`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **Username**: `resend`
   - **Password**: Your Resend API key
6. Click **Save**

### 4. Verify Redirect URLs

In **Authentication** → **URL Configuration**:

- **Site URL**: `https://crowdconscious.app`
- **Redirect URLs** must include:
  - `https://crowdconscious.app/auth/callback`
  - `https://crowdconscious.app/reset-password`

---

## Common Causes of "Error sending confirmation/recovery email"

| Cause | Fix |
|-------|-----|
| Domain not verified in Resend | Add DNS records and wait for verification |
| Wrong sender email | Use an address on your verified domain |
| Wrong API key | Copy the full key from Resend (starts with `re_`) |
| Resend free tier limits | Check [Resend limits](https://resend.com/docs/dashboard/overview) |
| Supabase SMTP not saved | Re-enter credentials and click Save |

---

## Test After Setup

1. **Signup**: Create a new account with a real email
2. **Password reset**: Go to `/forgot-password` and request a reset

Check Supabase **Logs** → **Auth** for any SMTP errors if it still fails.
