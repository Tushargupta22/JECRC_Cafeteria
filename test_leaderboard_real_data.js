const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('==================================================');
  console.log('🧪 LEADERBOARD REAL DATA LOGIC VERIFICATION SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('  ✅ PASS:', message);
      passed++;
    } else {
      console.error('  ❌ FAIL:', message);
      failed++;
    }
  }

  // 0. Authenticate as Admin
  console.log('Setup: Authenticate as Admin');
  const adminLoginRes = await fetch(BASE_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@cafetarea.edu',
      password: 'Admin@12345'
    })
  }).then(r => r.json());
  assert(adminLoginRes.success === true, 'Admin login successful');
  const adminToken = adminLoginRes.token;

  // Clear any existing orders to guarantee clean initial state
  await fetch(BASE_URL + '/orders/all', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + adminToken }
  });

  // 1. Check initial empty leaderboard state
  console.log('\nTest 1: Initial Empty Database Leaderboard');
  const initRes = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(initRes.success === true, 'API returns success: true');
  assert(initRes.count === 0, 'Count is 0');
  assert(Array.isArray(initRes.leaderboard) && initRes.leaderboard.length === 0, 'Leaderboard is empty array []');
  
  // Verify no fake names in response
  const stringified = JSON.stringify(initRes);
  assert(!stringified.includes('Tushar'), 'No Tushar in initial leaderboard');
  assert(!stringified.includes('Rahul'), 'No Rahul in initial leaderboard');
  assert(!stringified.includes('Aman'), 'No Aman in initial leaderboard');
  assert(!stringified.includes('Priya'), 'No Priya in initial leaderboard');
  assert(!stringified.includes('Aditya'), 'No Aditya in initial leaderboard');

  // 2. Register Student A (0 orders)
  console.log('\nTest 2: Register Student A (Fresh User, 0 Orders)');
  const emailA = 'student.a.' + Date.now() + '@jecrc.edu';
  const regARes = await fetch(BASE_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Aarav Patel',
      email: emailA,
      password: 'Password@123',
      department: 'B.Tech CS'
    })
  }).then(r => r.json());
  assert(regARes.success === true, 'Student A registration successful');
  assert(regARes.user.dailyRank === 0, 'Student A dailyRank is 0 (Unranked)');
  assert(regARes.user.dailySpend === 0, 'Student A dailySpend is 0');
  const tokenA = regARes.token;

  // Check getMe for Student A
  const meA = await fetch(BASE_URL + '/auth/me', {
    headers: { Authorization: 'Bearer ' + tokenA }
  }).then(r => r.json());
  assert(meA.user.dailyRank === 0, 'Student A getMe dailyRank is 0');
  assert(meA.user.dailySpend === 0, 'Student A getMe dailySpend is 0');

  // Check leaderboard still empty
  const lbAfterReg = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(lbAfterReg.count === 0, 'Leaderboard has 0 users (unranked student with 0 orders not on leaderboard)');

  // Get food menu for ordering
  const foodsRes = await fetch(BASE_URL + '/foods').then(r => r.json());
  assert(foodsRes.foods && foodsRes.foods.length > 0, 'Food items available in cafeteria menu: ' + foodsRes.foods?.length);
  const burger = foodsRes.foods.find(f => f.name.includes('Burger')) || foodsRes.foods[0];
  const wrap = foodsRes.foods.find(f => f.name.includes('Wrap') || f.name.includes('Fries')) || foodsRes.foods[1];

  // 3. Student A places a paid order of 2 burgers
  console.log('\nTest 3: Student A places a paid order of 2 items');
  const orderA = await fetch(BASE_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenA },
    body: JSON.stringify({
      items: [{ foodId: burger._id, quantity: 2, price: burger.price, name: burger.name }],
      paymentMethod: 'UPI'
    })
  }).then(r => r.json());
  assert(orderA.success === true, 'Order A created successfully');
  const spendA = orderA.order.total;
  console.log('   (Order A total verified by server: ₹' + spendA + ')');

  // Check leaderboard after 1 order
  const lb1 = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(lb1.count === 1, 'Leaderboard has EXACTLY 1 user');
  assert(lb1.leaderboard.length === 1, 'Leaderboard array length is 1');
  assert(lb1.leaderboard[0].name === 'Aarav Patel', 'Rank 1 is Aarav Patel');
  assert(lb1.leaderboard[0].rank === 1, 'Rank is #1');
  assert(lb1.leaderboard[0].spend === spendA, 'Rank 1 spend matches order total ₹' + spendA);
  assert(lb1.leaderboard[0].ordersCount === 1, 'Rank 1 ordersCount is 1');

  // Check Student A rank via getMe
  const meAAfterOrder = await fetch(BASE_URL + '/auth/me', {
    headers: { Authorization: 'Bearer ' + tokenA }
  }).then(r => r.json());
  assert(meAAfterOrder.user.dailyRank === 1, 'Student A getMe dailyRank is now 1');
  assert(meAAfterOrder.user.dailySpend === spendA, 'Student A getMe dailySpend matches order total ₹' + spendA);

  // 4. Register Student B (0 orders)
  console.log('\nTest 4: Register Student B (Fresh User, 0 orders)');
  const emailB = 'student.b.' + Date.now() + '@jecrc.edu';
  const regBRes = await fetch(BASE_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bhavya Sharma',
      email: emailB,
      password: 'Password@123',
      department: 'B.Tech IT'
    })
  }).then(r => r.json());
  assert(regBRes.user.dailyRank === 0, 'Student B dailyRank is 0 initially');
  const tokenB = regBRes.token;

  // Check leaderboard still has ONLY Student A
  const lbBeforeBOrder = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(lbBeforeBOrder.count === 1, 'Leaderboard still has ONLY 1 user before Student B orders');

  // 5. Student B places a paid order of 3 items (greater total than Student A)
  console.log('\nTest 5: Student B places a paid order (greater spend)');
  const orderB = await fetch(BASE_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenB },
    body: JSON.stringify({
      items: [{ foodId: burger._id, quantity: 4, price: burger.price, name: burger.name }],
      paymentMethod: 'UPI'
    })
  }).then(r => r.json());
  assert(orderB.success === true, 'Order B created successfully');
  const spendB = orderB.order.total;
  console.log('   (Order B total verified by server: ₹' + spendB + ' > Order A: ₹' + spendA + ')');

  // Check leaderboard after 2 orders
  const lb2 = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(lb2.count === 2, 'Leaderboard has EXACTLY 2 users');
  assert(lb2.leaderboard.length === 2, 'Leaderboard array length is 2');
  assert(lb2.leaderboard[0].name === 'Bhavya Sharma', 'Rank 1 is Bhavya Sharma (₹' + spendB + ')');
  assert(lb2.leaderboard[0].rank === 1, 'Bhavya rank is 1');
  assert(lb2.leaderboard[0].spend === spendB, 'Bhavya spend is ₹' + spendB);
  assert(lb2.leaderboard[1].name === 'Aarav Patel', 'Rank 2 is Aarav Patel (₹' + spendA + ')');
  assert(lb2.leaderboard[1].rank === 2, 'Aarav rank is 2');
  assert(lb2.leaderboard[1].spend === spendA, 'Aarav spend is ₹' + spendA);

  // Check Student A rank dynamically shifted to #2
  const meAShifted = await fetch(BASE_URL + '/auth/me', {
    headers: { Authorization: 'Bearer ' + tokenA }
  }).then(r => r.json());
  assert(meAShifted.user.dailyRank === 2, 'Student A getMe dailyRank dynamically shifted to 2');
  assert(meAShifted.user.dailySpend === spendA, 'Student A dailySpend is ' + spendA);

  // Check Student B rank is #1
  const meB = await fetch(BASE_URL + '/auth/me', {
    headers: { Authorization: 'Bearer ' + tokenB }
  }).then(r => r.json());
  assert(meB.user.dailyRank === 1, 'Student B getMe dailyRank is 1');
  assert(meB.user.dailySpend === spendB, 'Student B dailySpend is ' + spendB);

  // 6. Test Cancelled orders do NOT count
  console.log('\nTest 6: Cancelled orders do not contribute to leaderboard');
  const cancelledOrder = await fetch(BASE_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenA },
    body: JSON.stringify({
      items: [{ foodId: burger._id, quantity: 10, price: burger.price, name: burger.name }],
      paymentMethod: 'UPI'
    })
  }).then(r => r.json());

  // Admin cancels this order
  const cancelRes = await fetch(BASE_URL + '/orders/' + cancelledOrder.order._id + '/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: JSON.stringify({ status: 'Cancelled' })
  }).then(r => r.json());
  assert(cancelRes.success === true, 'Admin successfully set order status to Cancelled');

  const lbAfterCancel = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(lbAfterCancel.count === 2, 'Leaderboard still has only 2 users after cancelled order');
  assert(lbAfterCancel.leaderboard[1].spend === spendA, 'Aarav spend remains ₹' + spendA + ' (cancelled order excluded)');

  // 7. Register Student C and place 3rd order
  console.log('\nTest 7: Register Student C and place order');
  const emailC = 'student.c.' + Date.now() + '@jecrc.edu';
  const regCRes = await fetch(BASE_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Chirag Joshi',
      email: emailC,
      password: 'Password@123',
      department: 'B.Tech EE'
    })
  }).then(r => r.json());
  const tokenC = regCRes.token;

  const orderC = await fetch(BASE_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenC },
    body: JSON.stringify({
      items: [{ foodId: burger._id, quantity: 1, price: burger.price, name: burger.name }],
      paymentMethod: 'UPI'
    })
  }).then(r => r.json());
  const spendC = orderC.order.total;

  const lb3 = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(lb3.count === 3, 'Leaderboard has EXACTLY 3 users');
  assert(lb3.leaderboard[0].name === 'Bhavya Sharma' && lb3.leaderboard[0].rank === 1, '#1 is Bhavya (₹' + spendB + ')');
  assert(lb3.leaderboard[1].name === 'Aarav Patel' && lb3.leaderboard[1].rank === 2, '#2 is Aarav (₹' + spendA + ')');
  assert(lb3.leaderboard[2].name === 'Chirag Joshi' && lb3.leaderboard[2].rank === 3, '#3 is Chirag (₹' + spendC + ')');

  // 8. Test Cafeteria TV parity
  console.log('\nTest 8: Cafeteria TV Source of Truth Parity');
  const tvData = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(tvData.count === 3, 'Cafeteria TV receives identical 3 real users');
  assert(tvData.leaderboard[0].name === 'Bhavya Sharma', 'TV #1 is Bhavya Sharma');
  assert(tvData.leaderboard[1].name === 'Aarav Patel', 'TV #2 is Aarav Patel');
  assert(tvData.leaderboard[2].name === 'Chirag Joshi', 'TV #3 is Chirag Joshi');
  assert(!JSON.stringify(tvData).includes('Rahul'), 'TV has no mock user Rahul');
  assert(!JSON.stringify(tvData).includes('Tushar'), 'TV has no mock user Tushar');
  assert(!JSON.stringify(tvData).includes('Aman'), 'TV has no mock user Aman');
  assert(!JSON.stringify(tvData).includes('Priya'), 'TV has no mock user Priya');
  assert(!JSON.stringify(tvData).includes('Aditya'), 'TV has no mock user Aditya');

  // 9. Clean up test orders and verify clean state
  console.log('\nTest 9: Clean database state after verification');
  const clearRes = await fetch(BASE_URL + '/orders/all', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + adminToken }
  }).then(r => r.json());
  assert(clearRes.success === true, 'Test orders deleted cleanly: ' + clearRes.message);

  const cleanLb = await fetch(BASE_URL + '/leaderboard?period=daily').then(r => r.json());
  assert(cleanLb.count === 0, 'Leaderboard is cleanly empty (0 users) after cleanup');
  assert(cleanLb.leaderboard.length === 0, 'Leaderboard array length is 0');

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('==================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
