# Leaderboard Fix - Testing Guide

## Date: September 12, 2026
## Task: Remove Fake/Demo Users from Leaderboard

---

## What Was Fixed

The leaderboard was showing fake/demo users from mock data. Now it only shows real registered users who have actually placed orders.

---

## Testing Steps

### Test 1: Fresh Database (No Orders)

**Expected Behavior**: Empty state UI should appear

1. **Start servers** (if not already running):
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   npm run dev
   ```

2. **Clear existing orders** (optional - for testing empty state):
   - Open MongoDB and clear the `orders` collection temporarily

3. **Visit Leaderboard pages**:
   - Navigate to `http://localhost:5173/live-leaderboard`
   - **Expected**: Should see "No Rankings Yet" with trophy icon
   - **Expected**: Message: "Be the first! Place an order to appear on the live leaderboard"
   
4. **Check Home page**:
   - Navigate to `http://localhost:5173/`
   - Scroll to "Today's Highlights" section
   - Check "Card 3: Today's Leaderboard Preview"
   - **Expected**: Should see "No rankings yet. Be the first to order!" with trophy icon
   
5. **Check RewardsPlus page**:
   - Navigate to `http://localhost:5173/rewards-plus`
   - Scroll to "Today's Top Spenders" section
   - **Expected**: Should see "Leaderboard Coming Soon" with trophy icon

---

### Test 2: Real User Orders

**Expected Behavior**: Only real users who placed orders should appear

1. **Create a test user**:
   - Click "Sign In" → "Create Account"
   - Register with real details:
     - Name: Test User 1
     - Email: testuser1@example.com
     - Password: Test123!
     - Department: Computer Science
   
2. **Place an order**:
   - Go to Menu
   - Add any item to cart
   - Complete payment (mock payment)
   - Order should be created with "Pending" status

3. **Check leaderboard immediately**:
   - Go to `/live-leaderboard`
   - **Expected**: "Test User 1" should appear in rank #1
   - **Expected**: Podium should show with this user
   - **Expected**: No fake users (Tushar Gupta, Rahul S., Aman V.)

4. **Wait 10 seconds**:
   - Leaderboard should auto-refresh
   - **Expected**: Same data (no fake users added)

---

### Test 3: Multiple Real Users

**Expected Behavior**: All real users ranked by spend amount

1. **Create second user** (different browser/incognito):
   - Register: Test User 2, testuser2@example.com
   - Place order worth ₹200

2. **Create third user**:
   - Register: Test User 3, testuser3@example.com
   - Place order worth ₹150

3. **Check leaderboard**:
   - Should see 3 real users ranked by spend
   - **Expected Order**:
     - Rank 1: Test User 2 (₹200)
     - Rank 2: Test User 1 (₹100 or whatever you ordered)
     - Rank 3: Test User 3 (₹150)

4. **Check all three pages**:
   - `/live-leaderboard` - Full podium with 3 real users
   - `/rewards-plus` - Podium showing same 3 users
   - `/` (Home) - Top 3 preview showing same users

---

### Test 4: Live Updates

**Expected Behavior**: Leaderboard auto-refreshes with new orders

1. **Place a new order** as existing user:
   - Login as Test User 3
   - Place order worth ₹300 (now total ₹450)

2. **Watch leaderboard** (don't refresh manually):
   - Wait 10 seconds
   - **Expected**: Rankings update automatically
   - **New Order**:
     - Rank 1: Test User 3 (₹450) - moved up!
     - Rank 2: Test User 2 (₹200)
     - Rank 3: Test User 1 (₹100)

3. **Verify on all pages**:
   - Check `/live-leaderboard` - updated
   - Check `/rewards-plus` - updated after 15 seconds
   - Check `/` (Home) - updated after 15 seconds

---

### Test 5: Error Handling

**Expected Behavior**: Show empty state on API errors

1. **Stop backend server** temporarily:
   - Press Ctrl+C in backend terminal

2. **Refresh leaderboard page**:
   - **Expected**: Empty array (no data)
   - **Expected**: Empty state UI appears
   - **Expected**: No JavaScript errors in console

3. **Restart backend**:
   ```bash
   cd backend
   npm run dev
   ```

4. **Wait 10 seconds**:
   - **Expected**: Data loads automatically
   - Real users reappear

---

### Test 6: Different Time Periods

**Expected Behavior**: Filtering by day/week/month works correctly

1. **Go to** `/live-leaderboard`

2. **Click "Today" tab**:
   - **Expected**: Only today's orders counted
   - Real users with today's orders appear

3. **Click "This Week" tab**:
   - **Expected**: Last 7 days orders counted
   - May show more users if orders exist from previous days

4. **Click "This Month" tab**:
   - **Expected**: Last 30 days orders counted
   - All users with orders in past month

5. **Verify**:
   - No fake/mock users in any period
   - Rankings update based on selected period

---

## What Should NEVER Appear

❌ **These fake users should NEVER show up**:
- Tushar Gupta (Computer Science '24)
- Rahul Sharma (Electronics Engg '25)
- Aman Verma (MBA Dept '26)
- Priya Singh (Design School '25)
- Aditya Jain (Economics '24)

If you see ANY of these names, the fix is not working correctly.

---

## Checklist

- [ ] Empty state shows when no orders exist
- [ ] Real users appear immediately after placing orders
- [ ] Multiple real users rank correctly by spend amount
- [ ] Leaderboard auto-refreshes every 10-15 seconds
- [ ] All three pages show consistent data (Home, Leaderboard, RewardsPlus)
- [ ] No fake/mock users appear in any scenario
- [ ] Error handling shows empty state (not mock data)
- [ ] Day/Week/Month filtering works correctly
- [ ] Podium only shows when 3+ users exist
- [ ] Empty state UI is user-friendly and actionable

---

## Known Behaviors (Expected)

✅ **These are correct**:
1. Empty leaderboard when no orders exist (not a bug)
2. 10-second delay before auto-refresh (by design)
3. Podium doesn't show if less than 3 users (correct)
4. "Pending" orders count immediately (live tracking)
5. Cancelled orders don't count (correct)

---

## If Tests Fail

### Problem: Still seeing fake users
**Solution**: 
1. Hard refresh browser: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
2. Clear browser cache completely
3. Check if INITIAL_LEADERBOARD is imported anywhere in the modified files

### Problem: Empty state not showing
**Solution**:
1. Check browser console for JavaScript errors
2. Verify backend is returning empty array: `GET http://localhost:5000/api/leaderboard?period=daily`
3. Check that conditional rendering is correct in component

### Problem: Auto-refresh not working
**Solution**:
1. Check browser console for network errors
2. Verify setInterval is not being cleared prematurely
3. Ensure useEffect cleanup function is correct

---

## Success Criteria

✅ Fix is successful if:
1. **Zero fake users** appear in any scenario
2. **Empty state UI** shows when no orders exist
3. **Real users** appear immediately after placing orders
4. **Live updates** work every 10-15 seconds
5. **All pages** show consistent leaderboard data
6. **No errors** in browser console or server logs

---

## Contact

If issues persist after following this guide:
1. Check `ALL_FIXES_SUMMARY.md` for complete technical details
2. Review server logs for backend errors
3. Check browser console for frontend errors
4. Verify all files were updated correctly

---

**Test completed by**: _____________  
**Date**: _____________  
**All tests passed**: ☐ Yes ☐ No  
**Notes**: _____________

---

**END OF TEST PLAN**
