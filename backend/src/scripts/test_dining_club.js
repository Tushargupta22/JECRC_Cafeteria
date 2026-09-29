import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from './seed.js';
import User from '../models/User.js';
import Food from '../models/Food.js';
import Subscription from '../models/Subscription.js';
import Order from '../models/Order.js';

let server = null;
let baseUrl = '';

const runTests = async () => {
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, detail = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  try {
    console.log('\n======================================================');
    console.log('🍽️ DINING CLUB MEMBERSHIP COMPREHENSIVE TEST SUITE');
    console.log('======================================================\n');

    await seedDatabase();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        console.log(`[Test Server] Live on ${baseUrl}\n`);
        resolve();
      });
    });

    const request = async (path, options = {}) => {
      const url = `${baseUrl}${path}`;
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    };

    // Create a dedicated ₹1 test food item to make exact subtotal testing easy
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@cafetarea.edu', password: 'Admin@12345' })
    });
    const adminToken = adminLogin.data.token;
    assert(!!adminToken, 'Admin logged in');

    const foodRes = await request('/foods', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Dining Club Test Token ${Date.now()}`,
        category: 'Quick Bites',
        station: 'Main Counter',
        price: 1,
        isAvailable: true,
        stockCount: 100000
      })
    });
    assert(foodRes.status === 201, 'Created ₹1 test food item for precise testing');
    const unitFoodId = foodRes.data.food._id;

    // Helper: register new student
    const registerStudent = async (name, email) => {
      const reg = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password: 'Password@123',
          confirmPassword: 'Password@123',
          department: 'B.Tech CS',
          year: 'Year 3'
        })
      });
      return reg.data.token;
    };

    const getActiveSub = async (userId) => {
      return Subscription.findOne({ userId, isActive: true }).sort({ createdAt: -1 });
    };

    // ====================================================
    // TEST SECTION 1: WEEKLY DINING CLUB (₹99)
    // ====================================================
    console.log('\n--- 1. Weekly Dining Club Plan (₹99) ---');
    const weeklyEmail = `weekly.student.${Date.now()}@jecrc.edu`;
    const weeklyToken = await registerStudent('Weekly Student', weeklyEmail);

    // Subscribe to Weekly
    const subWeekly = await request('/subscriptions/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${weeklyToken}` },
      body: JSON.stringify({ planType: 'weekly' })
    });
    assert(subWeekly.status === 201, 'Subscribed to Weekly Dining Club');
    assert(subWeekly.data.subscription.price === 99, 'Weekly plan price is ₹99');
    assert(subWeekly.data.subscription.discountAmount === 10, 'Weekly plan discount is flat ₹10');
    assert(subWeekly.data.subscription.minOrder === 31, 'Weekly min order is ₹31');
    assert(subWeekly.data.subscription.maxDiscountedOrders === 7, 'Weekly max discounted orders is 7');

    // 1a. Subtotal < ₹31 (₹30) -> ₹0 discount
    const order30 = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${weeklyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 30, price: 1 }]
      })
    });
    assert(order30.status === 201, 'Placed order with subtotal ₹30');
    assert(order30.data.order.subscriptionDiscount === 0, 'Subtotal ₹30 (< ₹31) gets ₹0 discount');
    assert(order30.data.order.total === 30, 'Total is ₹30');
    assert(order30.data.order.isEligibleOrder === false, 'Order below ₹31 is not an eligible order');

    // 1b. Subtotal = ₹31 -> flat ₹10 discount, total = ₹21
    const order31 = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${weeklyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 31, price: 1 }]
      })
    });
    assert(order31.status === 201, 'Placed order with subtotal ₹31');
    assert(order31.data.order.subscriptionDiscount === 10, 'Subtotal ₹31 gets exact ₹10 discount');
    assert(order31.data.order.total === 21, 'Final total is ₹21 (31 - 10)');
    assert(order31.data.order.isEligibleOrder === true, 'Order ₹31 is an eligible order');

    // Check user counters after order 31
    const weeklyUserCheck = await User.findOne({ email: weeklyEmail });
    assert(weeklyUserCheck.subscription.subscriptionUsageCount === 1, 'Subscription usage count incremented to 1');
    assert(weeklyUserCheck.subscription.eligibleOrderCount === 1, 'Eligible order count incremented to 1');
    assert(!!weeklyUserCheck.subscription.lastSubscriptionDiscountDate, 'lastSubscriptionDiscountDate recorded in IST');

    // 1c. 2nd order on SAME DAY with subtotal ₹100 -> ₹0 subscription discount (1-per-day rule)
    const order100SameDay = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${weeklyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 100, price: 1 }]
      })
    });
    assert(order100SameDay.status === 201, 'Placed 2nd order on same day with subtotal ₹100');
    assert(order100SameDay.data.order.subscriptionDiscount === 0, '2nd order same day gets ₹0 discount due to daily limit');
    assert(order100SameDay.data.order.total === 100, 'Total is full ₹100');
    assert(order100SameDay.data.order.isEligibleOrder === true, 'Eligible order count still qualifies (₹100 >= ₹31)');

    const weeklyUserCheck2 = await User.findOne({ email: weeklyEmail });
    assert(weeklyUserCheck2.subscription.subscriptionUsageCount === 1, 'Usage count remains 1 because discount was not applied');
    assert(weeklyUserCheck2.subscription.eligibleOrderCount === 2, 'Eligible order count incremented to 2 independently');

    // 1d. Max 7 discounted orders cap check
    // Simulate user has already used 7 discounted orders and reset date to yesterday
    await Subscription.findByIdAndUpdate(weeklyUserCheck.subscription.subscriptionId, {
      subscriptionUsageCount: 7,
      lastSubscriptionDiscountDate: '2026-09-20'
    });
    await User.findByIdAndUpdate(weeklyUserCheck._id, {
      'subscription.subscriptionUsageCount': 7,
      'subscription.lastSubscriptionDiscountDate': '2026-09-20'
    });

    const orderAfterCap = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${weeklyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 50, price: 1 }]
      })
    });
    assert(orderAfterCap.status === 201, 'Placed order after reaching 7 discounted orders');
    assert(orderAfterCap.data.order.subscriptionDiscount === 0, 'Discount is ₹0 because 7-use cap is reached');

    // ====================================================
    // TEST SECTION 2: MONTHLY DINING CLUB (₹199)
    // ====================================================
    console.log('\n--- 2. Monthly Dining Club Plan (₹199) ---');
    const monthlyEmail = `monthly.student.${Date.now()}@jecrc.edu`;
    const monthlyToken = await registerStudent('Monthly Student', monthlyEmail);

    const userBeforeSub = await User.findOne({ email: monthlyEmail });
    const ptsBefore = userBeforeSub.loyaltyPoints;

    // 2a. Subscribe & Joining Bonus (+10 pts)
    const subMonthly = await request('/subscriptions/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({ planType: 'monthly' })
    });
    assert(subMonthly.status === 201, 'Subscribed to Monthly Dining Club');
    assert(subMonthly.data.subscription.price === 199, 'Monthly plan price is ₹199');
    assert(subMonthly.data.subscription.discountPercentage === 15, 'Monthly discount percentage is 15%');
    assert(subMonthly.data.subscription.maxDiscountPerOrder === 20, 'Monthly max discount per order is ₹20');
    assert(subMonthly.data.subscription.minOrder === 41, 'Monthly min order is ₹41');
    assert(subMonthly.data.subscription.maxDiscountedOrders === 8, 'Monthly max discounted orders is 8');

    const userAfterSub = await User.findOne({ email: monthlyEmail });
    assert(userAfterSub.loyaltyPoints === ptsBefore + 10, 'Joining bonus: +10 Loyalty Points awarded upon subscription');
    assert(userAfterSub.subscription.loyaltyBonusAwarded === true, 'loyaltyBonusAwarded flag set to true');

    // 2b. Re-subscribe check (Idempotency: no double bonus)
    await request('/subscriptions/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({ planType: 'monthly' })
    });
    const userAfterReSub = await User.findOne({ email: monthlyEmail });
    assert(userAfterReSub.loyaltyPoints === ptsBefore + 10, 'Idempotency: Re-subscribing does NOT re-award +10 loyalty points');

    // 2c. Subtotal ₹40 (< ₹41) -> ₹0 discount
    const monthlyOrder40 = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 40, price: 1 }]
      })
    });
    assert(monthlyOrder40.data.order.subscriptionDiscount === 0, 'Subtotal ₹40 (< ₹41) gets ₹0 discount');

    // 2d. Exact mathematical discounts:
    let currentMonthlySub = await getActiveSub(userBeforeSub._id);

    // Subtotal ₹41 -> 15% = Math.round(41 * 0.15) = 6
    const monthlyOrder41 = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 41, price: 1 }]
      })
    });
    assert(monthlyOrder41.data.order.subscriptionDiscount === 6, 'Subtotal ₹41 gets exact ₹6 discount (15% rounded)');
    assert(monthlyOrder41.data.order.total === 35, 'Total is ₹35 (41 - 6)');

    // Reset date to yesterday to test ₹67 on new day
    currentMonthlySub = await getActiveSub(userBeforeSub._id);
    await Subscription.findByIdAndUpdate(currentMonthlySub._id, {
      lastSubscriptionDiscountDate: '2026-09-20'
    });

    // Subtotal ₹67 -> 15% = Math.round(67 * 0.15) = 10
    const monthlyOrder67 = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 67, price: 1 }]
      })
    });
    assert(monthlyOrder67.data.order.subscriptionDiscount === 10, 'Subtotal ₹67 gets exact ₹10 discount (15% rounded)');
    assert(monthlyOrder67.data.order.total === 57, 'Total is ₹57 (67 - 10)');

    // Reset date to yesterday to test ₹100
    await Subscription.findByIdAndUpdate(currentMonthlySub._id, {
      lastSubscriptionDiscountDate: '2026-09-20'
    });

    // Subtotal ₹100 -> 15% = 15
    const monthlyOrder100 = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 100, price: 1 }]
      })
    });
    assert(monthlyOrder100.data.order.subscriptionDiscount === 15, 'Subtotal ₹100 gets ₹15 discount');
    assert(monthlyOrder100.data.order.total === 85, 'Total is ₹85 (100 - 15)');

    // Reset date to yesterday to test ₹133
    await Subscription.findByIdAndUpdate(currentMonthlySub._id, {
      lastSubscriptionDiscountDate: '2026-09-20'
    });

    // Subtotal ₹133 -> 15% = Math.round(133 * 0.15) = 20
    const monthlyOrder133 = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 133, price: 1 }]
      })
    });
    assert(monthlyOrder133.data.order.subscriptionDiscount === 20, 'Subtotal ₹133 gets ₹20 discount');

    // Reset date to yesterday to test ₹200 (cap ₹20)
    await Subscription.findByIdAndUpdate(currentMonthlySub._id, {
      lastSubscriptionDiscountDate: '2026-09-20'
    });

    // Subtotal ₹200 -> 15% is ₹30, capped at ₹20
    const monthlyOrder200 = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 200, price: 1 }]
      })
    });
    assert(monthlyOrder200.data.order.subscriptionDiscount === 20, 'Subtotal ₹200 is capped at max ₹20 discount');

    // 2e. 8 Discounted Orders Cap
    await Subscription.findByIdAndUpdate(currentMonthlySub._id, {
      subscriptionUsageCount: 8,
      lastSubscriptionDiscountDate: '2026-09-20'
    });
    await User.findByIdAndUpdate(userAfterSub._id, {
      'subscription.subscriptionUsageCount': 8,
      'subscription.lastSubscriptionDiscountDate': '2026-09-20'
    });

    const monthlyOrderCap = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 50, price: 1 }]
      })
    });
    assert(monthlyOrderCap.data.order.subscriptionDiscount === 0, 'Monthly 8-use cap enforced: 9th order gets ₹0 subscription discount');

    // 2f. Milestone Bonus Coupon 15th Order (₹10 coupon)
    // Set eligibleOrderCount to 14, place 15th eligible order
    await Subscription.findByIdAndUpdate(currentMonthlySub._id, {
      eligibleOrderCount: 14
    });
    await User.findByIdAndUpdate(userAfterSub._id, {
      'subscription.eligibleOrderCount': 14
    });

    const order15th = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 50, price: 1 }]
      })
    });
    assert(order15th.data.order.milestoneDiscount === 10, '15th eligible order triggers ₹10 milestone bonus coupon');
    assert(order15th.data.order.milestoneOrder === 15, 'milestoneOrder recorded as 15');
    assert(order15th.data.order.total === 40, 'Total reduced by milestone discount (50 - 10 = 40)');

    // Check milestonesAwarded in subscription
    const monthlySubCheck = await Subscription.findById(currentMonthlySub._id);
    assert(monthlySubCheck.milestonesAwarded.includes(15), 'Subscription milestonesAwarded includes 15');
    assert(monthlySubCheck.eligibleOrderCount === 15, 'Eligible order count is now 15');

    // 2g. 1.5x Loyalty Multiplier after completing 15th order
    // Order placed after 15th eligible order completed gets 1.5x points
    const orderForLoyalty = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 100, price: 1 }]
      })
    });
    // Mark order as Completed to award loyalty
    const userPtsBeforeOrder = (await User.findById(userAfterSub._id)).loyaltyPoints;
    await request(`/orders/${orderForLoyalty.data.order._id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Completed' })
    });
    const userPtsAfterOrder = (await User.findById(userAfterSub._id)).loyaltyPoints;
    const ptsGained = userPtsAfterOrder - userPtsBeforeOrder;
    // Order total is ₹100. Standard loyalty is 10 pts. With 1.5x multiplier = Math.round(10 * 1.5) = 15 pts.
    assert(ptsGained === 15, `1.5x Loyalty Multiplier applied: gained ${ptsGained} pts for ₹100 order (expected 15)`);

    // 2h. Milestone Bonus Coupon 24th Order (₹10 coupon)
    await Subscription.findByIdAndUpdate(currentMonthlySub._id, {
      eligibleOrderCount: 23
    });
    await User.findByIdAndUpdate(userAfterSub._id, {
      'subscription.eligibleOrderCount': 23
    });

    const order24th = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${monthlyToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 50, price: 1 }]
      })
    });
    assert(order24th.data.order.milestoneDiscount === 10, '24th eligible order triggers ₹10 milestone bonus coupon');
    assert(order24th.data.order.milestoneOrder === 24, 'milestoneOrder recorded as 24');

    // ====================================================
    // TEST SECTION 3: 3-MONTH DINING CLUB (₹499)
    // ====================================================
    console.log('\n--- 3. 3-Month Dining Club Plan (₹499) ---');
    const threeMonthEmail = `quarterly.student.${Date.now()}@jecrc.edu`;
    const threeMonthToken = await registerStudent('3-Month Student', threeMonthEmail);

    const sub3Month = await request('/subscriptions/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${threeMonthToken}` },
      body: JSON.stringify({ planType: '3-month' })
    });
    assert(sub3Month.status === 201, 'Subscribed to 3-Month Dining Club');
    assert(sub3Month.data.subscription.price === 499, '3-Month plan price is ₹499');
    assert(sub3Month.data.subscription.maxDiscountedOrders === 20, '3-Month max discounted orders is 20');
    assert(sub3Month.data.subscription.minOrder === 41, '3-Month min order is ₹41');

    const user3M = await User.findOne({ email: threeMonthEmail });
    assert(user3M.subscription.loyaltyBonusAwarded === true, '3-Month joining bonus awarded');

    // Test 3-Month Milestones: 25th (₹5), 28th (₹5), 35th (₹10), 40th (₹8)
    const testMilestone = async (targetOrder, expectedDiscount) => {
      await Subscription.findByIdAndUpdate(user3M.subscription.subscriptionId, {
        eligibleOrderCount: targetOrder - 1
      });
      await User.findByIdAndUpdate(user3M._id, {
        'subscription.eligibleOrderCount': targetOrder - 1
      });

      const res = await request('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${threeMonthToken}` },
        body: JSON.stringify({
          items: [{ foodId: unitFoodId, quantity: 50, price: 1 }]
        })
      });
      assert(
        res.data.order.milestoneDiscount === expectedDiscount,
        `3-Month Plan: ${targetOrder}th eligible order triggers ₹${expectedDiscount} milestone coupon`
      );
      assert(res.data.order.milestoneOrder === targetOrder, `milestoneOrder is ${targetOrder}`);
    };

    await testMilestone(25, 5);
    await testMilestone(28, 5);
    await testMilestone(35, 10);
    await testMilestone(40, 8);

    // 3b. 1.5x Loyalty Multiplier unlocked after 21st eligible order for 3-Month
    await Subscription.findByIdAndUpdate(user3M.subscription.subscriptionId, {
      eligibleOrderCount: 22
    });
    await User.findByIdAndUpdate(user3M._id, {
      'subscription.eligibleOrderCount': 22
    });

    const orderLoyalty3M = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${threeMonthToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 100, price: 1 }]
      })
    });
    const ptsBefore3M = (await User.findById(user3M._id)).loyaltyPoints;
    await request(`/orders/${orderLoyalty3M.data.order._id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Completed' })
    });
    const ptsAfter3M = (await User.findById(user3M._id)).loyaltyPoints;
    const ptsGained3M = ptsAfter3M - ptsBefore3M;
    assert(ptsGained3M === 15, `3-Month Plan: 1.5x Loyalty Multiplier applied after 21st order (gained ${ptsGained3M} pts for ₹100 order)`);

    // ====================================================
    // TEST SECTION 4: ORDER CANCELLATION COUNTER ROLLBACK
    // ====================================================
    console.log('\n--- 4. Order Cancellation Counter Rollback ---');
    const rollbackEmail = `rollback.student.${Date.now()}@jecrc.edu`;
    const rollbackToken = await registerStudent('Rollback Student', rollbackEmail);

    await request('/subscriptions/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rollbackToken}` },
      body: JSON.stringify({ planType: 'weekly' })
    });

    // Place an order that uses subscription discount
    const orderToCancel = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rollbackToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 50, price: 1 }]
      })
    });
    assert(orderToCancel.data.order.subscriptionDiscount === 10, 'Placed order with ₹10 subscription discount');

    const userBeforeCancel = await User.findOne({ email: rollbackEmail });
    assert(userBeforeCancel.subscription.subscriptionUsageCount === 1, 'subscriptionUsageCount is 1 before cancel');
    assert(userBeforeCancel.subscription.eligibleOrderCount === 1, 'eligibleOrderCount is 1 before cancel');
    assert(!!userBeforeCancel.subscription.lastSubscriptionDiscountDate, 'lastSubscriptionDiscountDate set before cancel');

    // Cancel the order
    const cancelRes = await request(`/orders/${orderToCancel.data.order._id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Cancelled' })
    });
    assert(cancelRes.status === 200, 'Order successfully cancelled');

    const userAfterCancel = await User.findOne({ email: rollbackEmail });
    assert(userAfterCancel.subscription.subscriptionUsageCount === 0, 'subscriptionUsageCount rolled back to 0');
    assert(userAfterCancel.subscription.eligibleOrderCount === 0, 'eligibleOrderCount rolled back to 0');
    assert(userAfterCancel.subscription.lastSubscriptionDiscountDate === null, 'lastSubscriptionDiscountDate reset to null');

    // Verify user can now place another discounted order today
    const reOrderToday = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rollbackToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 50, price: 1 }]
      })
    });
    assert(reOrderToday.data.order.subscriptionDiscount === 10, 'User successfully received discount on new order after cancellation');

    // ====================================================
    // TEST SECTION 5: SECURITY & NON-MEMBER VALIDATION
    // ====================================================
    console.log('\n--- 5. Security & Non-Member Validation ---');
    const regularEmail = `regular.student.${Date.now()}@jecrc.edu`;
    const regularToken = await registerStudent('Regular Student', regularEmail);

    // Non-member tries to send fake discount
    const nonMemberOrder = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${regularToken}` },
      body: JSON.stringify({
        items: [{ foodId: unitFoodId, quantity: 50, price: 1 }],
        subscriptionDiscount: 10 // Tampered payload from client
      })
    });
    assert(nonMemberOrder.data.order.subscriptionDiscount === 0, 'Server recalculates and rejects client-tampered subscription discount');
    assert(nonMemberOrder.data.order.total === 50, 'Total is full ₹50');

    // Legacy plan alias support in subscribe endpoint
    const legacyEmail = `legacy.student.${Date.now()}@jecrc.edu`;
    const legacyToken = await registerStudent('Legacy Student', legacyEmail);
    const legacySub = await request('/subscriptions/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${legacyToken}` },
      body: JSON.stringify({ planType: 'Semester Unlimited' })
    });
    assert(legacySub.status === 201, 'Legacy alias "Semester Unlimited" successfully maps to 3-Month Dining Club');
    assert(legacySub.data.subscription.plan === '3-Month Dining Club', 'Plan name resolved to 3-Month Dining Club');

    console.log('\n======================================================');
    console.log(`🏁 DINING CLUB TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Dining Club Test Runner Error:', err);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  }
};

runTests();
