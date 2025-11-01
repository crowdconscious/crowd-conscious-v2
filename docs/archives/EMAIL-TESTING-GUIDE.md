# 📧 Email System Testing Guide

## 🚀 Quick Test Steps

### **Step 1: Deploy the Test Endpoint**

```bash
# Build and deploy
npm run build
git add .
git commit -m "Add email testing endpoint"
git push origin main
```

### **Step 2: Test API Integration Status**

Visit: `https://your-domain.vercel.app/api/test-integrations`

**Expected Response:**

```json
{
  "resend": {
    "configured": true,
    "status": "connected",
    "domains_count": 1
  }
}
```

### **Step 3: Test Welcome Email**

**Method:** POST to `https://your-domain.vercel.app/api/test-email`

**Body:**

```json
{
  "type": "welcome",
  "email": "your-email@gmail.com",
  "name": "Your Name"
}
```

**Using curl:**

```bash
curl -X POST https://your-domain.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "email": "your-email@gmail.com",
    "name": "Test User"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "welcome email sent successfully to your-email@gmail.com",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Step 4: Test Brand Welcome Email**

```json
{
  "type": "welcome-brand",
  "email": "your-email@gmail.com",
  "name": "Your Company"
}
```

### **Step 5: Test Custom Email**

```json
{
  "type": "custom",
  "email": "your-email@gmail.com"
}
```

### **Step 6: Test Sponsorship Email**

```json
{
  "type": "sponsorship",
  "email": "your-email@gmail.com",
  "testData": {
    "brandName": "EcoTech Solutions",
    "needTitle": "Community Garden Project",
    "amount": 2500,
    "communityName": "Green Valley Community"
  }
}
```

## 🔧 Using Browser/Postman

### **Option A: Browser Console**

```javascript
// Open browser console on your site and run:
fetch("/api/test-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "welcome",
    email: "your-email@gmail.com",
    name: "Test User",
  }),
})
  .then((res) => res.json())
  .then((data) => console.log(data));
```

### **Option B: Postman/Insomnia**

1. Create new POST request
2. URL: `https://your-domain.vercel.app/api/test-email`
3. Headers: `Content-Type: application/json`
4. Body: Use JSON examples above

## ✅ Success Indicators

### **Email Sent Successfully:**

- API returns `{ "success": true }`
- Check your email inbox (including spam folder)
- Email should have Crowd Conscious branding
- Links should work properly

### **Common Issues & Solutions:**

**❌ "Email service not configured"**

- Check Vercel environment variables
- Ensure `RESEND_API_KEY` is set correctly

**❌ "Domain not verified"**

- In Resend dashboard, verify your sending domain
- Or use Resend's default domain for testing

**❌ Email not received**

- Check spam/junk folder
- Try different email address
- Check Resend dashboard for delivery status

## 🎯 Integration Tests

### **Test Signup Email Trigger**

1. Go to `/signup` on your site
2. Create new account with test email
3. Check if welcome email arrives automatically

### **Test Admin Email Features**

1. Access `/admin` (after setting up admin)
2. Look for email template testing features
3. Send test emails from admin panel

## 📊 Monitoring

### **Resend Dashboard**

- Visit [resend.com](https://resend.com) dashboard
- Check "Emails" section for delivery status
- Monitor bounce rates and opens

### **Application Logs**

- Check Vercel function logs
- Look for email send confirmations
- Monitor for any error messages

---

## 🚨 Troubleshooting

If emails aren't working:

1. **Check API Keys:** Visit `/api/test-integrations`
2. **Verify Domain:** Ensure sending domain is verified in Resend
3. **Check Logs:** Look at Vercel function logs for errors
4. **Test Different Email:** Try Gmail, Outlook, etc.
5. **Check Spam:** Email might be filtered

---

**✅ Once emails are working, proceed to implement Comments System and Event Registration!**
