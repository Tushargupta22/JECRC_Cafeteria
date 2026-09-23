# Quick Test Guide - Task 10: Cart Discount Fix

## What Was Fixed
Cart now shows and applies the **correct subscription discount percentage**:
- Weekly Snack Pass → **10% discount**
- Monthly Plus Membership → **15% discount** ✅ (was showing 10%)
- Semester Unlimited → **20% discount**

---

## How to Test

### Step 1: Clear Browser Cache
```
Press: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
```
This ensures you're testing with fresh data.

### Step 2: Login
- Go to http://localhost:5173
- Login with your account (or create new one)

### Step 3: Subscribe to Monthly Plus Membership
- Click "Rewards Plus" in navigation
- Find "Monthly Plus Membership" (₹599)
- Click "Join Plus" button
- ✅ Alert should say: "Your Monthly Plus Membership membership is now active. **15% discount** will automatically apply at checkout!"

### Step 4: Add Items to Cart
- Go to "Menu" page
- Add any item(s) to cart
- Example: 2x Crispy Veggie Crunch Burger (₹60 each) = ₹120 subtotal

### Step 5: Check Cart
Open cart and verify:

**✅ Expected Display**:
```
Item Subtotal: ₹120
Cafeteria Plus Member Discount (15%) -₹18
Total: ₹102
```

**❌ Old Behavior (FIXED)**:
```
Item Subtotal: ₹120
Cafeteria Plus Member Discount (10%) -₹12  ← WRONG!
Total: ₹108
```

### Step 6: Place Order (Optional)
- Click "Pay & Pickup"
- Order should be created with 15% discount applied
- Check backend terminal logs:
  ```
  [Order] Subscription discount: 18
  ```

---

## Test All Three Plans

### Test 1: Weekly Snack Pass
1. Subscribe to Weekly Snack Pass (₹199)
2. Add ₹100 item to cart
3. ✅ Should show: "Cafeteria Plus Member Discount (10%) -₹10"

### Test 2: Monthly Plus Membership
1. Subscribe to Monthly Plus Membership (₹599)
2. Add ₹120 item to cart
3. ✅ Should show: "Cafeteria Plus Member Discount (15%) -₹18"

### Test 3: Semester Unlimited
1. Subscribe to Semester Unlimited (₹1999)
2. Add ₹150 item to cart
3. ✅ Should show: "Cafeteria Plus Member Discount (20%) -₹30"

---

## Quick Verification Checklist

- [ ] Cart shows correct percentage in parentheses (10%, 15%, or 20%)
- [ ] Discount amount matches percentage calculation
- [ ] Success alert message shows correct percentage
- [ ] Order total is correct after discount
- [ ] Backend logs show correct subscription discount
- [ ] No console errors in browser (F12)

---

## Expected Results

| Subscription | Discount % | ₹100 Item | ₹200 Item |
|-------------|-----------|----------|----------|
| None | 0% | ₹100 | ₹200 |
| Weekly | 10% | ₹90 | ₹180 |
| Monthly | 15% | ₹85 | ₹170 |
| Semester | 20% | ₹80 | ₹160 |

---

## Troubleshooting

### Issue: Still showing 10%
**Solution**: Hard refresh (Ctrl + Shift + R) to clear React state

### Issue: No discount showing
**Solution**: 
1. Check if subscription is active
2. Check subscription expiry date
3. Logout and login again to refresh user data

### Issue: Wrong discount amount
**Solution**:
1. Open browser console (F12)
2. Check for errors
3. Verify user.subscription.discountPercentage is correct

---

## Files Changed

- ✅ `src/context/CartContext.tsx` - Discount calculation
- ✅ `src/components/menu/CartTray.tsx` - Discount display

---

## Success! 🎉

If you see "Cafeteria Plus Member Discount (15%)" for Monthly subscription, the fix is working!

User will now get the correct discount they paid for.

