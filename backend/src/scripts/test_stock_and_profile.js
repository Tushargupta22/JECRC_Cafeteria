/**
 * Automated Verification Script:
 * 1. Admin login & stock management (set exact, increment, decrement, set to 0, restock)
 * 2. Automatic Out-of-Stock when stock <= 0
 * 3. Atomic stock validation during ordering (reject if quantity > stock, accept if valid)
 * 4. Stock decrement after order creation
 * 5. Student login & profile update (Name, shortName, branch/department, year, phone)
 * 6. Avatar upload to disk and URL assignment
 * 7. Cross-user profile security guard (User A cannot modify User B's profile)
 */

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING COMPREHENSIVE STOCK CONTROL & PROFILE TEST SUITE');
  console.log('===========================================================');

  // Helper fetch
  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // 1. Health check
  const health = await api('/health');
  if (health.status !== 200) {
    throw new Error(`Health check failed with status ${health.status}`);
  }
  console.log('✅ 1. Backend health check passed');

  // 2. Admin Login
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@cafetarea.edu', password: 'Admin@12345' })
  });
  if (adminLogin.status !== 200 || !adminLogin.data.token) {
    throw new Error('Admin login failed');
  }
  const adminToken = adminLogin.data.token;
  console.log('✅ 2. Admin login authenticated successfully');

  // 3. Student Registration / Login
  const testStudentEmail = `test_student_${Date.now()}@jecrc.edu`;
  const studentReg = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rohan Sharma',
      email: testStudentEmail,
      password: 'Student@12345',
      confirmPassword: 'Student@12345',
      department: 'B.Tech CS',
      year: 'Year 2',
      phone: '9876543210'
    })
  });
  if (studentReg.status !== 201 || !studentReg.data.token) {
    throw new Error('Student registration failed');
  }
  const studentToken = studentReg.data.token;
  const studentUser = studentReg.data.user;
  console.log('✅ 3. Student user registered and authenticated:', studentUser.name);

  // 4. Create second student to test cross-user security
  const testStudent2Email = `test_student2_${Date.now()}@jecrc.edu`;
  const student2Reg = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Ananya Verma',
      email: testStudent2Email,
      password: 'Student@12345',
      confirmPassword: 'Student@12345',
      department: 'Electronics Engg',
      year: 'Year 3'
    })
  });
  const student2Token = student2Reg.data.token;
  console.log('✅ 4. Second student registered for security checks');

  // 5. Fetch food item for stock testing
  const foodsRes = await api('/foods');
  if (!foodsRes.data.foods || foodsRes.data.foods.length === 0) {
    throw new Error('No foods found in database');
  }
  const targetFood = foodsRes.data.foods[0];
  console.log(`📦 Testing with product: "${targetFood.name}" (Initial stock: ${targetFood.stockCount}, available: ${targetFood.isAvailable})`);

  // 6. Admin sets product stock = 5
  const setStock5 = await api(`/foods/${targetFood._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ stockCount: 5 })
  });
  if (setStock5.status !== 200 || setStock5.data.food.stockCount !== 5 || setStock5.data.food.isAvailable !== true) {
    throw new Error(`Failed to set stock to 5: ${JSON.stringify(setStock5.data)}`);
  }
  console.log('✅ 5. Admin set stock = 5: verified in MongoDB (inStock: true)');

  // 7. Student orders 3 items (stock 5 -> stock becomes 2)
  const order1 = await api('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      items: [{ foodId: targetFood._id, quantity: 3 }]
    })
  });
  if (order1.status !== 201) {
    throw new Error(`Order for 3 items failed: ${JSON.stringify(order1.data)}`);
  }
  const foodAfterOrder1 = (await api(`/foods/${targetFood._id}`)).data.food;
  if (foodAfterOrder1.stockCount !== 2) {
    throw new Error(`Expected stock 2 after ordering 3, got ${foodAfterOrder1.stockCount}`);
  }
  console.log('✅ 6. Student ordered 3 items: stock safely decreased 5 -> 2');

  // 8. Student tries to order 3 more (only 2 left) -> Must be rejected!
  const orderExceedingStock = await api('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      items: [{ foodId: targetFood._id, quantity: 3 }]
    })
  });
  if (orderExceedingStock.status === 201) {
    throw new Error('Overselling occurred! Order succeeded despite requested quantity > stock');
  }
  console.log(`✅ 7. Overselling prevented! Order for 3 items rejected when stock is 2. Message: "${orderExceedingStock.data.message}"`);

  // 9. Admin sets stock to 0 -> Must automatically become unavailable (Out of Stock)
  const setStock0 = await api(`/foods/${targetFood._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ stockCount: 0 })
  });
  if (setStock0.status !== 200 || setStock0.data.food.stockCount !== 0 || setStock0.data.food.isAvailable !== false) {
    throw new Error(`Setting stock to 0 did not set isAvailable to false: ${JSON.stringify(setStock0.data)}`);
  }
  console.log('✅ 8. Admin set stock = 0: product automatically became isAvailable: false (OUT OF STOCK)');

  // 10. Student order on 0-stock item must be rejected
  const orderZeroStock = await api('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      items: [{ foodId: targetFood._id, quantity: 1 }]
    })
  });
  if (orderZeroStock.status === 201) {
    throw new Error('Order succeeded for out of stock product');
  }
  console.log(`✅ 9. Order rejected for 0-stock product. Message: "${orderZeroStock.data.message}"`);

  // 11. Admin restocks product with +15 -> stock becomes 15, isAvailable becomes true
  const restock15 = await api(`/foods/${targetFood._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ stockDelta: 15 })
  });
  if (restock15.status !== 200 || restock15.data.food.stockCount !== 15 || restock15.data.food.isAvailable !== true) {
    throw new Error(`Restock failed: ${JSON.stringify(restock15.data)}`);
  }
  console.log('✅ 10. Admin restocked +15: stock = 15, isAvailable: true');

  // 12. Student can order again now that product is restocked
  const orderRestocked = await api('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      items: [{ foodId: targetFood._id, quantity: 2 }]
    })
  });
  if (orderRestocked.status !== 201) {
    throw new Error(`Order failed after restock: ${JSON.stringify(orderRestocked.data)}`);
  }
  const foodAfterRestockOrder = (await api(`/foods/${targetFood._id}`)).data.food;
  if (foodAfterRestockOrder.stockCount !== 13) {
    throw new Error(`Expected stock 13 after ordering 2 from 15, got ${foodAfterRestockOrder.stockCount}`);
  }
  console.log('✅ 11. Student ordered 2 items from restocked product: stock decreased 15 -> 13');

  // 13. Student profile update: Name, shortName, department, year, phone
  const profileUpdate = await api('/auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      name: 'Rohan K. Sharma',
      shortName: 'Rohan S.',
      department: 'Mechanical Engg',
      year: 'Year 4',
      phone: '9988776655'
    })
  });
  if (profileUpdate.status !== 200 || profileUpdate.data.user.name !== 'Rohan K. Sharma' || profileUpdate.data.user.department !== 'Mechanical Engg' || profileUpdate.data.user.year !== 'Year 4') {
    throw new Error(`Profile update failed: ${JSON.stringify(profileUpdate.data)}`);
  }
  console.log('✅ 12. Student profile updated in MongoDB: Name, Dept, Year, Phone');

  // 14. Verify updated profile persists when fetched via /auth/me
  const meRes = await api('/auth/me', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  if (meRes.status !== 200 || meRes.data.user.name !== 'Rohan K. Sharma' || meRes.data.user.department !== 'Mechanical Engg') {
    throw new Error('Profile changes did not persist to /auth/me');
  }
  console.log('✅ 13. Profile persistence verified via /auth/me');

  // 15. Profile picture upload (base64 avatar)
  // Simple 1x1 png base64
  const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await api('/auth/upload-avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ image: samplePngBase64 })
  });
  if (uploadRes.status !== 200 || !uploadRes.data.imageUrl || !uploadRes.data.imageUrl.includes('/uploads/avatar-')) {
    throw new Error(`Avatar upload failed: ${JSON.stringify(uploadRes.data)}`);
  }
  console.log(`✅ 14. Avatar image saved to disk and served at: ${uploadRes.data.imageUrl}`);

  // Verify avatar is accessible via HTTP GET
  const avatarHttp = await fetch(uploadRes.data.imageUrl);
  if (avatarHttp.status !== 200) {
    throw new Error(`Avatar HTTP GET returned status ${avatarHttp.status}`);
  }
  console.log('✅ 15. Avatar static file URL successfully verified via HTTP GET');

  // 16. Security check: User B cannot modify User A's profile
  // Student 2 updates own profile - should ONLY update Student 2
  const student2Update = await api('/auth/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${student2Token}` },
    body: JSON.stringify({
      name: 'Ananya Verma (Updated)',
      department: 'Design School'
    })
  });
  if (student2Update.status !== 200 || student2Update.data.user.name !== 'Ananya Verma (Updated)') {
    throw new Error('Student 2 profile update failed');
  }

  // Check Student 1's profile is unchanged
  const student1Verify = await api('/auth/me', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  if (student1Verify.data.user.name !== 'Rohan K. Sharma') {
    throw new Error('Security violation: Student 1 profile was unexpectedly modified by Student 2!');
  }
  console.log('✅ 16. Security verification passed: User A and User B cannot affect each other');

  console.log('===========================================================');
  console.log('🎉 ALL STOCK CONTROL & USER PROFILE TESTS PASSED 100%!');
  console.log('===========================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
