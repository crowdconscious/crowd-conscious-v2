# 🎁 Promo Code & Referral System Guide

**Version**: 1.0  
**Created**: November 6, 2025  
**Status**: Ready for Testing

---

## 📋 **What's Been Built**

A complete promotional code system that allows you to:
- ✅ Create unlimited promo codes for strategic partners
- ✅ Offer discounts from 1% to 100% (completely free)
- ✅ Track usage, campaigns, and partner ROI
- ✅ Apply codes during checkout
- ✅ Manage codes from admin dashboard

---

## 🚀 **Quick Start**

### **Step 1: Access Admin Dashboard**

1. Go to: `https://crowdconscious.app/admin/promo-codes`
2. You'll see stats and existing codes

### **Step 2: Create Your First Promo Code**

Click **"Crear Código"** and fill in:

**Example: 100% Free for Strategic Partner**
```
Code: ECOSOLUTIONS2025
Type: Gratis (100% OFF)
Max Uses: 10 (only 10 redemptions)
Max Uses Per User: 1
Partner Name: EcoTech Solutions
Campaign: Launch Partnership
Notes: Strategic partner - unlimited access for testing
```

**Example: 50% Discount for Partners**
```
Code: PARTNER50
Type: Porcentaje (%)
Value: 50
Max Uses: (leave empty for unlimited)
Max Uses Per User: 1
Partner Name: Partner Network
Campaign: Partner Program
```

**Example: Fixed Amount Off**
```
Code: SAVE5000
Type: Monto Fijo (MXN)
Value: 5000
Max Uses: 100
Minimum Purchase: 10000 (only for purchases over $10,000)
```

### **Step 3: Share Codes with Partners**

1. Click the **copy icon** next to any code
2. Share via email, WhatsApp, or your partner portal
3. Partners enter code in cart before checkout

---

## 🎯 **Use Cases & Examples**

### **1. Strategic Partner Onboarding (100% Free)**

**Scenario**: You want EcoTech Solutions to test your entire platform for free.

**Code Setup**:
- Code: `ECOTECH2025`
- Discount: Gratis (100% OFF)
- Max Uses: 50 (enough for their entire team)
- Partner Name: EcoTech Solutions
- Notes: "Full access demo for strategic partnership evaluation"

**What Happens**:
- EcoTech adds modules to cart
- Enters code `ECOTECH2025`
- Total: $0.00 MXN
- They get full access instantly

---

### **2. Launch Week Promotion**

**Scenario**: First 100 customers get 25% off.

**Code Setup**:
- Code: `LAUNCH25`
- Discount: 25%
- Max Uses: 100
- Valid Until: Dec 31, 2025
- Campaign: Launch Week

**What Happens**:
- Customers see 25% savings
- Code expires after 100 uses OR Dec 31
- You track performance in admin dashboard

---

### **3. Volume Partner Discount**

**Scenario**: Corporate partners buying for 200+ employees get 40% off.

**Code Setup**:
- Code: `CORPORATE40`
- Discount: 40%
- Minimum Purchase: 50000 MXN
- Applicable Purchase Types: Corporate only
- Max Uses Per User: 1

**What Happens**:
- Only works for large purchases (50k+)
- Automatically validates purchase type
- One-time use per company

---

### **4. Referral Rewards**

**Scenario**: When someone refers a new customer, give both 20% off.

**Code Setup**:
- Code: `FRIEND20-[NAME]` (create unique codes per referrer)
- Discount: 20%
- Max Uses: 10 (limit referrals)
- Campaign: Referral Program

**What Happens**:
- Track which referrer brought customers
- Reward both referrer and referee
- Monitor viral growth

---

## 💡 **Admin Dashboard Features**

### **Stats Overview**
- **Total Codes**: How many codes exist
- **Active Codes**: Currently usable codes
- **Total Uses**: Redemptions across all codes
- **Total Savings**: Money discounted (for ROI tracking)
- **Average Discount**: Typical savings per use

### **Code Management**
- **Activate/Deactivate**: Turn codes on/off instantly
- **Copy Code**: One-click share
- **View Usage**: See how many times used
- **Track Partner**: Associate with partner/campaign
- **Monitor ROI**: See total value given vs acquired customers

---

## 🛒 **User Experience (Cart)**

### **How Users Apply Codes**

1. User adds modules to cart
2. Cart sidebar opens
3. See **"Código Promocional"** section
4. Enter code (e.g., `PARTNER50`)
5. Click **"Aplicar"**
6. See discount applied:
   - Original: $18,000 MXN
   - Discount: -$9,000 MXN (50%)
   - **Total: $9,000 MXN**
7. Proceed to checkout with discounted price

### **Validation & Errors**

The system automatically checks:
- ✅ Code exists and is active
- ✅ Code hasn't expired
- ✅ User hasn't exceeded usage limit
- ✅ Cart meets minimum purchase amount
- ✅ Purchase type matches (if restricted)

**Error Examples**:
- "Código promocional no válido o inactivo"
- "Este código ha expirado"
- "Ya has utilizado este código el máximo de veces permitido"
- "Compra mínima de $10,000 MXN requerida"

---

## 📊 **Tracking & Analytics**

### **What Gets Tracked**

For every code use, we track:
- User who applied it
- Original cart total
- Discount amount
- Final total
- Modules purchased
- Timestamp
- Stripe session ID

### **How to Use This Data**

1. **Partner ROI**: See total value given to each partner
2. **Campaign Performance**: Compare which campaigns convert
3. **Fraud Detection**: Monitor suspicious usage patterns
4. **Pricing Strategy**: See which discount levels work best

---

## 🔧 **Technical Details**

### **Database Tables**

1. **`promo_codes`**: Store all codes and rules
2. **`promo_code_uses`**: Track every redemption
3. **`cart_items`**: Links applied codes to cart

### **API Endpoints**

- `POST /api/admin/promo-codes/create` - Create new code
- `PUT /api/admin/promo-codes/toggle` - Activate/deactivate
- `POST /api/cart/apply-promo` - Apply code to cart
- `DELETE /api/cart/apply-promo` - Remove code
- `GET /api/admin/promo-codes` - List all codes (in page component)

### **Validation Function**

The `validate_promo_code()` database function handles all business logic:
- Checks expiration
- Validates usage limits
- Calculates discount
- Returns detailed response

---

## ⚠️ **Important Notes**

### **Security**

- ✅ Codes are validated server-side (not client-side)
- ✅ Usage limits enforced in database
- ✅ Only admins can create codes
- ✅ IP tracking for fraud prevention

### **Best Practices**

1. **Naming Convention**: Use descriptive, uppercase codes
   - Good: `PARTNER50`, `LAUNCH100`
   - Bad: `promo`, `discount`

2. **Set Expiration**: Always set `valid_until` for time-limited campaigns

3. **Limit Uses**: Set `max_uses` for expensive discounts (e.g., 100% off)

4. **Track Partners**: Always fill in `partner_name` for accountability

5. **Test First**: Create a test code and try it yourself before sharing

---

## 🧪 **Testing Checklist**

Before launching to partners:

- [ ] **Test Admin Dashboard**
  - Go to `/admin/promo-codes`
  - Create a test code (e.g., `TEST100` - 100% off)
  - Verify it appears in the list
  - Try copying the code

- [ ] **Test Cart Application**
  - Add a module to cart
  - Open cart sidebar
  - Enter test code
  - Verify discount applied
  - Check total updates correctly

- [ ] **Test Validation**
  - Try invalid code → Should show error
  - Try expired code → Should show error
  - Use code twice (if limit = 1) → Should block second use

- [ ] **Test Checkout**
  - Apply code
  - Complete checkout
  - Verify discounted price charged
  - Check enrollment created correctly

- [ ] **Test Deactivation**
  - Deactivate a code in admin
  - Try using it in cart → Should fail

---

## 🚀 **Next Steps (TODO)**

### **Immediate (User Testing Required)**

1. ⏳ **Test creating codes in admin** (`/admin/promo-codes`)
2. ⏳ **Apply code in cart** and verify discount
3. ⏳ **Complete checkout** with discounted price

### **Future Enhancements (Phase 2)**

- [ ] Bulk code generation (create 100 unique codes at once)
- [ ] Auto-expiring codes (e.g., "valid for 7 days after first use")
- [ ] Code analytics dashboard (conversion rates, revenue impact)
- [ ] Email integration (send codes automatically)
- [ ] API for partners to generate their own codes
- [ ] Tiered discounts (spend $X, get Y% off)
- [ ] Bundle discounts (buy 3 modules, get 1 free)

---

## 💼 **Partner Pitch Template**

Use this when sharing codes with strategic partners:

---

**Subject**: Exclusive Access to Crowd Conscious Platform

Hi [Partner Name],

We're excited to offer you exclusive access to the Crowd Conscious platform!

**Your Exclusive Code**: `[CODE]`

**Benefits**:
- ✅ [X]% discount on all modules
- ✅ Access to [Y] courses
- ✅ Valid until [DATE]
- ✅ [Additional perks]

**How to Redeem**:
1. Visit: crowdconscious.app/marketplace
2. Add modules to cart
3. Enter code: `[CODE]`
4. Complete checkout

Questions? Reply to this email or call us at [PHONE].

Best,  
[Your Name]

---

## 📞 **Support**

For technical issues or questions:
- Email: francisco@crowdconscious.app
- Admin Dashboard: `/admin/promo-codes`
- This Guide: `PROMO-CODE-SYSTEM-GUIDE.md`

---

## 🎉 **Sample Codes Created**

These codes are already in your database:

| Code | Discount | Uses | Description |
|------|----------|------|-------------|
| `LAUNCH100` | 100% OFF | 50 max | Strategic partners - completely free |
| `PARTNER50` | 50% OFF | Unlimited | Partner network discount |
| `WELCOME25` | 25% OFF | Unlimited | New user welcome discount |

**Try them now!** Add a module to cart and test applying `LAUNCH100` for free access.

---

**🚀 Ready to launch your partnership program!**

