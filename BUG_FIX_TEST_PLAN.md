# Bug Fix Test Plan

## Overview
This document outlines the test plan for two critical bug fixes:
1. ETA Timer stopping when order becomes Ready/Completed
2. Independent Dining Club membership renewals

---

## Bug Fix #1: ETA Timer Must Stop When Order Status Changes

### What Was Fixed
- **File**: `src/context/OrderContext.tsx`
- **Change**: Updated ETA countdown effect to stop when `order.status === 'ready'` or `order.status === 'completed'`
- **Previous Behavior**: Timer continued until original ETA expired, even after admin marked order ready
- **New Behavior**: Timer stops immediately when backend order status becomes Ready or Completed

### Test Cases

#### Test 1.1: ETA Stops on Ready Status
1. **Setup**: Place an order as a student (8 minute ETA by default)
2. **Action**: Admin changes order status to "Ready" after 2 minutes
3. **Expected**: 
   - Student frontend immediately stops countdown
   - No negative time displayed
   - ETA section shows Ready state
4. **Verify**: Order status polling (every 3 seconds) picks up the change

#### Test 1.2: ETA Stops on Completed Status
1. **Setup**: Order in "Ready" status with stopped timer
2. **Action**: Admin marks order as "Completed"
3. **Expected**: 
   - Timer remains stopped
   - Order moves to completed state in UI
   - Loyalty points credited to student

#### Test 1.3: Normal ETA Countdown (No Early Completion)
1. **Setup**: Place an order
2. **Action**: Let order progress naturally (Pending → Preparing → Ready after 8 minutes)
3. **Expected**: 
   - Timer counts down normally
   - Timer reaches zero naturally
   - "Ready at Counter" message appears

#### Test 1.4: Order Status Polling Works
1. **Setup**: Order is in Preparing state
2. **Action**: Keep student page open, admin changes to Ready
3. **Expected**: 
   - Within 3 seconds, student sees status update
   - Timer stops automatically
   - No page refresh needed

---

## Bug Fix #2: Independent Dining Club Membership Renewals

### What Was Fixed
- **Files**: 
  - `backend/src/models/Subscription.js` - Added `planType` field
  - `backend/src/controllers/subscriptionController.js` - Updated subscription logic
- **Change**: Each plan type (weekly/monthly/semester) now has independent subscription records
- **Previous Behavior**: Renewing one plan would deactivate all three plans
- **New Behavior**: Each plan renews independently

### Database Schema Changes
```javascript
// Added fields to Subscription model:
{
  planType: { 
    type: String, 
    enum: ['weekly', 'monthly', 'semester'] 
  }
}
```

### Test Cases

#### Test 2.1: Renew Weekly Plan Only
1. **Setup**: 
   - Weekly: Expired
   - Monthly: Active
   - Semester: Expired
2. **Action**: Click "Renew" on Weekly Snack Pass
3. **Expected**: 
   - Weekly: Renewed (new end date 7 days from now)
   - Monthly: Still active (unchanged)
   - Semester: Still expired (unchanged)
4. **Verify**: Check database that only weekly subscription is updated

#### Test 2.2: Renew Monthly Plan Only
1. **Setup**: 
   - Weekly: Active
   - Monthly: Expired
   - Semester: Active
2. **Action**: Click "Renew" on Monthly Plus Membership
3. **Expected**: 
   - Weekly: Still active (unchanged)
   - Monthly: Renewed (new end date 30 days from now)
   - Semester: Still active (unchanged)

#### Test 2.3: Renew Semester Plan Only
1. **Setup**: 
   - All three plans expired
2. **Action**: Click "Join Plus" on Semester Unlimited
3. **Expected**: 
   - Weekly: Still expired
   - Monthly: Still expired
   - Semester: Newly active (120 days)

#### Test 2.4: Multiple Active Subscriptions - Best Discount Applied
1. **Setup**: 
   - Weekly active (10% discount)
   - Monthly active (15% discount)
2. **Action**: Place an order
3. **Expected**: 
   - Order uses 15% discount (highest available)
   - User model shows Monthly as primary subscription

#### Test 2.5: Subscription Expiration Handling
1. **Setup**: 
   - Weekly expires today
   - Monthly expires in 10 days
2. **Action**: Wait for weekly to expire, then place order
3. **Expected**: 
   - Weekly automatically deactivated
   - Monthly still applies 15% discount
   - Frontend shows only Monthly as active

#### Test 2.6: Independent Plan Display in UI
1. **Setup**: User has no subscriptions
2. **Action**: Navigate to Rewards Plus page
3. **Expected**: 
   - Three separate plan cards displayed
   - Each has independent "Join Plus" or "Renew" button
   - Clicking one button only affects that plan

---

## Migration Required

### Run Before Testing
```bash
cd backend
npm run migrate:subscriptions
```

This adds `planType` field to existing subscription records.

---

## Backend Testing

### API Endpoints to Test

#### Subscribe to Specific Plan
```bash
POST /api/subscriptions/subscribe
Headers: Authorization: Bearer <token>
Body: {
  "plan": "weekly-snack-pass"
}
```

#### Get Current Subscriptions
```bash
GET /api/subscriptions/current
Headers: Authorization: Bearer <token>

Response should include:
{
  "subscription": { ... }, // Best active subscription
  "subscriptionsByType": {
    "weekly": { isActive: true/false, ... },
    "monthly": { isActive: true/false, ... },
    "semester": { isActive: true/false, ... }
  }
}
```

#### Update Order Status
```bash
PUT /api/orders/:orderId/status
Headers: Authorization: Bearer <admin-token>
Body: {
  "status": "Ready"
}
```

---

## Frontend Testing

### Visual Verification

#### Track Order Page
- [ ] ETA countdown visible when order is Pending/Preparing
- [ ] ETA stops when status becomes Ready
- [ ] ETA section shows appropriate message when Ready
- [ ] No negative countdown displayed
- [ ] 4-stage timeline updates correctly

#### Rewards Plus Page
- [ ] Three distinct membership plan cards
- [ ] Each plan shows independent status
- [ ] Renewing one plan doesn't affect others
- [ ] Active plans display correct expiry dates
- [ ] Multiple active subscriptions show highest discount

---

## Regression Testing

### Ensure No Breaking Changes

1. **Order Creation**: Orders still create successfully
2. **Payment Processing**: Payment methods work correctly
3. **Loyalty Points**: Points still awarded on completion
4. **User Authentication**: Login/register unchanged
5. **Admin Dashboard**: Order management still functional
6. **Leaderboard**: Calculations still correct

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Run migration: `npm run migrate:subscriptions`
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 5173
- [ ] MongoDB connected
- [ ] Test user accounts created (student + admin)

### Bug #1 Tests (ETA Timer)
- [ ] Test 1.1: ETA stops on Ready
- [ ] Test 1.2: ETA stops on Completed
- [ ] Test 1.3: Normal countdown works
- [ ] Test 1.4: Polling updates status

### Bug #2 Tests (Subscriptions)
- [ ] Test 2.1: Weekly renewal only
- [ ] Test 2.2: Monthly renewal only
- [ ] Test 2.3: Semester renewal only
- [ ] Test 2.4: Best discount applied
- [ ] Test 2.5: Expiration handling
- [ ] Test 2.6: UI displays correctly

### Regression Tests
- [ ] Order creation
- [ ] Payment processing
- [ ] Loyalty points
- [ ] Authentication
- [ ] Admin functions
- [ ] Leaderboard

---

## Known Issues to Watch

1. **Browser Caching**: Clear browser cache if order status doesn't update
2. **Polling Delay**: Status updates have 3-second delay (by design)
3. **Multiple Tabs**: Having multiple tabs open may cause sync issues
4. **Database Migration**: Must run migration before testing subscriptions

---

## Success Criteria

### Bug #1 Success
✅ ETA timer stops within 3 seconds of admin marking order Ready
✅ No negative countdown ever displayed
✅ Timer behavior consistent across page refreshes

### Bug #2 Success
✅ Each plan type renews independently
✅ Renewing Weekly doesn't affect Monthly or Semester
✅ Multiple active subscriptions work correctly
✅ Best discount automatically applied to orders
✅ Expired subscriptions deactivate without affecting others

---

## Rollback Plan

If issues are found:
1. Revert `src/context/OrderContext.tsx` to previous version
2. Revert backend subscription files
3. Run database rollback if needed
4. Report issues with detailed logs
