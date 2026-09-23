import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Food from '../models/Food.js';
import Order from '../models/Order.js';
import Offer from '../models/Offer.js';
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
    console.log('🧪 RUNNING COMPREHENSIVE PERSONALIZATION & COUPON TEST SUITE');
    console.log('======================================================\n');

    // 1. Connect and Seed
    await connectDB();
    await seedDatabase();
    await Order.deleteMany({});

    // 2. Start HTTP server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        console.log(`[Test Server] Running on ${baseUrl}\n`);
        resolve();
      });
    });

    const request = async (path, options = {}) => {
      const url = `${baseUrl}${path}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    };

    const jwtSecret = process.env.JWT_SECRET || 'cafetarea_super_secure_jwt_secret_key_2026';
    const generateToken = (user) => {
      return jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '1d' });
    };

    // Fetch foods for order generation
    const foods = await Food.find({});
    const coffeeFood = foods.find((f) => f.name.toLowerCase().includes('coffee') || f.name.toLowerCase().includes('brew')) || foods[0];
    const burgerFood = foods.find((f) => f.name.toLowerCase().includes('burger')) || foods[1];
    const chaiFood = foods.find((f) => f.name.toLowerCase().includes('dosa') || f.name.toLowerCase().includes('chai')) || foods[2];
    const friesFood = foods.find((f) => f.name.toLowerCase().includes('fries') || f.name.toLowerCase().includes('snack')) || foods[3];

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // ----------------------------------------------------
    // SETUP USER PROFILES
    // ----------------------------------------------------
    console.log('--- 1. Setting up 5 distinct test users ---');

    // User 1: Coffee Lover
    const userCoffee = await User.create({
      name: 'Coffee Lover User',
      email: `coffee.lover.${Date.now()}@jecrc.edu`,
      passwordHash,
      department: 'B.Tech IT',
      role: 'student'
    });
    const tokenCoffee = generateToken(userCoffee);

    // Create 8 coffee orders and 1 burger order for User 1
    for (let i = 1; i <= 8; i++) {
      await Order.create({
        userId: userCoffee._id,
        customerName: userCoffee.name,
        orderNumber: `#COF${1000 + i}`,
        tokenNumber: `#${10 + i}`,
        items: [{ foodId: coffeeFood._id, name: coffeeFood.name, price: coffeeFood.price, quantity: 1, stationTag: coffeeFood.station }],
        subtotal: coffeeFood.price,
        discount: 0,
        total: coffeeFood.price,
        orderStatus: 'Completed',
        createdAt: new Date(Date.now() - (9 - i) * 3600 * 1000)
      });
    }
    await Order.create({
      userId: userCoffee._id,
      customerName: userCoffee.name,
      orderNumber: `#COF1009`,
      tokenNumber: `#19`,
      items: [{ foodId: burgerFood._id, name: burgerFood.name, price: burgerFood.price, quantity: 1, stationTag: burgerFood.station }],
      subtotal: burgerFood.price,
      discount: 0,
      total: burgerFood.price,
      orderStatus: 'Completed'
    });

    // User 2: Burger Fan
    const userBurger = await User.create({
      name: 'Burger Fan User',
      email: `burger.fan.${Date.now()}@jecrc.edu`,
      passwordHash,
      department: 'B.Tech ME',
      role: 'student'
    });
    const tokenBurger = generateToken(userBurger);

    // Create 6 burger orders for User 2
    for (let i = 1; i <= 6; i++) {
      await Order.create({
        userId: userBurger._id,
        customerName: userBurger.name,
        orderNumber: `#BUR${1000 + i}`,
        tokenNumber: `#${20 + i}`,
        items: [{ foodId: burgerFood._id, name: burgerFood.name, price: burgerFood.price, quantity: 1, stationTag: burgerFood.station }],
        subtotal: burgerFood.price,
        discount: 0,
        total: burgerFood.price,
        orderStatus: 'Completed',
        createdAt: new Date(Date.now() - (7 - i) * 3600 * 1000)
      });
    }

    // User 3: Chai / Snack Enthusiast
    const userChai = await User.create({
      name: 'Chai Enthusiast User',
      email: `chai.snack.${Date.now()}@jecrc.edu`,
      passwordHash,
      department: 'B.Tech EE',
      role: 'student'
    });
    const tokenChai = generateToken(userChai);

    // Create 7 chai/dosa orders and 2 snack orders for User 3
    for (let i = 1; i <= 7; i++) {
      await Order.create({
        userId: userChai._id,
        customerName: userChai.name,
        orderNumber: `#CHAI${1000 + i}`,
        tokenNumber: `#${30 + i}`,
        items: [{ foodId: chaiFood._id, name: chaiFood.name, price: chaiFood.price, quantity: 1, stationTag: chaiFood.station }],
        subtotal: chaiFood.price,
        discount: 0,
        total: chaiFood.price,
        orderStatus: 'Completed',
        createdAt: new Date(Date.now() - (8 - i) * 3600 * 1000)
      });
    }

    // User 4: New User with 0 orders
    const userNew = await User.create({
      name: 'Brand New Student',
      email: `new.student.${Date.now()}@jecrc.edu`,
      passwordHash,
      department: 'B.Tech CS',
      role: 'student'
    });
    const tokenNew = generateToken(userNew);

    // User 5: Active Cafeteria Plus Subscriber
    const userSubscriber = await User.create({
      name: 'VIP Plus Subscriber',
      email: `vip.sub.${Date.now()}@jecrc.edu`,
      passwordHash,
      department: 'B.Tech AI',
      role: 'student',
      subscription: {
        plan: 'Monthly Plus Membership',
        price: 349,
        discountPercentage: 15,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        isActive: true
      }
    });
    const tokenSubscriber = generateToken(userSubscriber);

    console.log('  ✅ 5 test users initialized with distinct histories.\n');

    // ----------------------------------------------------
    // TEST SECTION 1: PERSONALIZED RECOMMENDATIONS (REQUIREMENT 1, 2, 4, 18)
    // ----------------------------------------------------
    console.log('--- 2. Fetching Personalized Offers for Each User ---');

    // User 1 -> Coffee offer
    const res1 = await request('/offers/personalized', {
      headers: { Authorization: `Bearer ${tokenCoffee}` }
    });
    assert(res1.status === 200, 'User 1 GET /api/offers/personalized status 200');
    const offer1 = res1.data.offer || res1.data.recommendations?.[0];
    assert(offer1 && offer1.couponCode === 'COFFEELOVER', `User 1 receives COFFEELOVER (got: ${offer1?.couponCode})`);
    assert(offer1 && offer1.description === 'Because you order it frequently', 'User 1 description is "Because you order it frequently"');

    // User 2 -> Burger offer
    const res2 = await request('/offers/personalized', {
      headers: { Authorization: `Bearer ${tokenBurger}` }
    });
    assert(res2.status === 200, 'User 2 GET /api/offers/personalized status 200');
    const offer2 = res2.data.offer || res2.data.recommendations?.[0];
    assert(offer2 && offer2.couponCode === 'BURGERFAN', `User 2 receives BURGERFAN (got: ${offer2?.couponCode})`);
    assert(offer2 && offer2.description === 'Because you order it frequently', 'User 2 description is "Because you order it frequently"');

    // User 3 -> Chai offer
    const res3 = await request('/offers/personalized', {
      headers: { Authorization: `Bearer ${tokenChai}` }
    });
    assert(res3.status === 200, 'User 3 GET /api/offers/personalized status 200');
    const offer3 = res3.data.offer || res3.data.recommendations?.[0];
    assert(offer3 && (offer3.couponCode === 'CHAITIME' || offer3.couponCode === 'SNACK10'), `User 3 receives Chai/Snack offer (got: ${offer3?.couponCode})`);

    // User 4 -> New User Welcome offer (JECRC50), NOT "Because you order it frequently"
    const res4 = await request('/offers/personalized', {
      headers: { Authorization: `Bearer ${tokenNew}` }
    });
    assert(res4.status === 200, 'User 4 GET /api/offers/personalized status 200');
    const offer4 = res4.data.offer || res4.data.recommendations?.[0];
    assert(offer4 && offer4.couponCode === 'JECRC50', `New User receives welcome coupon JECRC50 (got: ${offer4?.couponCode})`);
    assert(offer4 && offer4.description !== 'Because you order it frequently', 'New User does NOT receive "Because you order it frequently"');

    // User 5 -> Subscriber VIP offer (PLUSHERO)
    const res5 = await request('/offers/personalized', {
      headers: { Authorization: `Bearer ${tokenSubscriber}` }
    });
    assert(res5.status === 200, 'User 5 GET /api/offers/personalized status 200');
    const offer5 = res5.data.offer || res5.data.recommendations?.[0];
    assert(offer5 && offer5.couponCode === 'PLUSHERO', `Subscriber receives PLUSHERO (got: ${offer5?.couponCode})`);

    // Verify recommendations are user-specific and NOT identical
    assert(offer1.couponCode !== offer2.couponCode, 'User 1 & User 2 have distinct coupon codes');
    assert(offer2.couponCode !== offer3.couponCode, 'User 2 & User 3 have distinct coupon codes');
    assert(offer1.couponCode !== offer4.couponCode, 'User 1 & User 4 have distinct coupon codes');

    // ----------------------------------------------------
    // TEST SECTION 2: BACKEND COUPON VALIDATION (REQUIREMENTS 6, 7)
    // ----------------------------------------------------
    console.log('\n--- 3. Backend Coupon Validation Engine ---');

    // 2.1 Valid coupon validation
    const val1 = await request('/offers/validate-coupon', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCoffee}` },
      body: JSON.stringify({ couponCode: 'COFFEELOVER', subtotal: 100, items: [] })
    });
    assert(val1.status === 200 && val1.data.valid === true, 'COFFEELOVER valid for User 1');
    assert(val1.data.discountAmount === 20, '20% discount on ₹100 calculated by backend = ₹20');

    // 2.2 Subscriber-only coupon applied by non-subscriber (User 1)
    const valSub = await request('/offers/validate-coupon', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCoffee}` },
      body: JSON.stringify({ couponCode: 'PLUSHERO', subtotal: 100, items: [] })
    });
    assert(valSub.status === 403, 'Non-subscriber blocked from PLUSHERO (HTTP 403)');
    assert(valSub.data.valid === false, 'PLUSHERO marked as invalid for non-subscriber');

    // 2.3 Subscriber-only coupon applied by subscriber (User 5)
    const valSubOk = await request('/offers/validate-coupon', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSubscriber}` },
      body: JSON.stringify({ couponCode: 'PLUSHERO', subtotal: 100, items: [] })
    });
    assert(valSubOk.status === 200 && valSubOk.data.valid === true, 'Subscriber successfully validates PLUSHERO');

    // 2.4 User-specific assigned coupon (assigned to User 2 only)
    const userSpecificOffer = await Offer.create({
      title: 'Special VIP Gift for User 2 Only',
      description: 'Exclusive personal code',
      discount: 30,
      discountType: 'percentage',
      couponCode: `FORBURGER_${Date.now()}`,
      userId: userBurger._id,
      validFrom: new Date(Date.now() - 3600 * 1000),
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      isActive: true
    });

    // User 1 tries to use User 2's coupon
    const valWrongUser = await request('/offers/validate-coupon', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCoffee}` },
      body: JSON.stringify({ couponCode: userSpecificOffer.couponCode, subtotal: 100, items: [] })
    });
    assert(valWrongUser.status === 403, 'User 1 blocked from using User 2 personal coupon (HTTP 403)');

    // User 2 uses their own coupon
    const valRightUser = await request('/offers/validate-coupon', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBurger}` },
      body: JSON.stringify({ couponCode: userSpecificOffer.couponCode, subtotal: 100, items: [] })
    });
    assert(valRightUser.status === 200 && valRightUser.data.valid === true, 'User 2 successfully validates own assigned coupon');

    // 2.5 Minimum order requirement check
    const valMinOrder = await request('/offers/validate-coupon', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenNew}` },
      body: JSON.stringify({ couponCode: 'JECRC50', subtotal: 50, items: [] }) // minimum order is 100
    });
    assert(valMinOrder.status === 400, 'Coupon below minimum order threshold rejected (HTTP 400)');

    // ----------------------------------------------------
    // TEST SECTION 3: ORDER CREATION & COUPON USAGE TRACKING (REQUIREMENTS 6, 8)
    // ----------------------------------------------------
    console.log('\n--- 4. Order Creation & Previous Coupon Usage Tracking ---');

    // Create order with coupon for User 1
    const orderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCoffee}` },
      body: JSON.stringify({
        items: [{ foodId: coffeeFood._id.toString(), quantity: 2, notes: '' }],
        couponCode: 'COFFEELOVER',
        paymentMethod: 'Campus UPI'
      })
    });
    assert(orderRes.status === 201, 'Order created successfully with coupon COFFEELOVER');
    assert(orderRes.data.order.couponCode === 'COFFEELOVER', 'Order record stored couponCode COFFEELOVER');
    assert(orderRes.data.order.offerDiscount > 0, 'Server applied offerDiscount > 0');

    // Verify Offer model recorded the redemption
    const updatedOfferRecord = await Offer.findOne({ couponCode: 'COFFEELOVER' });
    assert(updatedOfferRecord.timesUsed >= 1, 'Offer timesUsed incremented in MongoDB');
    const userUsed = updatedOfferRecord.usedBy.some(
      (u) => u.userId.toString() === userCoffee._id.toString()
    );
    assert(userUsed, 'Offer usedBy contains User 1 ID');

    // ----------------------------------------------------
    // TEST SECTION 4: RECOMMENDATION UPDATE & SHIFT OVER TIME (REQUIREMENTS 8, 9)
    // ----------------------------------------------------
    console.log('\n--- 5. Dynamic Recommendation Shift Over Time ---');

    // User 1 starts ordering Burgers heavily
    for (let i = 1; i <= 15; i++) {
      await Order.create({
        userId: userCoffee._id,
        customerName: userCoffee.name,
        orderNumber: `#SHIFT${1000 + i}`,
        tokenNumber: `#${40 + i}`,
        items: [{ foodId: burgerFood._id, name: burgerFood.name, price: burgerFood.price, quantity: 2, stationTag: burgerFood.station }],
        subtotal: burgerFood.price * 2,
        discount: 0,
        total: burgerFood.price * 2,
        orderStatus: 'Completed'
      });
    }

    // Now fetch User 1's personalized offer again:
    // Because User 1 now ordered 30 burgers (surpassing 8 coffees)
    // AND User 1 already used COFFEELOVER, recommendation MUST shift to BURGERFAN!
    const resShift = await request('/offers/personalized', {
      headers: { Authorization: `Bearer ${tokenCoffee}` }
    });
    assert(resShift.status === 200, 'User 1 GET /api/offers/personalized status 200 after order behavior change');
    const shiftedOffer = resShift.data.offer || resShift.data.recommendations?.[0];
    assert(
      shiftedOffer && shiftedOffer.couponCode === 'BURGERFAN',
      `User 1 recommendation shifted from Coffee to Burger (${shiftedOffer?.couponCode})`
    );

    console.log('\n======================================================');
    console.log(`🎉 ALL TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('Fatal test runner error:', error);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
};

runTests();
