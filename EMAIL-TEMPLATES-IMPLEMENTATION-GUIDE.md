# 📧 Email Templates - Implementation Guide

**Status**: Templates created ✅ | Needs configuration  
**Priority**: P1 - HIGH (Professional communication)  
**Time**: 30 minutes (configuration only)

---

## 📊 **What Was Created**

### ✅ **1. Signup Confirmation Email Template**
**File**: `app/lib/email-templates/signup-confirmation-email.tsx`

**Purpose**: Sent when user signs up to confirm email address

**Features**:
- Professional header with gradient (teal → purple)
- Clear CTA button ("Confirm Email Address")
- Feature preview cards
- Alternate link (for accessibility)
- Help section
- Matches platform design

**Usage**:
```typescript
import { SignupConfirmationEmail } from '@/app/lib/email-templates/signup-confirmation-email'

const emailHtml = render(
  <SignupConfirmationEmail 
    userName="John Doe"
    confirmLink="https://app.crowdconscious.app/auth/confirm?token=..."
  />
)
```

---

### ✅ **2. Purchase Welcome Email Template**
**File**: `app/lib/email-templates/purchase-welcome-email.tsx`

**Purpose**: Sent immediately after user purchases a module

**Features**:
- Celebration header 🎉
- Module info card with core value emoji/color
- Quick stats (lessons, hours, certificate)
- "What to Expect" section
- Pro tips for success
- Multiple CTAs
- Professional design

**Usage**:
```typescript
import { PurchaseWelcomeEmail } from '@/app/lib/email-templates/purchase-welcome-email'

const emailHtml = render(
  <PurchaseWelcomeEmail 
    userName="María González"
    moduleName="Aire Limpio para Todos"
    coreValue="clean_air"
    lessonCount={6}
    estimatedHours={4}
    moduleUrl="https://app.crowdconscious.app/employee-portal/modules/123"
  />
)
```

---

## 🔧 **Configuration Steps**

### **Step 1: Configure Supabase Email Templates**

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**

2. **Update "Confirm Signup" Template**:
   - Click "Confirm Signup"
   - Replace HTML with custom template
   - Use variables:
     - `{{ .ConfirmationURL }}` - confirmation link
     - `{{ .SiteURL }}` - your site URL

3. **Save** and test by creating a new account

---

### **Step 2: Set Up Email Service (Resend)**

**Current Status**: You're using Resend API

1. **Verify Environment Variables**:
```bash
# Check .env.local
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=https://crowdconscious.app
```

2. **Verify Domain**:
   - Go to [resend.com](https://resend.com) dashboard
   - Check that `crowdconscious.app` domain is verified
   - DNS records must be properly set

3. **Test Email Sending**:
```typescript
// In browser console or test file
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'your@email.com' })
})
```

---

### **Step 3: Wire Purchase Email to Webhook**

**File to Modify**: `app/api/webhooks/stripe/route.ts`

**Where to Add**: After successful enrollment (line ~150-160)

**Code to Add**:
```typescript
// Add import at top of file
import { render } from '@react-email/render'
import { PurchaseWelcomeEmail } from '@/app/lib/email-templates/purchase-welcome-email'
import { sendEmail } from '@/lib/email-simple'

// In handleModulePurchase function, after enrollment success:

// Get module details for email
const { data: moduleData } = await supabaseClient
  .from('marketplace_modules')
  .select('title, description, core_value, lesson_count, estimated_hours')
  .eq('id', module_id)
  .single()

// Get user details
const { data: userData } = await supabaseClient
  .from('profiles')
  .select('full_name, email')
  .eq('id', user_id)
  .single()

if (moduleData && userData) {
  try {
    // Render email HTML
    const emailHtml = render(
      <PurchaseWelcomeEmail
        userName={userData.full_name || 'there'}
        moduleName={moduleData.title}
        moduleDescription={moduleData.description}
        coreValue={moduleData.core_value || 'sustainability'}
        lessonCount={moduleData.lesson_count || 5}
        estimatedHours={moduleData.estimated_hours || 3}
        moduleUrl={`${process.env.NEXT_PUBLIC_APP_URL}/employee-portal/modules/${module_id}`}
        certificatePreview={true}
      />
    )

    // Send email
    await sendEmail(userData.email, {
      subject: `¡Bienvenido a ${moduleData.title}! 🎉`,
      html: emailHtml
    })

    console.log('✅ Purchase welcome email sent to:', userData.email)
  } catch (emailError) {
    console.error('❌ Failed to send purchase email:', emailError)
    // Don't fail the whole purchase if email fails
  }
}
```

---

### **Step 4: Configure Signup Confirmation Email**

**Supabase Auth Email Templates**:

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Click "Confirm signup"
3. **Replace** the HTML with:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - Crowd Conscious</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Gradient -->
    <div style="background: linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Crowd Conscious</h1>
      <p style="margin: 8px 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">Communities Creating Impact Together</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px; background-color: #ffffff;">
      <h2 style="margin: 0 0 20px; font-size: 28px; font-weight: 700; color: #1f2937; text-align: center;">
        Welcome to Crowd Conscious! 🌍
      </h2>
      
      <p style="margin: 0 0 30px; font-size: 16px; color: #4b5563; text-align: center; line-height: 1.7;">
        We're excited to have you join our platform! To get started, please confirm your email address by clicking the button below.
      </p>

      <!-- Confirmation Button -->
      <div style="text-align: center; background-color: #f8fafc; padding: 40px 30px; border-radius: 16px; margin: 0 0 40px; border: 2px solid #e5e7eb;">
        <h3 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #1f2937;">
          Confirm your email address
        </h3>
        
        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #14b8a6, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);">
          Confirm Email Address →
        </a>
        
        <p style="margin: 20px 0 0; font-size: 13px; color: #6b7280;">
          This link will expire in 24 hours for your security.
        </p>
      </div>

      <!-- Features Section -->
      <h3 style="margin: 0 0 25px; font-size: 22px; font-weight: 600; color: #1f2937; text-align: center;">
        What's waiting for you inside? ✨
      </h3>

      <!-- Feature Cards -->
      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; align-items: flex-start;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #14b8a6, #10b981); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 15px;">
            🏘️
          </div>
          <div>
            <h4 style="margin: 0 0 6px; font-size: 17px; font-weight: 600; color: #1f2937;">Join Impact Communities</h4>
            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
              Connect with local communities working on environmental and social impact projects
            </p>
          </div>
        </div>
      </div>

      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; align-items: flex-start;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 15px;">
            📚
          </div>
          <div>
            <h4 style="margin: 0 0 6px; font-size: 17px; font-weight: 600; color: #1f2937;">Learn ESG & Sustainability</h4>
            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
              Access expert-designed modules on clean air, water, zero waste, and more
            </p>
          </div>
        </div>
      </div>

      <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; align-items: flex-start;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 15px;">
            📊
          </div>
          <div>
            <h4 style="margin: 0 0 6px; font-size: 17px; font-weight: 600; color: #1f2937;">Track Your Impact</h4>
            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
              Download professional ESG reports showing your environmental contribution
            </p>
          </div>
        </div>
      </div>

      <!-- Alternate Link -->
      <div style="text-align: center; padding: 30px 20px; background-color: #fef3c7; border-radius: 10px; border: 1px solid #fbbf24; margin: 30px 0 0;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #92400e; font-weight: 500;">
          Button not working?
        </p>
        <p style="margin: 0; font-size: 12px; color: #78350f; line-height: 1.6;">
          Copy and paste this link into your browser:<br>
          <a href="{{ .ConfirmationURL }}" style="color: #1f2937; text-decoration: underline; word-break: break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </div>

      <!-- Help -->
      <div style="text-align: center; margin: 40px 0 0;">
        <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
          Didn't create an account? You can safely ignore this email.<br>
          Questions? Reply to this email - we're here to help! 💬
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px 30px 40px; background-color: #f8fafc; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280;">
        <a href="{{ .SiteURL }}/communities" style="color: #14b8a6; text-decoration: none; margin: 0 8px;">Browse Communities</a>
        •
        <a href="{{ .SiteURL }}/marketplace" style="color: #14b8a6; text-decoration: none; margin: 0 8px;">Marketplace</a>
        •
        <a href="{{ .SiteURL }}/about" style="color: #14b8a6; text-decoration: none; margin: 0 8px;">About Us</a>
      </p>
      <p style="margin: 10px 0; font-size: 11px; color: #9ca3af; line-height: 1.4;">
        © 2025 Crowd Conscious. All rights reserved.<br>
        Building communities, creating measurable impact.
      </p>
    </div>
  </div>
</body>
</html>
```

4. **Click "Save"**

---

## 🧪 **Testing**

### **Test Signup Email**:
1. Log out of your account
2. Go to signup page
3. Create new account with test email
4. Check inbox for confirmation email
5. Verify design looks professional

### **Test Purchase Email**:
1. Buy a module (use test mode Stripe if available)
2. Complete payment
3. Check inbox for purchase welcome email
4. Verify:
   - Module name correct
   - Core value emoji/color correct
   - CTA links work
   - Design is professional

---

## 📊 **Email Design Consistency**

All emails now follow this design pattern:

| Element | Style |
|---------|-------|
| **Header** | Gradient (teal → purple) with logo |
| **Typography** | Inter font, clear hierarchy |
| **Colors** | Teal (#14b8a6), Purple (#8b5cf6), Blue (#3b82f6) |
| **Buttons** | Gradient, rounded, prominent |
| **Cards** | White bg, border, rounded, emoji icons |
| **Footer** | Light gray, links, copyright |

**Result**: Professional, on-brand emails that build trust ✅

---

## ✅ **Success Criteria**

Emails are working when:

1. ✅ Signup confirmation looks professional (not default Supabase)
2. ✅ Purchase emails send immediately after payment
3. ✅ All links work correctly
4. ✅ Mobile responsive (test on phone)
5. ✅ Images/emojis display correctly
6. ✅ No broken layout in major email clients

---

## 🎯 **Next Steps**

1. ⏳ **Configure Supabase email template** (5 min)
2. ⏳ **Add purchase email to webhook** (10 min)
3. ⏳ **Test both emails** (5 min)
4. ⏳ **Monitor Resend dashboard for delivery** (ongoing)

**Total Time**: ~30 minutes

---

## 📝 **Notes**

- **Email Service**: Using Resend (already configured)
- **React Email**: Templates use `@react-email/components`
- **Variables**: Supabase provides `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`
- **Fallback**: If email fails, user can still use platform

---

**Status**: Templates created ✅ | Ready for configuration ⏳

