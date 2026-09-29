import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Owner Portal & Promotions Test Suite...');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      testsFailed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assert(health.status === 'healthy', 'Backend health check returns healthy');

    // 2. Owner Login with default credentials
    console.log('\n--- Testing Owner Authentication ---');
    const loginRes = await fetch(`${BASE_URL}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'TTBrothers' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Default Owner login succeeds with 200 OK');
    assert(loginData.token, 'Owner login returns JWT token');
    assert(loginData.mustChangePassword === true, 'First login indicates mustChangePassword is true');
    assert(loginData.owner.role === 'owner', 'Owner role is correctly set to "owner"');

    const ownerToken = loginData.token;

    // 3. Test Student cannot access Owner routes
    // Register a student
    const studentRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: `teststudent_${Date.now()}@jecrc.edu`,
        password: 'Password123'
      })
    });
    const studentData = await studentRegRes.json();
    const studentToken = studentData.token;

    const studentForbiddenRes = await fetch(`${BASE_URL}/owner/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentForbiddenRes.status === 403, 'Student token cannot access Owner dashboard (403 Forbidden)');

    // 4. Test Owner can access Owner Dashboard Stats
    console.log('\n--- Testing Owner Dashboard Stats ---');
    const statsRes = await fetch(`${BASE_URL}/owner/dashboard`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, 'Owner dashboard stats returned successfully');
    assert(typeof statsData.stats.totalActiveDeals === 'number', 'Stats includes numeric totalActiveDeals');
    assert(typeof statsData.stats.totalActiveCoupons === 'number', 'Stats includes numeric totalActiveCoupons');

    // 5. Test Deals CRUD & Price Validation
    console.log('\n--- Testing Deals Management ---');
    // Test price validation: discounted price >= original price should fail
    const invalidDealRes = await fetch(`${BASE_URL}/owner/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        title: 'Invalid Deal',
        originalPrice: 100,
        discountedPrice: 120, // Invalid!
        expiryDate: new Date(Date.now() + 86400000).toISOString()
      })
    });
    assert(invalidDealRes.status === 400, 'Deal creation with discountedPrice >= originalPrice is rejected');

    // Create a valid deal
    const createDealRes = await fetch(`${BASE_URL}/owner/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        title: 'Super Loaded Burger Feast',
        description: 'Crispy patty loaded with cheddar and fresh lettuce',
        originalPrice: 120,
        discountedPrice: 84, // 30% off
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        isActive: true,
        showInHighlights: true,
        availableFor: 'both'
      })
    });
    const dealData = await createDealRes.json();
    assert(createDealRes.status === 201, 'Valid deal created successfully with 201');
    assert(dealData.deal.discountPercentage === 30, 'Discount percentage automatically calculated as 30%');
    assert(dealData.deal.showInHighlights === true, 'showInHighlights is true');
    const createdDealId = dealData.deal._id;

    // 6. Test Image Upload
    console.log('\n--- Testing Promo Image Upload ---');
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await fetch(`${BASE_URL}/owner/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({ imageBase64: sampleBase64 })
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 200, 'Image upload succeeds with 200 OK');
    assert(uploadData.imageUrl && uploadData.imageUrl.startsWith('/uploads/'), 'Image URL points to /uploads/...');

    // 7. Test Today\'s Highlights Public API
    console.log('\n--- Testing Today Highlights Public API ---');
    const highlightsRes = await fetch(`${BASE_URL}/deals/todays-highlights`);
    const highlightsData = await highlightsRes.json();
    assert(highlightsRes.status === 200, 'Public Today Highlights endpoint returns 200');
    assert(highlightsData.deals.some(d => d._id === createdDealId), 'Created deal appears in Today Highlights');
    assert(highlightsData.settings, 'Today Highlights returns appearance settings');

    // 8. Test Coupon Creation & Validation
    console.log('\n--- Testing Coupon Management ---');
    const testCode = `PROMO${Math.floor(Math.random() * 8999 + 1000)}`;
    const createCouponRes = await fetch(`${BASE_URL}/owner/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        couponName: 'Campus Special Discount',
        couponCode: testCode,
        description: 'Flat 20% off on all items above 100',
        discountType: 'percentage',
        discountValue: 20,
        minimumOrderValue: 100,
        maxDiscount: 50,
        totalUsageLimit: 100,
        perUserUsageLimit: 2,
        expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        availableFor: 'both',
        isActive: true
      })
    });
    const couponData = await createCouponRes.json();
    assert(createCouponRes.status === 201, 'Coupon created successfully with 201');
    assert(couponData.coupon.couponCode === testCode, 'Coupon code stored in uppercase');

    // 9. Test Coupon Validation in Cart/Order Flow
    const validateCouponRes = await fetch(`${BASE_URL}/offers/validate-coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        couponCode: testCode,
        subtotal: 200
      })
    });
    const validatedData = await validateCouponRes.json();
    assert(validateCouponRes.status === 200, 'Student can validate active coupon');
    assert(validatedData.discountAmount === 40, '20% of 200 calculated as ₹40 discount');

    // Test maxDiscount capping: 20% of 300 is 60, capped at maxDiscount 50
    const cappedValidationRes = await fetch(`${BASE_URL}/offers/validate-coupon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        couponCode: testCode,
        subtotal: 300
      })
    });
    const cappedData = await cappedValidationRes.json();
    assert(cappedData.discountAmount === 50, 'Discount correctly capped at maxDiscount ₹50');

    // 10. Test Rewards & Perks Management
    console.log('\n--- Testing Rewards & Perks Management ---');
    const createRewardRes = await fetch(`${BASE_URL}/owner/rewards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        title: 'Free Cold Coffee',
        description: 'Chilled rich espresso cold coffee with chocolate drizzle',
        offerText: 'Free Cold Coffee on orders above ₹100',
        rewardType: 'free_item',
        pointsCost: 50,
        eligibility: 'All students',
        availableFor: 'both',
        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        isActive: true
      })
    });
    const rewardData = await createRewardRes.json();
    assert(createRewardRes.status === 201, 'Reward / Perk created successfully with 201');
    assert(rewardData.reward.pointsCost === 50, 'Points cost saved correctly');

    // Test Public Rewards API
    const publicRewardsRes = await fetch(`${BASE_URL}/rewards/active`);
    const publicRewardsData = await publicRewardsRes.json();
    assert(publicRewardsRes.status === 200, 'Public rewards endpoint returns 200');
    assert(publicRewardsData.rewards.some(r => r._id === rewardData.reward._id), 'Created reward appears in public rewards catalog');

    // 11. Test Highlight Appearance Settings
    console.log('\n--- Testing Highlight Appearance Settings ---');
    const updateSettingsRes = await fetch(`${BASE_URL}/owner/highlights/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        overlayIntensity: 'dark',
        heading: "Chef's Handpicked Highlights",
        subtitle: "Fresh daily selections directly from the cafeteria kitchen",
        badgeText: "HOT DEAL"
      })
    });
    const settingsData = await updateSettingsRes.json();
    assert(updateSettingsRes.status === 200, 'Highlight settings updated successfully');
    assert(settingsData.settings.overlayIntensity === 'dark', 'Overlay intensity updated to "dark"');
    assert(settingsData.settings.badgeText === 'HOT DEAL', 'Badge text updated to "HOT DEAL"');

    // 12. Mandatory First-Login Password Change
    console.log('\n--- Testing Owner Password Change ---');
    const changePassRes = await fetch(`${BASE_URL}/owner/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        currentPassword: 'TTBrothers',
        newPassword: 'OwnerSecret2026!',
        confirmNewPassword: 'OwnerSecret2026!'
      })
    });
    const changePassData = await changePassRes.json();
    assert(changePassRes.status === 200, 'Password changed successfully');

    // Verify old password no longer works
    const oldLoginRes = await fetch(`${BASE_URL}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'TTBrothers' })
    });
    assert(oldLoginRes.status === 401, 'Old default password rejected after change');

    // Verify new password works and mustChangePassword is now false
    const newLoginRes = await fetch(`${BASE_URL}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'OwnerSecret2026!' })
    });
    const newLoginData = await newLoginRes.json();
    assert(newLoginRes.status === 200, 'New password login succeeds with 200 OK');
    assert(newLoginData.mustChangePassword === false, 'mustChangePassword is now false');

    console.log(`\n========================================`);
    console.log(`🏁 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log(`========================================\n`);

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Test suite execution error:', err);
    process.exit(1);
  }
}

runTests();
