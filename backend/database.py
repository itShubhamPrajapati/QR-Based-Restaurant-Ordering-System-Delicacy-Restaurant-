import os
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv
import razorpay

# Load environment variables
load_dotenv()

# Configuration
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_SEULnJj6ZBfPb4")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "hbKF4N7QaMyjDcI0FilNtPyW")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GST_RATE = float(os.getenv("GST_RATE", "5"))

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./delicacy_restaurant.db")

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def create_tables():
    """Create all database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncSession:
    """Dependency for database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
