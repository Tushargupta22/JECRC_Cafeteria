export interface MenuItem {
  id: string;
  name: string;
  category: string;
  station: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  prepTime: string;
  isVeg: boolean;
  points: number;
  image: string;
  inStock: boolean;
  stockCount?: number;
  isPopular?: boolean;
  isChefSpecial?: boolean;
}

export interface StudentProfile {
  id: string;
  name: string;
  shortName: string;
  department: string;
  year: string;
  hall: string;
  studentId: string;
  isPlusMember: boolean;
  plusExpiry: string;
  points: number;
  dailyRank: number;
  dailySpend: number;
  orderStreakDays: number;
  ordersCount: number;
  avatar: string;
}

export interface CounterStatus {
  id: string;
  name: string;
  counterType: string;
  statusText: string;
  waitMinutes: number;
  colorClass: 'secondary' | 'primary' | 'amber';
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  shortName: string;
  department: string;
  spend: number;
  points: number;
  ordersCount: number;
  avatar?: string;
  initials?: string;
  isCurrentUser?: boolean;
  badge?: string;
}

export interface KitchenTicket {
  id: string;
  orderNumber: string;
  tokenNumber: string;
  customerName: string;
  status: 'new' | 'preparing' | 'ready' | 'completed';
  station: string;
  items: { name: string; quantity: number; stationTag: string }[];
  totalAmount: number;
  paymentMethod: string;
  isPlusPriority?: boolean;
  note?: string;
  createdAt: string;
  etaMinutes: number;
}

export const INITIAL_STUDENT: StudentProfile = {
  id: '',
  name: 'Campus Student',
  shortName: 'Student',
  department: 'JECRC Student',
  year: 'Year 1',
  hall: 'North Campus Hall',
  studentId: 'STU2026',
  isPlusMember: false,
  plusExpiry: '',
  points: 0,
  dailyRank: 0,
  dailySpend: 0,
  orderStreakDays: 0,
  ordersCount: 0,
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
};

export const COUNTERS_DATA: CounterStatus[] = [
  {
    id: 'counter-a',
    name: 'Counter A (Snacks)',
    counterType: 'Snacks',
    statusText: 'Fast Moving',
    waitMinutes: 4,
    colorClass: 'secondary'
  },
  {
    id: 'counter-b',
    name: 'Counter B (Meals)',
    counterType: 'Meals',
    statusText: 'Moderate Rush',
    waitMinutes: 9,
    colorClass: 'primary'
  },
  {
    id: 'counter-c',
    name: 'Counter C (Beverages)',
    counterType: 'Beverages',
    statusText: 'Minimal Queue',
    waitMinutes: 2,
    colorClass: 'secondary'
  }
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'paneer-tikka-burger',
    name: 'Gourmet Paneer Tikka Burger',
    category: 'Fast Food',
    station: 'The Campus Grill',
    description: 'Crispy grilled paneer patty marinated in tandoori spices, mint slaw, melted cheddar in buttered brioche bun.',
    price: 80,
    originalPrice: 95,
    rating: 4.8,
    reviewsCount: 128,
    prepTime: '10 min',
    isVeg: true,
    points: 8,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLMGRe8lxsbrCtFUGpLj2K13mI1oUTeZHhoBsTptxLkJTkGKwoZ0ORUISGm6nA-5Nfc9jB0VX2QbQvuRKBDVmrQ94Wr3dHA0fI6yz9RKpfHwYrozkspx8fE_04jZZn4VckteHPVzBaLr2Dzyq7zOk4vaEx_DIbv1lwjnOQZReiTMoX8dxjRx581hwpw9Fld9hW00erVVIGEzUHmau5u6mnVSQVJBjk1F-bLHh1vTSh8k-ql922x8lM',
    inStock: true,
    stockCount: 45,
    isPopular: true,
    isChefSpecial: true
  },
  {
    id: 'hazelnut-cold-coffee',
    name: 'Iced Hazelnut Cold Coffee',
    category: 'Cold Beverages',
    station: 'North Hall Brew Station',
    description: 'Double shot espresso blended with crushed ice, artisanal hazelnut syrup, topped with fresh whipped cream.',
    price: 60,
    rating: 4.9,
    reviewsCount: 310,
    prepTime: '5 min',
    isVeg: true,
    points: 6,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsoHpvscdjNVAbaTJj24Bk8_ojQbANepT2Qg8KZ5Xy-juw4LnyH4ERGryi0d97AswdQHWsIKicoGiBJ-tywxB-AnfLhpxEaqzyZEtWpTlNGGLI5npkjdM63frxTqZfEvpHUspGt74iMqj-wKJaAc__jyyUrNnCIH2MZLNuKyUcAzUjMTi9kqt9A75hCxEASTtUVN6MQLPGGSl3AkX7yXGv3x9L3O6s59wGoBeIF0t0UuVKSfPh2KXc',
    inStock: true,
    stockCount: 80,
    isPopular: true
  },
  {
    id: 'peri-peri-fries',
    name: 'Loaded Cheesy Peri Peri Fries',
    category: 'Snacks & Sides',
    station: 'Fries & Dips Kiosk',
    description: 'Skin-on double fried potato cuts seasoned with our spicy African bird\'s eye spice blend and molten cheddar dip.',
    price: 55,
    originalPrice: 70,
    rating: 4.7,
    reviewsCount: 240,
    prepTime: '4 min',
    isVeg: true,
    points: 5,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDA526BwW_sOGvISMT7mv7QNHyTdlUOSDiMrNl442IUPF08PvKr0XjEuiFuKuDeRnDzWg9aIKgGQpMRs-rp-HRJoncDCChVz0pzhOrjBa0tchS0mGxLwANxV8iSo6xBURlaqlNQW30Cz3isf3huzy68St8HjZMQBD4mpAuFbEiQL3XbkAa5Kr05ON2z6ZM_9D4DS9ho1Yyh58CR6pSZ5hDaDM-lR4udhGSqU_jmevHunb6qu_JfdsX',
    inStock: true,
    stockCount: 30,
    isPopular: true
  },
  {
    id: 'paneer-rice-bowl',
    name: 'High-Protein Paneer Rice Bowl',
    category: 'Meals & Thalis',
    station: 'Campus Thali & Bowls',
    description: 'Warm jeera basmati rice topped with tawa paneer cubes, tossed edamame beans, yellow lentils dal, and fresh mint chutney.',
    price: 140,
    rating: 4.8,
    reviewsCount: 89,
    prepTime: '8 min',
    isVeg: true,
    points: 14,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCA43inq5WMPCEavtQ-8bodbemfMEDxFvVxK4sCyBiX94bXZCJuUsnbKsZwp19qs4lXxWzym0bE6FuWjnE_r4lr0eNloqCyLqaCEVHjbbjivH9Pu7COAqsufsn9aHuF34zVVTKDhghXICxKeF-JYPWYbXe6xoDWtJpFrynBkFFIIBw7YxW7K7_PLPyMxBkaMU5HBcSFKXJmUl0CVoydJ8hx1P3cY45K8fHLrODzyf9zXwilNQZyxgWO',
    inStock: true,
    stockCount: 25
  },
  {
    id: 'belgian-brownie-shake',
    name: 'Belgian Brownie Shake',
    category: 'Cold Beverages',
    station: 'Beverage Bar',
    description: 'Thick slow-churned dark Belgian cocoa milkshake infused with baked fudge brownie crumbs and chocolate ganache.',
    price: 110,
    rating: 4.9,
    reviewsCount: 412,
    prepTime: '6 min',
    isVeg: true,
    points: 11,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCF9JFlz8t5HmXqBACQMPWqe3OD_IgG9pPYqIBQjppht1KQyrheOuhSZHagXv9j3cYRoaSWfgcWJVhqEiJoAbytsAgWgfLyOGEVXCdaAfgOZHt2dujlhFOojyCysP4dfsaeMUnCvOmJ_yL8heBcj_m60z7e_IQCAtq41nmUc9_2iIkVXI_grVWzLL-JDWWpsCEKLt5GQ-QrCs4V9uTRDqdiYzA0olYquIz6L38ZaTSUyA8USM3j9tAo',
    inStock: true,
    stockCount: 50
  },
  {
    id: 'classic-veg-club-sandwich',
    name: 'Classic Veg Club Sandwich',
    category: 'Breakfast',
    station: 'Bakery & Deli',
    description: 'Triple-layered grilled bread packed with english cucumber, juicy tomatoes, coleslaw, processed cheddar, and basil garlic mayo.',
    price: 75,
    rating: 4.6,
    reviewsCount: 165,
    prepTime: '7 min',
    isVeg: true,
    points: 7,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0g9IGnMAyMpQDc4CoSVMdCnArLL3JaxuvUE4ep3s0-OKV4hezK9y1MtwTjLZUJ3YJrczRwoP9MBi8CwQfrojkTvQXiFeZ9OecP-U34Mw3ze_X8nfCpIx5koc8-O3gsxTKFED20f6eBLpBFfZyLMT_Hu8UBtvOw279ZlXpCROF7Vr7tyaTsGlZ-NLPcNKWIJ-NAhMHtgKWR8CgYzuYY9nU4P1ovBZ64wV5uCY1JSMEKjxmQgYJdVW-',
    inStock: true,
    stockCount: 20
  },
  {
    id: 'fresh-garden-salad',
    name: 'Fresh Garden Salad Bowl',
    category: 'Healthy & Greens',
    station: 'Green Salad Bar',
    description: 'Fresh organic garden salad bowl with cucumbers, cherry tomatoes, crisp lettuce, olive oil dressing in a modern white ceramic serving bowl.',
    price: 65,
    rating: 4.5,
    reviewsCount: 95,
    prepTime: '3 min',
    isVeg: true,
    points: 6,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARAd8TK1n1RbJhSloQio1km4OruQEzQmNrNprvEXj_5G1xvWvkY4L2TIWOcn_gGwPp4itONVlx8QLxiiB46pP51D5mIj81xwDvDTLlQhWNstVc_hRHvCW0-IxuYf3wNASb2LHc6UW-M-jHUU5oWQUZqiWvWa2JWFLIbsMMq24L7t-jIXUjb7v9QMhtzEVpRLMrhZWlusyBEt46mSNAs8Tkf1e024L385pdCPpHtYxRNI9rboVO0NJT',
    inStock: false,
    stockCount: 0
  }
];

export const INITIAL_LEADERBOARD: LeaderboardUser[] = [];

export const INITIAL_KITCHEN_TICKETS: KitchenTicket[] = [];

