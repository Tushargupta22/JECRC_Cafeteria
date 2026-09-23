const baseUrl = 'http://localhost:5000/api';

const seedViaApi = async () => {
  try {
    console.log('[Seed API] Fetching menu items from running server...');
    const foodRes = await fetch(`${baseUrl}/foods`);
    const foodData = await foodRes.json();
    const foods = foodData.foods || [];

    const coffeeFood = foods.find((f) => f.name.toLowerCase().includes('coffee') || f.name.toLowerCase().includes('brew')) || foods[0];
    const burgerFood = foods.find((f) => f.name.toLowerCase().includes('burger')) || foods[1];
    const chaiFood = foods.find((f) => f.name.toLowerCase().includes('chai') || f.name.toLowerCase().includes('dosa')) || foods[2];

    const users = [
      {
        email: 'coffee.lover@jecrc.edu',
        name: 'Aarav Sharma',
        password: 'Password@123',
        department: 'B.Tech IT',
        food: coffeeFood,
        orderCount: 8
      },
      {
        email: 'burger.fan@jecrc.edu',
        name: 'Rohan Verma',
        password: 'Password@123',
        department: 'B.Tech ME',
        food: burgerFood,
        orderCount: 6
      },
      {
        email: 'chai.snack@jecrc.edu',
        name: 'Ananya Gupta',
        password: 'Password@123',
        department: 'B.Tech EE',
        food: chaiFood,
        orderCount: 7
      },
      {
        email: 'new.student@jecrc.edu',
        name: 'Kavya Singh',
        password: 'Password@123',
        department: 'B.Tech CS',
        food: null,
        orderCount: 0
      }
    ];

    for (const u of users) {
      // Login or register
      let token = null;
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, password: u.password })
      });
      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.token) {
        token = loginData.token;
      } else {
        const regRes = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: u.name,
            email: u.email,
            password: u.password,
            department: u.department,
            role: 'student'
          })
        });
        const regData = await regRes.json();
        token = regData.token;
      }

      if (!token) {
        console.warn(`Could not authenticate user ${u.email}`);
        continue;
      }

      // Check current personalized offer
      const offerRes = await fetch(`${baseUrl}/offers/personalized`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const offerData = await offerRes.json();
      const currentOrders = offerData.userStats?.orderCount || 0;

      // Add missing orders if needed
      if (u.food && currentOrders < u.orderCount) {
        const ordersNeeded = u.orderCount - currentOrders;
        for (let i = 0; i < ordersNeeded; i++) {
          await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              items: [{ foodId: u.food._id, quantity: 1, notes: '' }],
              paymentMethod: 'Campus UPI'
            })
          });
        }
      }

      // Re-fetch offer
      const finalOfferRes = await fetch(`${baseUrl}/offers/personalized`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const finalOfferData = await finalOfferRes.json();
      const perk = finalOfferData.offer || finalOfferData.recommendations?.[0];

      console.log(`✅ ${u.name} (${u.email}) -> Orders: ${finalOfferData.userStats?.orderCount} | Perk: ${perk?.title} | Code: ${perk?.couponCode}`);
    }

    console.log('[Seed API] Done!');
  } catch (err) {
    console.error('[Seed API] Error:', err);
  }
};

seedViaApi();
