from datetime import datetime
from typing import List, Optional, Dict
from enum import Enum
from pydantic import BaseModel, Field, validator
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from database import Base

# ===================== ENUMS =====================

class OrderStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    KITCHEN = "kitchen"

# ===================== DB MODELS =====================

class User(Base):
    """User model for staff management"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), default=UserRole.STAFF)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Table(Base):
    """Table management model"""
    __tablename__ = "tables"
    
    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(Integer, unique=True, nullable=False)
    capacity = Column(Integer, default=4)
    status = Column(String(20), default="available")  # available, occupied, reserved, maintenance
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Category(Base):
    """Menu category model"""
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MenuItem(Base):
    """Menu item model"""
    __tablename__ = "menu_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price_half = Column(Float, nullable=True)
    price_full = Column(Float, nullable=True)
    price = Column(Float, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    subcategory = Column(String(50), nullable=True)
    image_url = Column(String(500), nullable=True)
    is_available = Column(Boolean, default=True)
    is_vegetarian = Column(Boolean, default=False)
    has_half_full = Column(Boolean, default=False)
    preparation_time = Column(Integer, default=15)
    calories = Column(Integer, nullable=True)
    spice_level = Column(Integer, default=0)  # 0-5
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    category = relationship("Category")

class Discount(Base):
    """Discount and coupon model"""
    __tablename__ = "discounts"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    discount_type = Column(String(10), nullable=False)  # percentage, fixed
    discount_value = Column(Float, nullable=False)
    min_order_amount = Column(Float, default=0)
    max_discount = Column(Float, nullable=True)
    usage_limit = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0)
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    """Order model"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True, nullable=False)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)
    table_number = Column(Integer, nullable=False)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(15), nullable=False)
    items_json = Column(JSON, nullable=False)
    subtotal = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0)
    discount_code = Column(String(20), nullable=True)
    tax_amount = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(20), default=OrderStatus.PENDING)
    payment_status = Column(String(20), default=PaymentStatus.PENDING)
    payment_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class OrderItem(Base):
    """Individual order items for detailed tracking"""
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    half_full = Column(String(10), nullable=True)
    notes = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AnalyticsEvent(Base):
    """Analytics events for reporting"""
    __tablename__ = "analytics_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)  # order_completed, item_viewed, etc.
    event_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ===================== PYDANTIC SCHEMAS =====================

class UserCreate(BaseModel):
    """Schema for creating user"""
    username: str
    email: str
    password: str
    role: UserRole = UserRole.STAFF

class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TableCreate(BaseModel):
    """Schema for creating table"""
    table_number: int
    capacity: int = 4
    position_x: int = 0
    position_y: int = 0

class TableResponse(BaseModel):
    """Schema for table response"""
    id: int
    table_number: int
    capacity: int
    status: str
    position_x: int
    position_y: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class CategoryCreate(BaseModel):
    """Schema for creating category"""
    name: str
    description: Optional[str] = None
    display_order: int = 0

class CategoryResponse(BaseModel):
    """Schema for category response"""
    id: int
    name: str
    description: Optional[str]
    display_order: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class MenuItemCreate(BaseModel):
    """Schema for creating menu item"""
    name: str
    description: Optional[str] = None
    price_half: Optional[float] = None
    price_full: Optional[float] = None
    price: Optional[float] = None
    category_id: int
    subcategory: Optional[str] = None
    image_url: Optional[str] = None
    is_vegetarian: bool = False
    has_half_full: bool = False
    preparation_time: int = 15
    calories: Optional[int] = None
    spice_level: int = 0

class MenuItemResponse(BaseModel):
    """Schema for menu item response"""
    id: int
    name: str
    description: Optional[str]
    price_half: Optional[float]
    price_full: Optional[float]
    price: Optional[float]
    category_id: int
    subcategory: Optional[str]
    image_url: Optional[str]
    is_available: bool
    is_vegetarian: bool
    has_half_full: bool
    preparation_time: int
    calories: Optional[int]
    spice_level: int
    
    class Config:
        from_attributes = True

class CartItem(BaseModel):
    """Cart item schema"""
    menu_item_id: int
    name: str
    price: float
    quantity: int = 1
    half_full: Optional[str] = None
    notes: Optional[str] = None

class OrderCreate(BaseModel):
    """Schema for creating order"""
    table_number: int = Field(..., ge=1)
    customer_name: str = Field(..., min_length=1)
    customer_phone: str
    items: List[CartItem]
    discount_code: Optional[str] = None
    notes: Optional[str] = None
    
    @validator('customer_phone')
    def validate_phone(cls, v):
        if len(v) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return v

class OrderResponse(BaseModel):
    """Schema for order response"""
    id: int
    order_number: str
    table_number: int
    customer_name: str
    customer_phone: str
    items_json: List[Dict]
    subtotal: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    status: str
    payment_status: str
    payment_id: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class OrderListResponse(BaseModel):
    """Schema for order list response"""
    id: int
    order_number: str
    table_number: int
    customer_name: str
    total_amount: float
    status: str
    payment_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class DiscountCreate(BaseModel):
    """Schema for creating discount"""
    code: str
    name: str
    description: Optional[str] = None
    discount_type: str
    discount_value: float
    min_order_amount: float = 0
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None

class DiscountResponse(BaseModel):
    """Schema for discount response"""
    id: int
    code: str
    name: str
    description: Optional[str]
    discount_type: str
    discount_value: float
    min_order_amount: float
    max_discount: Optional[float]
    usage_limit: Optional[int]
    usage_count: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaymentVerification(BaseModel):
    """Schema for payment verification"""
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

class OrderStatusUpdate(BaseModel):
    """Schema for updating order status"""
    status: str

class AnalyticsQuery(BaseModel):
    """Schema for analytics query"""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    period: Optional[str] = None  # daily, weekly, monthly

class ExportFormat(BaseModel):
    """Schema for export format"""
    format: str = "csv"  # csv, pdf

class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str

class TokenResponse(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    token_type: str = "bearer"

