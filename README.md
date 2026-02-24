# Delicacy Restaurant - QR Based Ordering System

## Production-Ready Restaurant Management System

A complete QR-based restaurant ordering system with real-time kitchen display, admin panel, and payment integration.

## 🏗️ Architecture

```
delicacy-restaurant/
├── backend/
│   ├── app.py                 # FastAPI application (all-in-one)
│   ├── requirements.txt       # Python dependencies
│   ├── .env                  # Environment configuration
│   ├── .env.example          # Environment template
│   └── backend/static/       # QR codes storage
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main app with routing
│   │   ├── main.jsx          # Entry point
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   │   ├── CustomerPage.jsx    # Customer menu & ordering
│   │   │   ├── KitchenPage.jsx    # Kitchen display
│   │   │   ├── AdminPage.jsx      # Admin dashboard
│   │   │   ├── OrderStatusPage.jsx # Order tracking
│   │   │   └── admin/        # Admin sub-pages
│   │   ├── hooks/           # Custom hooks
│   │   │   └── useWebSocket.js    # WebSocket connection
│   │   ├── lib/            # Utilities
│   │   │   └── api.js      # API client
│   │   └── store/          # State management
│   │       └── store.js    # Zustand stores
│   ├── .env.example        # Environment template
│   └── package.json
└── README.md
```

## ✨ Features

### Customer Features
- 📱 QR-based menu access (table-specific URLs)
- 🍽️ Browse menu with categories and subcategories
- 🔍 Search and filter items (Veg/Non-Veg)
- 🛒 Add to cart with Half/Full selection
- 💳 Razorpay payment integration
- 📊 Real-time order status tracking

### Kitchen Features
- 📋 Real-time order dashboard
- 🔔 New order notifications (sound + vibration)
- ⏱️ Order timer with urgency indicator
- ✅ Status management (Accept → Preparing → Ready → Complete)
- 💰 Payment status tracking

### Admin Features
- 📈 Dashboard with sales statistics
- 🍔 Menu management (CRUD operations)
- 📱 QR code generation for tables
- 📊 Sales reports and analytics
- 💳 Discount coupon management

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ (backend)
- Node.js 18+ (frontend)
- Git

### Backend Setup

```bash
cd delicacy-restaurant/backend

# Create virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env  # Windows
cp .env.example .env   # Linux/Mac

# Edit .env with your settings
# Note: Default Razorpay test keys are included for testing

# Start the server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd delicacy-restaurant/frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env  # Windows
cp .env.example .env   # Linux/Mac

# Start development server
npm run dev
```

### Access the Application

| Page | URL |
|------|-----|
| Customer Menu | http://localhost:5173/table/1 |
| Kitchen Display | http://localhost:5173/kitchen |
| Admin Panel | http://localhost:5173/admin |
| API Docs | http://localhost:8000/docs |

## 🔧 Environment Variables

### Backend (.env)

```env
# Razorpay Payment (Get from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx

# Server Configuration
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=sqlite+aiosqlite:///./delicacy_restaurant.db

# QR Configuration
MAX_TABLES=20  # Maximum number of tables for QR generation
```

### Frontend (.env)

```env
# API URL (auto-detected if not set)
VITE_API_URL=http://localhost:8000

# Razorpay Key
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

## 💳 Payment Testing

Use these test credentials for Razorpay payments:

| Card Type | Card Number | Expiry | CVV |
|-----------|-------------|--------|-----|
| Success | 4111 1111 1111 1111 | Any future date | Any 3 digits |
| Failure | 4000 0000 0000 0002 | Any future date | Any 3 digits |

## 📱 QR Code System

### Generate QR Codes

1. Go to Admin Panel → QR Generator
2. Enter table number (1-{MAX_TABLES})
3. Download and print QR codes
4. Place on respective tables

### Customer Flow
1. Customer scans QR code
2. Redirects to `/table/{tableNumber}`
3. Browse menu and place order
4. Payment via Razorpay
5. Order sent to kitchen
6. Real-time status updates

## 🔌 WebSocket Events

The system uses WebSocket for real-time updates:

| Event | Direction | Description |
|-------|-----------|-------------|
| `new_order` | Server → Kitchen/Admin | New order placed |
| `order_updated` | Server → All | Order status changed |
| `payment_completed` | Server → All | Payment successful |

## 📊 API Endpoints

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Menu
- `GET /api/menu` - List menu items (with filters)
- `POST /api/menu` - Create menu item
- `PUT /api/menu/{id}` - Update menu item
- `DELETE /api/menu/{id}` - Delete menu item
- `POST /api/menu/seed` - Seed default menu

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders
- `GET /api/orders/{id}` - Get order
- `PUT /api/orders/{id}/status` - Update status

### Kitchen
- `GET /api/kitchen/orders` - Kitchen orders
- `GET /api/kitchen/stats` - Kitchen statistics

### Payment
- `POST /api/payment/create-order` - Create payment
- `POST /api/payment/verify` - Verify payment

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/sales` - Sales report
- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/export` - Export CSV

### QR Codes
- `GET /api/admin/generate-qr/{table}` - Generate QR
- `GET /api/admin/generate-all-qr` - Generate all QRs

## 🛡️ Security Considerations

For production deployment:

1. **CORS**: Update `FRONTEND_URL` to your production domain
2. **Authentication**: Add JWT authentication for admin endpoints
3. **Payment**: Use live Razorpay keys (not test keys)
4. **Database**: Consider PostgreSQL for production
5. **Rate Limiting**: Add rate limiting to APIs
6. **HTTPS**: Use HTTPS in production

## 📦 Production Deployment

### Backend
```bash
pip install gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend
```bash
npm run build
# Serve with nginx or static hosting
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000
# Kill process if needed
taskkill /PID <PID> /F
```

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### WebSocket connection failed
- Ensure backend is running on port 8000
- Check browser console for errors
- Verify CORS settings

### Database errors
```bash
# Delete existing database and restart
del delicacy_restaurant.db
uvicorn app:app --reload
```

## 📄 License

This project is developed for educational purposes as a college final year project.

## 🙏 Credits

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [SQLite](https://www.sqlite.org/) - Database
- [Razorpay](https://razorpay.com/) - Payment gateway
- [Framer Motion](https://www.framer.com/motion/) - Animations
