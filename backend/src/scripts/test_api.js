import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from './seed.js';

let server = null;
let baseUrl = '';

const runTests = async () => {
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    console.log('\n======================================================');
    console.log('🧪 RUNNING COMPLETE BACKEND API INTEGRATION TEST SUITE');
    console.log('======================================================\n');

    // 1. Initialize DB and Seed
    await seedDatabase();

    // 2. Start HTTP server on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        console.log(`[Test Server] Live on ${baseUrl}\n`);
        resolve();
      });
    });

    // Helper for JSON requests
    const request = async (path, options = {}) => {
      const url = `${baseUrl}${path}`;
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    };

    // ----------------------------------------------------
    // TEST SECTION 1: HEALTH CHECK
    // ----------------------------------------------------
    console.log('--- 1. System Health ---');
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'GET /api/health responds with healthy');

    // ----------------------------------------------------
    // TEST SECTION 2: AUTHENTICATION & REGISTRATION
    // ----------------------------------------------------
    console.log('\n--- 2. Authentication & Validation ---');
    const newStudentEmail = `test.student.${Date.now()}@jecrc.edu`;

    // 2a. Register new user
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Integration Test Student',
        email: newStudentEmail,
        password: 'Password@123',
        confirmPassword: 'Password@123',
        department: 'B.Tech IT',
        year: 'Year 2'
      })
    });
    assert(regRes.status === 201 && regRes.data.token, 'POST /api/auth/register registers user and returns JWT');
    assert(!regRes.data.user.passwordHash, 'User object strictly excludes passwordHash');

    // 2b. Duplicate registration error (409 Conflict)
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Student',
        email: newStudentEmail,
        password: 'Password@123',
        confirmPassword: 'Password@123'
      })
    });
    assert(dupRes.status === 409, 'Duplicate email registration returns 409 Conflict');

    // 2c. Login valid
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: newStudentEmail,
        password: 'Password@123'
      })
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'POST /api/auth/login validates credentials and issues token');
    const studentToken = loginRes.data.token;

    // 2d. Login invalid password (401)
    const badLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: newStudentEmail,
        password: 'WrongPassword'
      })
    });
    assert(badLoginRes.status === 401, 'Invalid password returns 401 Unauthorized');

    // 2e. GET /api/auth/me
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(meRes.status === 200 && meRes.data.user.email === newStudentEmail, 'GET /api/auth/me retrieves authenticated user profile');

    // 2f. Admin Login
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@cafetarea.edu',
        password: 'Admin@12345'
      })
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.user.role === 'admin', 'Admin login successful with admin role');
    const adminToken = adminLoginRes.data.token;

    // ----------------------------------------------------
    // TEST SECTION 3: ROLE-BASED AUTHORIZATION GUARDS
    // ----------------------------------------------------
    console.log('\n--- 3. Role-Based Access Control (RBAC) ---');
    // 3a. Regular student accessing admin route -> 403 Forbidden
    const unauthAdminRes = await request('/admin/analytics', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(unauthAdminRes.status === 403, 'Regular student blocked with 403 Forbidden on /api/admin/analytics');

    // 3b. Missing token -> 401 Unauthorized
    const noTokenRes = await request('/admin/analytics');
    assert(noTokenRes.status === 401, 'Unauthenticated request blocked with 401 Unauthorized');

    // 3c. Admin accessing admin route -> 200 OK
    const authAdminRes = await request('/admin/analytics', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(authAdminRes.status === 200 && authAdminRes.data.analytics, 'Admin access granted to /api/admin/analytics');

    // ----------------------------------------------------
    // TEST SECTION 4: FOOD CRUD & SEARCH
    // ----------------------------------------------------
    console.log('\n--- 4. Food APIs (Public & Admin Protected) ---');
    // 4a. Get all foods
    const foodsRes = await request('/foods');
    assert(foodsRes.status === 200 && foodsRes.data.foods.length >= 15, 'GET /api/foods returns at least 15 seeded menu items');
    const sampleFood = foodsRes.data.foods[0];

    // 4b. Filter by category
    const catRes = await request('/foods?category=Cold Beverages');
    assert(
      catRes.status === 200 && catRes.data.foods.every(f => f.category === 'Cold Beverages'),
      'GET /api/foods?category=Cold Beverages filters accurately'
    );

    // 4c. Search query
    const searchRes = await request('/foods?search=Burger');
    assert(
      searchRes.status === 200 && searchRes.data.foods.some(f => f.name.toLowerCase().includes('burger')),
      'GET /api/foods?search=Burger searches food title/description'
    );

    // 4d. Admin Create Food
    const createFoodRes = await request('/foods', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Special Avocado Toast',
        category: 'Breakfast',
        price: 95,
        description: 'Sourdough toast with smashed hass avocado, chili flakes, and extra virgin olive oil',
        station: 'Bakery & Deli',
        calories: 220
      })
    });
    assert(createFoodRes.status === 201 && createFoodRes.data.food.name === 'Special Avocado Toast', 'Admin creates food item (POST /api/foods)');
    const createdFoodId = createFoodRes.data.food._id;

    // 4e. Admin Update Food
    const updateFoodRes = await request(`/foods/${createdFoodId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ price: 105 })
    });
    assert(updateFoodRes.status === 200 && updateFoodRes.data.food.price === 105, 'Admin updates food item price (PUT /api/foods/:id)');

    // 4f. Admin Delete Food
    const deleteFoodRes = await request(`/foods/${createdFoodId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteFoodRes.status === 200, 'Admin deletes food item (DELETE /api/foods/:id)');

    // ----------------------------------------------------
    // TEST SECTION 5: ORDERS & SERVER PRICE INTEGRITY
    // ----------------------------------------------------
    console.log('\n--- 5. Order Management & Server-Side Pricing ---');
    // Place order with tampered frontend price (e.g. attempting ₹1 instead of real price)
    const foodItem1 = foodsRes.data.foods[0]; // Real price: e.g. 80
    const foodItem2 = foodsRes.data.foods[1]; // Real price: e.g. 60

    const orderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        items: [
          { foodId: foodItem1._id, quantity: 2, price: 1 }, // Attempted fake price
          { foodId: foodItem2._id, quantity: 1, price: 1 }
        ],
        couponCode: 'JECRC50'
      })
    });

    assert(orderRes.status === 201, 'Order created successfully (POST /api/orders)');
    const orderData = orderRes.data.order;
    const expectedSubtotal = foodItem1.price * 2 + foodItem2.price * 1;
    assert(orderData.subtotal === expectedSubtotal, `Server ignored fake frontend price and fetched true price: Subtotal = ₹${expectedSubtotal}`);
    assert(orderData.offerDiscount === 50, 'Applied ₹50 flat coupon discount (JECRC50)');
    assert(orderData.total === expectedSubtotal - 50, `Calculated correct final total: ₹${expectedSubtotal - 50}`);

    // ----------------------------------------------------
    // TEST SECTION 6: LOYALTY POINTS & IDEMPOTENCY
    // ----------------------------------------------------
    console.log('\n--- 6. Loyalty Points Award & Idempotency Guarantee ---');
    // Get student profile points before completion
    const beforeMe = await request('/auth/me', { headers: { Authorization: `Bearer ${studentToken}` } });
    const pointsBefore = beforeMe.data.user.loyaltyPoints || 0;

    // Admin updates order status to 'Completed'
    const completeRes = await request(`/orders/${orderData._id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Completed' })
    });
    assert(completeRes.status === 200, 'Order status updated to "Completed"');
    assert(completeRes.data.loyalty.awarded === true, 'Loyalty points awarded on order completion');

    const expectedPoints = Math.floor(orderData.total / 10);
    assert(completeRes.data.loyalty.points === expectedPoints, `Correct ₹10 = 1 pt rule applied: awarded ${expectedPoints} pts`);

    // Verify user profile points increased
    const afterMe = await request('/auth/me', { headers: { Authorization: `Bearer ${studentToken}` } });
    assert(afterMe.data.user.loyaltyPoints === pointsBefore + expectedPoints, 'Student profile loyaltyPoints updated in database');

    // IDEMPOTENCY CHECK: Send status 'Completed' again -> Points MUST NOT be awarded a second time!
    const repeatCompleteRes = await request(`/orders/${orderData._id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Completed' })
    });
    assert(
      repeatCompleteRes.data.loyalty.awarded === false,
      'IDEMPOTENCY GUARANTEE: Repeating Completed status did NOT double-award loyalty points'
    );

    // ----------------------------------------------------
    // TEST SECTION 7: SUBSCRIPTIONS & EXPIRATION
    // ----------------------------------------------------
    console.log('\n--- 7. Subscription Membership & Expiry Rules ---');
    const plansRes = await request('/subscriptions/plans');
    assert(plansRes.status === 200 && plansRes.data.plans.length === 3, 'GET /api/subscriptions/plans returns 3 membership tiers');

    // Subscribe to Weekly Snack Pass
    const subRes = await request('/subscriptions/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ planName: 'Weekly Snack Pass' })
    });
    assert(subRes.status === 201 && subRes.data.subscription.isActive === true, 'POST /api/subscriptions/subscribe activates membership');

    // Get current subscription
    const currentSubRes = await request('/subscriptions/current', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(currentSubRes.status === 200 && currentSubRes.data.isActive === true, 'GET /api/subscriptions/current confirms active status');

    // Cancel subscription
    const cancelSubRes = await request('/subscriptions/cancel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(cancelSubRes.status === 200, 'POST /api/subscriptions/cancel cancels membership');

    // ----------------------------------------------------
    // TEST SECTION 8: PERSONALIZED OFFERS
    // ----------------------------------------------------
    console.log('\n--- 8. Personalized Offers Engine ---');
    const personalizedRes = await request('/offers/personalized', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(personalizedRes.status === 200 && Array.isArray(personalizedRes.data.offers), 'GET /api/offers/personalized returns targeted offers');
    assert(personalizedRes.data.userStats, 'Personalized payload includes user order statistics');

    // ----------------------------------------------------
    // TEST SECTION 9: LEADERBOARD CALCULATIONS
    // ----------------------------------------------------
    console.log('\n--- 9. Dynamic Leaderboards (Daily, Weekly, Monthly) ---');
    const dailyBoard = await request('/leaderboard?period=daily');
    assert(dailyBoard.status === 200 && dailyBoard.data.leaderboard.length > 0, 'GET /api/leaderboard?period=daily calculates daily standings');
    assert(dailyBoard.data.leaderboard[0].rank === 1, 'Top spender assigned Rank 1 with spend breakdown');

    const weeklyBoard = await request('/leaderboard?period=weekly');
    assert(weeklyBoard.status === 200 && weeklyBoard.data.leaderboard.length > 0, 'GET /api/leaderboard?period=weekly calculates weekly standings');

    const monthlyBoard = await request('/leaderboard?period=monthly');
    assert(monthlyBoard.status === 200 && monthlyBoard.data.leaderboard.length > 0, 'GET /api/leaderboard?period=monthly calculates monthly standings');

    // ----------------------------------------------------
    // TEST SECTION 10: ADMIN ANALYTICS AGGREGATION
    // ----------------------------------------------------
    console.log('\n--- 10. Admin Analytics Aggregation ---');
    const analyticsRes = await request('/admin/analytics', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(analyticsRes.status === 200, 'GET /api/admin/analytics responds with 200');
    const analytics = analyticsRes.data.analytics;
    assert(analytics.totalUsers >= 10, `Aggregated totalUsers: ${analytics.totalUsers}`);
    assert(analytics.totalOrders >= 5, `Aggregated totalOrders: ${analytics.totalOrders}`);
    assert(analytics.totalRevenue > 0, `Aggregated totalRevenue: ₹${analytics.totalRevenue}`);
    assert(analytics.popularFoods.length > 0, `Aggregated popular foods via MongoDB pipeline`);

    // ----------------------------------------------------
    // TEST SECTION 11: ERROR HANDLING & 404
    // ----------------------------------------------------
    console.log('\n--- 11. Centralized Error Handling ---');
    const notFoundRes = await request('/non-existent-endpoint');
    assert(notFoundRes.status === 404, 'Unknown endpoint returns 404 Not Found');

    console.log('\n======================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal Test Runner Error:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
};

runTests();
