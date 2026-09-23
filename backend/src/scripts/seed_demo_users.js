import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Food from '../models/Food.js';
import Order from '../models/Order.js';

const seedDemoUsers = async () => {
  try {
    await connectDB();
    console.log('[Demo Users] Seeding demonstration profiles...');

    const foods = await Food.find({});
    const coffeeFood = foods.find((f) => f.name.toLowerCase().includes('coffee') || f.name.toLowerCase().includes('brew')) || foods[0];
    const burgerFood = foods.find((f) => f.name.toLowerCase().includes('burger')) || foods[1];
    const chaiFood = foods.find((f) => f.name.toLowerCase().includes('chai') || f.name.toLowerCase().includes('dosa')) || foods[2];

    const usersToSeed = [
      {
        email: 'coffee.lover@jecrc.edu',
        name: 'Aarav Sharma',
        password: 'Password@123',
        department: 'B.Tech IT',
        role: 'student',
        favoriteType: 'coffee'
      },
      {
        email: 'burger.fan@jecrc.edu',
        name: 'Rohan Verma',
        password: 'Password@123',
        department: 'B.Tech ME',
        role: 'student',
        favoriteType: 'burger'
      },
      {
        email: 'chai.snack@jecrc.edu',
        name: 'Ananya Gupta',
        password: 'Password@123',
        department: 'B.Tech EE',
        role: 'student',
        favoriteType: 'chai'
      },
      {
        email: 'new.student@jecrc.edu',
        name: 'Kavya Singh',
        password: 'Password@123',
        department: 'B.Tech CS',
        role: 'student',
        favoriteType: 'none'
      },
      {
        email: 'vip.subscriber@jecrc.edu',
        name: 'Tushar Mehra',
        password: 'Password@123',
        department: 'B.Tech AI',
        role: 'student',
        favoriteType: 'vip',
        subscription: {
          plan: 'Monthly Plus Membership',
          price: 349,
          discountPercentage: 15,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          isActive: true
        }
      }
    ];

    for (const u of usersToSeed) {
      await User.deleteOne({ email: u.email });
      const passwordHash = await bcrypt.hash(u.password, 10);
      const user = await User.create({
        email: u.email,
        name: u.name,
        passwordHash,
        department: u.department,
        role: u.role,
        subscription: u.subscription || {}
      });

      // Delete existing orders for this user
      await Order.deleteMany({ userId: user._id });

      if (u.favoriteType === 'coffee') {
        for (let i = 1; i <= 8; i++) {
          await Order.create({
            userId: user._id,
            customerName: user.name,
            orderNumber: `#DEMO_COF_${i}_${Date.now()}`,
            tokenNumber: `#${10 + i}`,
            items: [{ foodId: coffeeFood._id, name: coffeeFood.name, price: coffeeFood.price, quantity: 1, stationTag: coffeeFood.station }],
            subtotal: coffeeFood.price,
            discount: 0,
            total: coffeeFood.price,
            orderStatus: 'Completed',
            createdAt: new Date(Date.now() - (9 - i) * 3600 * 1000)
          });
        }
      } else if (u.favoriteType === 'burger') {
        for (let i = 1; i <= 6; i++) {
          await Order.create({
            userId: user._id,
            customerName: user.name,
            orderNumber: `#DEMO_BUR_${i}_${Date.now()}`,
            tokenNumber: `#${20 + i}`,
            items: [{ foodId: burgerFood._id, name: burgerFood.name, price: burgerFood.price, quantity: 1, stationTag: burgerFood.station }],
            subtotal: burgerFood.price,
            discount: 0,
            total: burgerFood.price,
            orderStatus: 'Completed',
            createdAt: new Date(Date.now() - (7 - i) * 3600 * 1000)
          });
        }
      } else if (u.favoriteType === 'chai') {
        for (let i = 1; i <= 7; i++) {
          await Order.create({
            userId: user._id,
            customerName: user.name,
            orderNumber: `#DEMO_CHAI_${i}_${Date.now()}`,
            tokenNumber: `#${30 + i}`,
            items: [{ foodId: chaiFood._id, name: chaiFood.name, price: chaiFood.price, quantity: 1, stationTag: chaiFood.station }],
            subtotal: chaiFood.price,
            discount: 0,
            total: chaiFood.price,
            orderStatus: 'Completed',
            createdAt: new Date(Date.now() - (8 - i) * 3600 * 1000)
          });
        }
      }
      console.log(`[Demo Users] Seeded user ${u.name} (${u.email}) - Type: ${u.favoriteType}`);
    }

    console.log('[Demo Users] All demo users seeded successfully!');
  } catch (err) {
    console.error('[Demo Users] Error seeding users:', err);
  } finally {
    await disconnectDB();
  }
};

seedDemoUsers();
