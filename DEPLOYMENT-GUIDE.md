# 🚀 Vercel Deployment Guide for Crowd Conscious

## 📋 Pre-Deployment Checklist

### Environment Variables Required:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe (Required for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key (production) or pk_test_your_key (testing)
STRIPE_SECRET_KEY=sk_live_your_key (production) or sk_test_your_key (testing)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Resend (Required for emails)
RESEND_API_KEY=re_your_resend_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Admin Configuration
ADMIN_EMAIL=your_admin_email@example.com
```

## 🔧 Vercel Deployment Steps

### 1. Connect to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link
```

### 2. Configure Environment Variables

- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Add all required variables listed above
- Set them for Production, Preview, and Development environments

### 3. Set Up Custom Domain

- Purchase domain or use existing one
- Add domain in Vercel Dashboard → Domains
- Update DNS records as instructed
- Update NEXT_PUBLIC_APP_URL to your custom domain

### 4. Configure Supabase for Production

```sql
-- Update allowed origins in Supabase Dashboard
-- Go to Authentication → URL Configuration
-- Add your Vercel domain to "Site URL" and "Redirect URLs"
```

### 5. Set Up Stripe Webhooks

- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
- Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy webhook secret to environment variables

### 6. Verify Resend Domain

- Go to Resend Dashboard → Domains
- Add your custom domain
- Update DNS records for domain verification
- Update `FROM_EMAIL` in `lib/email-simple.ts`

### 7. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploys)
git push origin main
```

## 🔒 Production Security Checklist

### Database Security:

- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Admin user configured with proper permissions
- [ ] Database backups enabled
- [ ] API rate limiting configured

### Environment Security:

- [ ] All API keys use live/production versions
- [ ] No test keys in production environment
- [ ] Webhook secrets properly configured
- [ ] Admin email verified and secure

### Domain Security:

- [ ] HTTPS enforced (Vercel provides this automatically)
- [ ] Custom domain configured
- [ ] DNS records properly set
- [ ] SSL certificate active

## 📊 Performance Optimization

### Vercel Configuration (`vercel.json`):

```json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/admin/(.*)",
      "destination": "/admin/$1"
    }
  ]
}
```

### Build Optimization:

- Enable Vercel Speed Insights
- Configure bundle analyzer
- Optimize images with Vercel Image Optimization
- Enable Edge Functions for API routes

## 🧪 Testing in Production

### 1. Payment Testing:

- Use Stripe test mode initially
- Test with real credit cards in live mode
- Verify 15% platform fee collection
- Test webhook delivery

### 2. Email Testing:

- Send test emails from `/admin/test-systems`
- Verify domain reputation
- Test delivery to different email providers
- Monitor bounce rates

### 3. Admin Testing:

- Verify admin dashboard access
- Test community moderation
- Test user management
- Verify audit trail logging

### 4. User Flow Testing:

- Complete user registration → community joining → content creation
- Test brand registration → sponsorship discovery → payment
- Verify mobile responsiveness
- Test all interactive features

## 📈 Monitoring & Analytics

### Vercel Analytics:

- Enable Vercel Analytics for performance monitoring
- Set up Error Tracking
- Monitor Core Web Vitals
- Track user engagement

### Custom Monitoring:

```typescript
// Add to app/layout.tsx
if (process.env.NODE_ENV === "production") {
  // Add your analytics code
}
```

### Database Monitoring:

- Monitor Supabase metrics
- Set up alerts for high usage
- Track query performance
- Monitor storage usage

## 🚨 Emergency Procedures

### Rollback Strategy:

```bash
# Rollback to previous deployment
vercel rollback

# Or deploy specific commit
vercel --prod --scope your-team
```

### Incident Response:

1. Check Vercel deployment status
2. Verify Supabase connectivity
3. Check Stripe webhook delivery
4. Monitor error logs in Vercel dashboard
5. Test critical user flows

## 🔄 CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📋 Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Custom domain working with HTTPS
- [ ] Admin dashboard accessible
- [ ] Payment system functional
- [ ] Email notifications working
- [ ] Database connections stable
- [ ] All API endpoints responding
- [ ] Mobile responsiveness verified
- [ ] Error monitoring active
- [ ] Backup systems configured
