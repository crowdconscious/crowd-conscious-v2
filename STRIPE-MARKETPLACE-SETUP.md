# Stripe Marketplace Setup Guide

**Status**: ✅ Ready for Production  
**Date**: November 3, 2025

---

## 🎯 **GOOD NEWS!**

**You don't need to configure anything new!** 🎉

Your existing Stripe integration already works for the marketplace. Here's why:

---

## ✅ **WHAT'S ALREADY CONFIGURED**

### **1. Stripe Keys** (Vercel Environment Variables)
```
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

✅ Already set in Vercel  
✅ Works for both sponsorships and module purchases  
✅ No changes needed

---

### **2. Webhook Endpoint**
**URL**: `https://crowdconscious.app/api/webhooks/stripe`

✅ Already configured in Stripe Dashboard  
✅ Already listening for `checkout.session.completed` events  
✅ Smart routing based on `metadata.type`:
  - `metadata.type = 'sponsorship'` → Handles community needs
  - `metadata.type = 'module_purchase'` → Handles marketplace sales

---

### **3. How It Works**

#### **Sponsorship Flow** (Existing):
```
User sponsors need
  ↓
Stripe Checkout
  ↓
Webhook receives: metadata.type = undefined (or sponsorshipId present)
  ↓
Routes to sponsorship handler
  ↓
Updates sponsorship status
  ↓
Transfers to Stripe Connect account (if applicable)
```

#### **Module Purchase Flow** (New):
```
Corporate admin buys modules
  ↓
Stripe Checkout
  ↓
Webhook receives: metadata.type = 'module_purchase'
  ↓
Routes to handleModulePurchase()
  ↓
Revenue distribution (30/50/20 to wallets)
  ↓
Employee enrollment
  ↓
Cart clearing
```

---

## 🔄 **REVENUE DISTRIBUTION**

### **Sponsorships** (Existing):
- 85% to community (via Stripe Connect)
- 15% platform fee

### **Module Sales** (New):
- 30% Platform wallet (internal)
- 50% Community wallet (internal)
- 20% Creator wallet (internal)
- **No Stripe Connect needed** (handled internally via `wallets` table)

---

## 🆚 **STRIPE CONNECT vs INTERNAL WALLETS**

### **Why Sponsorships Use Stripe Connect**:
- Direct payouts to community bank accounts
- Immediate transfers
- Community owns the funds in Stripe

### **Why Module Sales Use Internal Wallets**:
- More control over revenue splitting
- Flexible donation options (creator → community)
- Batch withdrawals (future)
- Platform holds funds until withdrawal
- Lower fees (no per-transaction connect fees)

---

## 🔐 **SECURITY**

Both flows are secure:
- ✅ Webhook signature verification
- ✅ Metadata validation
- ✅ Server-side processing only
- ✅ No client-side secrets
- ✅ Supabase RLS policies

---

## 📊 **TESTING CHECKLIST**

### **Test Mode** (Before Production):
1. Use Stripe test keys:
   ```
   STRIPE_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   ```
2. Use test card: `4242 4242 4242 4242`
3. Verify webhook receives event
4. Verify revenue distribution in wallets
5. Verify employee enrollment

### **Production** (After Testing):
1. Switch to live keys
2. Test with real card (small amount)
3. Verify webhook in Stripe Dashboard logs
4. Verify wallets updated
5. Verify employees enrolled

---

## 🎓 **WEBHOOK TESTING**

### **Local Testing** (Stripe CLI):
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

### **Production Testing**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. View recent events
4. Check for `checkout.session.completed` events
5. Verify they show "succeeded"

---

## 🐛 **TROUBLESHOOTING**

### **Webhook Not Receiving Events**:
- Check Stripe Dashboard → Webhooks → View logs
- Verify webhook URL is correct
- Verify webhook signing secret matches
- Check Vercel logs for incoming requests

### **Revenue Not Distributing**:
- Check `module_sales` table for records
- Check `wallet_transactions` table for credits
- Verify `process_module_sale()` function exists
- Check Supabase logs for errors

### **Employees Not Enrolling**:
- Check `course_enrollments` table
- Verify employees exist in `profiles` table
- Check `is_corporate_user = true`
- Verify `corporate_account_id` matches

---

## 📝 **METADATA STRUCTURE**

### **Module Purchase Metadata**:
```json
{
  "type": "module_purchase",
  "corporate_account_id": "uuid",
  "user_id": "uuid",
  "company_name": "Company Name",
  "cart_items": "[{\"module_id\":\"uuid\",\"employee_count\":50,\"price\":18000}]",
  "total_amount": "18000"
}
```

### **Sponsorship Metadata** (Legacy):
```json
{
  "sponsorshipId": "uuid",
  "sponsorType": "brand",
  "brandName": "Brand Name",
  "connectedAccountId": "acct_xxx",
  ...
}
```

---

## ✅ **DEPLOYMENT VERIFICATION**

After deploying, verify:

1. ✅ Build succeeds (no TypeScript errors)
2. ✅ Environment variables set in Vercel
3. ✅ Stripe webhook endpoint active
4. ✅ Test purchase with test card
5. ✅ Check webhook logs in Stripe
6. ✅ Verify revenue in wallets
7. ✅ Verify employee enrollment
8. ✅ Verify cart cleared

---

## 🎯 **CONCLUSION**

**Your Stripe setup is already complete!** 🎉

The existing webhook endpoint intelligently handles both:
- Community needs sponsorships
- Module marketplace purchases

**No additional Stripe configuration needed.**

Just deploy and test! 🚀

---

## 📞 **SUPPORT**

If you encounter issues:
1. Check Vercel deployment logs
2. Check Stripe Dashboard webhook logs
3. Check Supabase logs
4. Contact: francisco@crowdconscious.app

---

**Last Updated**: November 3, 2025  
**Status**: Production Ready ✅


