# JECRC Cafeteria — Full-Stack University Dining Platform 🍔☕

A modern, full-stack campus food ordering, kitchen automation, and loyalty platform built for university dining halls and express kiosks.

---

## ⚡ Quick Start: How to Run the Project (प्रोजेक्ट कैसे चलाएं)

Project ko chalane ke liye aapko **2 alag-alag terminals (CMD ya PowerShell windows)** ki zaroorat hogi:
1. **Terminal 1**: Backend Server (Port: `5000`)
2. **Terminal 2**: Frontend Web App (Port: `5173`)

---

### 📌 Quick Commands (Copy & Paste)

#### 🔹 Terminal 1 (Backend Server):
```bash
# 1. Backend folder me jayein
cd backend

# 2. Dependencies install karein
npm install

# 3. Demo menu items aur accounts load karein (One-time)
npm run seed

# 4. Backend server start karein
npm run dev
```
> ✅ **Backend Live URL**: `http://localhost:5000`  
> 🩺 **Health Check**: `http://localhost:5000/api/health`

---

#### 🔹 Terminal 2 (Frontend Client):
*(Ek naya terminal window open karein root folder `JECRC_Cafeteria-main` me)*

```bash
# 1. Frontend dependencies install karein
npm install

# 2. Frontend development server start karein
npm run dev
```
> 🚀 **Frontend Live URL**: `http://localhost:5173` (Browser me ye link kholein)

---

## 🔐 Authentication & Access Security (प्रमाणीकरण एवं सुरक्षा)

All accounts are created securely through self-service registration:
- **🎓 Student Accounts**: Register directly with campus email and password from the Student Portal.
- **👑 Admin Portal**: Registering an authorized administrator account requires entering the authorized **Admin Access Key**, which is verified exclusively on the server (`ADMIN_ACCESS_KEY`).
- In Vercel or production hosting, set the secret environment variable:
  `ADMIN_ACCESS_KEY=<Your_Secret_Admin_Key>`
- Unauthorized users or students cannot access administrative dashboards or APIs.

---

## 📋 Step-by-Step Detailed Setup Guide

### 1. Prerequisites (सिस्टम की ज़रूरी चीजें)
- **Node.js**: v18 ya usse upar ka version install hona chahiye.
  - Check karne ke liye terminal me run karein: `node -v`
- **NPM**: Node.js ke sath automatically aata hai (`npm -v`).
- **MongoDB**: External MongoDB install karne ki **bilkul zaroorat nahi hai**. Isme built-in *In-Memory / Local MongoDB* configured hai jo apne aap start ho jata hai!

---

### 2. Backend Setup (विस्तार से)

1. Terminal me `backend` folder ke andar jayein:
   ```bash
   cd backend
   ```
2. Required packages install karein:
   ```bash
   npm install
   ```
3. Database me sample data (Food Items, Users, Coupons) daalne ke liye seed command chalayein:
   ```bash
   npm run seed
   ```
   *Is command se 17 delicious food items, 5 student accounts, admin account aur sample offers database me load ho jayenge.*
4. Backend server ko development mode me start karein:
   ```bash
   npm run dev
   ```
   *Terminal me ye message aana chahiye:*
   ```text
   🚀 JECRC Cafeteria Backend Server running on port 5000
   📡 Base API URL: http://localhost:5000/api
   🩺 Health Check: http://localhost:5000/api/health
   ```

---

### 3. Frontend Setup (विस्तार से)

1. Ek nayi terminal window kholein aur project ke main root directory (`JECRC_Cafeteria-main`) me rahein.
2. Frontend ke packages install karein:
   ```bash
   npm install
   ```
3. Frontend app run karein:
   ```bash
   npm run dev
   ```
   *Terminal me local link generate hoga, jaise:*
   ```text
   VITE v5.4.10  ready in 300 ms

   ➜  Local:   http://localhost:5173/
   ```
4. Apna browser kholein aur `http://localhost:5173` par jayein.

---

## 🛠️ Troubleshooting & FAQs (अक्सर आने वाली समस्याएं और समाधान)

### Q1: PowerShell me error aa raha hai: `running scripts is disabled on this system` (PSSecurityException)
**Karan**: Windows PowerShell by default scripts block karta hai.  
**Solution**:
- **Tarika 1**: `npm` ki jagah `npm.cmd` likhein (Jaise `npm.cmd install` aur `npm.cmd run dev`).
- **Tarika 2**: PowerShell me ek baar ye command chalayein:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
- **Tarika 3**: Windows **Command Prompt (CMD)** ka use karein.

---

### Q2: Port 5000 ya 5173 already in use aa raha hai
**Solution**:
- Purana running terminal band karein (Ctrl + C dabayein).
- Agar background process phas gaya ho to Windows CMD me ye command chalayein:
  ```cmd
  taskkill /F /IM node.exe
  ```
  Iske baad dobara `npm run dev` chalayein.

---

### Q3: Menu items ya users dikhai nahi de rahe hain?
**Solution**:
- Backend folder me jaakar seed script dobara run karein:
  ```bash
  cd backend
  npm run seed
  ```

---

### Q4: Frontend se API call fail ho rahi hai (Network Error)?
**Solution**:
1. Check karein ki Terminal 1 me Backend server `http://localhost:5000` par chal raha ho.
2. Browser me `http://localhost:5000/api/health` open karke check karein ki `{"status":"healthy"}` return ho raha hai ya nahi.

---

## 🏗️ System Architecture

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Vanilla CSS tokens & TailwindCSS
- **Key Modules**: Interactive Food Menu, Real-time Cart Drawer, Live Order Tracking, Kitchen Kiosk, Gamified Leaderboard, Meal Subscriptions, and Admin Analytics Command Center.

### Backend (`/backend`)
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Zero-Config DB**: Built-in `mongodb-memory-server` with wiredTiger storage allows instant out-of-the-box local testing without requiring external MongoDB installations.
- **Authentication**: BCrypt password hashing, JWT Bearer Tokens, Role-Based Access Control (`requireAuth`, `requireAdmin`).
- **Security**: Strict server-side price validation, input sanitization, and centralized production-safe error handling.

---

## 📁 Project Directory Structure

```text
JECRC_Cafeteria-main/
├── backend/                       # Express & Node.js API Server
│   ├── src/
│   │   ├── config/                # Database connection & memory server
│   │   ├── controllers/           # Route logic (Auth, Foods, Orders, Offers)
│   │   ├── middleware/            # Auth guard, Admin role validator
│   │   ├── models/                # Mongoose schemas (User, Food, Order, etc.)
│   │   ├── routes/                # Express API routes
│   │   ├── scripts/               # DB seed script & API tests
│   │   ├── app.js                 # Express app setup & middleware
│   │   └── server.js              # Server entrypoint
│   ├── .env                       # Backend environment configuration
│   └── package.json
│
├── src/                           # React + TypeScript Frontend
│   ├── components/                # Reusable UI components (Navbar, Cart, etc.)
│   ├── context/                   # Auth, Cart, Kitchen context providers
│   ├── pages/                     # Application pages (Home, Menu, Admin, etc.)
│   ├── services/                  # API client services
│   ├── types/                     # TypeScript data interfaces
│   ├── App.tsx                    # Main router & app layout
│   └── main.tsx                   # Frontend entrypoint
│
├── .env                           # Frontend environment variables
├── package.json                   # Frontend dependencies & Vite scripts
└── README.md                      # Documentation & Execution Guide
```

---

## 📚 API Endpoint Catalog

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new student with name, email, password |
| `POST` | `/api/auth/login` | Public | Authenticate credentials and receive Bearer JWT |
| `GET` | `/api/auth/me` | User / Admin | Retrieve current logged-in user profile |
| `POST` | `/api/auth/logout` | Public | Terminate user session |

### Food Menu (`/api/foods`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/foods` | Public | Retrieve foods (supports `?category=...` and `?search=...`) |
| `GET` | `/api/foods/:id` | Public | Retrieve single food item details |
| `POST` | `/api/foods` | Admin Only | Add new cafeteria menu item |
| `PUT` | `/api/foods/:id` | Admin Only | Update existing food item details / price |
| `DELETE` | `/api/foods/:id` | Admin Only | Remove food item from cafeteria menu |

### Orders & Kitchen Flow (`/api/orders`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | User / Admin | Place order (Strict server-side price lookup & coupon discount calculation) |
| `GET` | `/api/orders` | User / Admin | User retrieves own orders; Admin retrieves all cafeteria orders |
| `GET` | `/api/orders/:id` | User / Admin | View detailed order receipt and status |
| `PUT` | `/api/orders/:id/status` | Admin Only | Update status (`Pending`, `Confirmed`, `Preparing`, `Ready`, `Completed`, `Cancelled`). Auto-awards ₹10 = 1 pt on `Completed`. |

### Membership Subscriptions (`/api/subscriptions`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/subscriptions/plans` | Public | Retrieve available pass options (`Weekly Snack Pass`, `Monthly Plus`, etc.) |
| `POST` | `/api/subscriptions/subscribe` | User / Admin | Subscribe to a meal pass with automatic discount computation |
| `GET` | `/api/subscriptions/current` | User / Admin | Fetch active subscription with real-time expiration validation |
| `POST` | `/api/subscriptions/cancel` | User / Admin | Cancel active membership pass |

### Offers & Discounts (`/api/offers`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/offers` | Public | Retrieve all active promotional coupons |
| `GET` | `/api/offers/personalized` | User / Admin | Machine personalization engine analyzing past orders |
| `POST` | `/api/offers` | Admin Only | Create new promotional offer / coupon |
| `PUT` | `/api/offers/:id` | Admin Only | Update offer |
| `DELETE` | `/api/offers/:id` | Admin Only | Delete offer |

### Dynamic Leaderboards (`/api/leaderboard`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leaderboard?period=daily` | Public | Daily campus top spenders (resets at midnight IST) |
| `GET` | `/api/leaderboard?period=weekly` | Public | Weekly campus standings |
| `GET` | `/api/leaderboard?period=monthly` | Public | Monthly championship leaderboard |

### Admin Analytics & KPIs (`/api/admin/analytics`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/analytics` | Admin Only | MongoDB aggregation pipeline calculating revenue, orders, active subscribers, loyalty coins, AOV |

---

## 🧪 Running Automated Tests

To run the backend integration test suite verifying authentication, orders, prices, discounts, and subscriptions:

```bash
cd backend
npm run test:api
```

---

## 🛡️ Security & Quality Standards
- **Password Security**: Salted hashes generated via `bcryptjs` with 10 rounds.
- **Data Protection**: `passwordHash` field has `{ select: false }` and is suppressed from JSON responses.
- **Price Tampering Protection**: Client prices in order requests are completely ignored; true unit prices are queried directly from MongoDB.
- **Error Shielding**: Production responses suppress stack traces while returning standard HTTP status codes (`400`, `401`, `403`, `404`, `409`, `500`).
