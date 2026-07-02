import os
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select

from database import create_tables, async_session_maker, FRONTEND_URL
from models import Category, MenuItem
from routes.menu import get_default_menu
from routes import menu, orders, admin, websockets

# Initialize FastAPI app
app = FastAPI(
    title="Delicacy Restaurant API",
    description="Production-ready QR-based restaurant management system",
    version="2.0.0"
)

# CORS middleware - Strict production-ready CORS configuration
# Allowed origins are fetched dynamically from environment variables
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# Add Vercel production FRONTEND_URL if set in environment
if FRONTEND_URL and FRONTEND_URL not in origins:
    origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safe mounting of static directory (handles read-only filesystems gracefully)
static_path = Path("backend/static")
if not static_path.exists():
    try:
        os.makedirs(static_path, exist_ok=True)
    except Exception as e:
        print(f"Warning: Could not create static directory: {e}")

if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# ===================== PRODUCTION ROOT & HEALTH CHECK =====================

@app.get("/")
async def root():
    """Root endpoint for Railway deployment verification"""
    return {
        "status": "API is running",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "production" if os.getenv("PORT") else "development")
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include all the sub-routers
app.include_router(menu.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(websockets.router)

# ===================== STATIC FILES SERVING (PRODUCTION BUNDLE) =====================

frontend_path = Path("frontend/dist")
if frontend_path.exists():
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")

# ===================== STARTUP EVENT =====================

@app.on_event("startup")
async def startup_event():
    """Initialize database and seed default menu on startup"""
    await create_tables()
    
    async with async_session_maker() as session:
        from sqlalchemy import func
        result = await session.execute(select(func.count()).select_from(MenuItem))
        menu_count = result.scalar_one()
        
        # Seed default admin user if none exists
        from models import User
        from auth import hash_password
        user_result = await session.execute(select(func.count()).select_from(User))
        user_count = user_result.scalar_one()
        
        if user_count == 0:
            default_admin = User(
                username="admin",
                email="admin@delicacy.com",
                hashed_password=hash_password("adminpassword"),
                role="admin",
                is_active=True
            )
            session.add(default_admin)
            await session.commit()
            print("Auto-seeded default admin user (admin / adminpassword)!")
 
        if menu_count == 0:
            # First time setup - seed menu
            menu_items = get_default_menu()
            
            # Get or create default category
            cat_result = await session.execute(select(Category).where(Category.name == "default"))
            default_cat = cat_result.scalar_one_or_none()
            
            if not default_cat:
                default_cat = Category(name="default", display_order=0)
                session.add(default_cat)
                await session.commit()
                await session.refresh(default_cat)
            
            for item_data in menu_items:
                item_data_copy = item_data.copy()
                cat_name = item_data_copy.pop("category", "default")
                
                # Create category if needed
                cat_check = await session.execute(select(Category).where(Category.name == cat_name))
                cat = cat_check.scalar_one_or_none()
                
                if not cat:
                    cat = Category(name=cat_name)
                    session.add(cat)
                    await session.commit()
                    await session.refresh(cat)
                
                item_data_copy["category_id"] = cat.id
                session.add(MenuItem(**item_data_copy))
            
            await session.commit()
            print(f"Auto-seeded {len(menu_items)} menu items on first startup!")

if __name__ == "__main__":
    import uvicorn
    # Dynamic Port Binding for Railway deployment
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting server on http://{host}:{port}")
    uvicorn.run("app:app", host=host, port=port, reload=True)
