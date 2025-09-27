# 🧪 Crowd Conscious Production Testing Suite

Comprehensive testing scripts to validate production readiness of the Crowd Conscious platform.

## 🎯 Features

### **User Flow Tests**

- ✅ User signup and authentication
- ✅ Community creation and management
- ✅ Content creation (needs, events, polls)
- ✅ Voting system functionality
- ✅ XP accumulation and gamification

### **Payment System Tests**

- 💳 Stripe integration validation
- 💰 15% platform fee calculation
- 🔒 Webhook security verification
- 📊 Payment flow end-to-end testing

### **Email System Tests**

- 📧 Resend API connectivity
- 🎨 Email template rendering
- 📱 Mobile-responsive email design
- 🔗 Unsubscribe functionality

### **Performance Tests**

- ⚡ Page load time validation (<3s target)
- 📱 Mobile responsiveness checks
- 🖼️ Image loading optimization
- 📊 Real-time update performance

### **Security Tests**

- 🛡️ Row Level Security (RLS) policies
- 🔐 Admin access protection
- 🚫 XSS prevention validation
- 🔒 API endpoint security

## 🚀 Quick Start

### Prerequisites

```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
RESEND_API_KEY=re_your_resend_key

# Optional
TEST_EMAIL=test@example.com
```

### Run Tests

#### **Option 1: Shell Script (Recommended)**

```bash
# Local environment
./scripts/run-tests.sh local

# Staging environment
./scripts/run-tests.sh staging

# Production environment (use with caution!)
./scripts/run-tests.sh production
```

#### **Option 2: Direct TypeScript Execution**

```bash
# Install tsx globally
npm install -g tsx

# Run tests
cd scripts
npx tsx test-production.ts
```

#### **Option 3: Using NPM Scripts**

```bash
cd scripts
npm install
npm run test:production
```

## 📊 Test Report

Tests generate a comprehensive `test-report.json` file with:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "http://localhost:3000",
  "totalTests": 15,
  "passed": 13,
  "failed": 2,
  "skipped": 0,
  "duration": 12.5,
  "results": [
    {
      "name": "User Signup",
      "category": "user-flow",
      "status": "pass",
      "duration": 450.2,
      "details": "User signup successful",
      "data": { "userId": "...", "email": "..." }
    }
  ],
  "summary": {
    "userFlows": { "passed": 4, "failed": 1 },
    "payments": { "passed": 3, "failed": 0 },
    "emails": { "passed": 2, "failed": 0 },
    "performance": { "passed": 2, "failed": 1 },
    "security": { "passed": 2, "failed": 0 }
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable                    | Required | Description                                   |
| --------------------------- | -------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | ✅       | Supabase project URL                          |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅       | Supabase service role key                     |
| `STRIPE_SECRET_KEY`         | ✅       | Stripe secret key (test mode)                 |
| `RESEND_API_KEY`            | ✅       | Resend API key                                |
| `NEXT_PUBLIC_APP_URL`       | ⚠️       | App URL (auto-detected)                       |
| `TEST_EMAIL`                | ⚠️       | Email for testing (default: test@example.com) |

### Test Categories

#### **User Flow Tests**

- Tests core user journey from signup to content interaction
- Validates community creation and membership
- Checks voting and engagement systems
- Verifies XP and gamification features

#### **Payment Tests**

- Validates Stripe integration with test cards
- Checks 15% platform fee calculation accuracy
- Tests webhook security and processing
- Verifies payment flow completion

#### **Email Tests**

- Tests Resend API connectivity
- Validates all email template rendering
- Checks mobile responsiveness
- Tests delivery and engagement tracking

#### **Performance Tests**

- Measures page load times (target: <3s)
- Tests mobile responsiveness
- Validates image optimization
- Checks real-time update performance

#### **Security Tests**

- Validates RLS policies on all tables
- Tests admin endpoint protection
- Checks XSS prevention measures
- Validates API security

## 🎯 Success Criteria

### **Production Ready Checklist**

- ✅ All user flows complete successfully
- ✅ Payment processing works with test cards
- ✅ Email system delivers messages reliably
- ✅ All pages load under 3 seconds
- ✅ Security policies prevent unauthorized access
- ✅ No XSS vulnerabilities detected
- ✅ Admin endpoints properly protected

### **Performance Benchmarks**

- **Page Load Time**: <3 seconds
- **Image Loading**: <2 seconds
- **API Response**: <500ms
- **Email Delivery**: <10 seconds

### **Security Standards**

- **RLS Enabled**: All sensitive tables
- **Admin Protection**: Requires authentication
- **XSS Prevention**: All user inputs sanitized
- **Payment Security**: PCI compliant via Stripe

## 🐛 Troubleshooting

### Common Issues

#### **Supabase Connection Failed**

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify Supabase project is active
```

#### **Stripe API Errors**

```bash
# Ensure using test keys (sk_test_...)
echo $STRIPE_SECRET_KEY | grep "sk_test"

# Check Stripe dashboard for API status
```

#### **Email Delivery Failed**

```bash
# Verify Resend API key
echo $RESEND_API_KEY | grep "re_"

# Check domain verification in Resend dashboard
```

#### **Performance Tests Failing**

- Check network connection stability
- Ensure app is running locally (npm run dev)
- Verify no heavy background processes

### Debug Mode

Add debug logging:

```bash
DEBUG=true npx tsx test-production.ts
```

## 📈 Continuous Integration

### GitHub Actions Integration

```yaml
name: Production Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install -g tsx
      - run: ./scripts/run-tests.sh staging
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_KEY }}
```

### Pre-deployment Validation

```bash
# Run before each deployment
./scripts/run-tests.sh staging

# Only deploy if all tests pass
if [ $? -eq 0 ]; then
    echo "✅ Tests passed - proceeding with deployment"
    vercel --prod
else
    echo "❌ Tests failed - deployment cancelled"
    exit 1
fi
```

## 🔄 Updates and Maintenance

### Adding New Tests

1. Create test method in `ProductionTester` class
2. Add to appropriate test category in `runAllTests()`
3. Update documentation and success criteria
4. Test locally before committing

### Test Data Cleanup

Tests automatically clean up created data, but for manual cleanup:

```sql
-- Remove test users (be careful in production!)
DELETE FROM profiles WHERE email LIKE 'test-%@example.com';

-- Remove test communities
DELETE FROM communities WHERE name LIKE 'Test Community %';

-- Remove test content
DELETE FROM community_content WHERE title LIKE 'Test %';
```

## 📞 Support

For issues with the testing suite:

1. Check environment variable configuration
2. Verify all services are running
3. Review test-report.json for detailed error information
4. Check application logs for additional context

**The testing suite ensures your Crowd Conscious platform is production-ready! 🚀**
