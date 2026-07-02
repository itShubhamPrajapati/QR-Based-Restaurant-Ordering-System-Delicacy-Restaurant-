from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
from typing import List, Optional, Dict
import razorpay

from database import get_db, razorpay_client, RAZORPAY_KEY_ID, GST_RATE
from models import (
    OrderStatus, PaymentStatus, Order, MenuItem, Discount, User,
    OrderCreate, OrderResponse, OrderListResponse, PaymentVerification, OrderStatusUpdate
)
from routes.websockets import manager
from auth import get_current_user

router = APIRouter()

# ===================== MASKING UTILITIES =====================

def mask_phone(phone: str) -> str:
    """Mask phone number to protect personal data (e.g. ******7890)"""
    if not phone:
        return ""
    if len(phone) >= 4:
        return "*" * (len(phone) - 4) + phone[-4:]
    return "*" * len(phone)

def mask_name(name: str) -> str:
    """Mask name to protect personal data (e.g. S*****m)"""
    if not name:
        return ""
    if len(name) <= 2:
        return name[0] + "*" if len(name) > 0 else ""
    return name[0] + "*" * (len(name) - 2) + name[-1]

# ===================== ORDER APIs =====================

@router.post("/api/orders", response_model=Dict)
async def create_order(order: OrderCreate, db: AsyncSession = Depends(get_db)):
    """Create new order"""
    # Calculate subtotal
    subtotal = 0
    items_data = []
    for item in order.items:
        subtotal += item.price * item.quantity
        items_data.append({
            "menu_item_id": item.menu_item_id,
            "name": item.name,
            "price": item.price,
            "quantity": item.quantity,
            "half_full": item.half_full,
            "notes": item.notes
        })
    
    # Validate and apply discount
    discount_amount = 0
    discount_code = None
    if order.discount_code:
        result = await db.execute(select(Discount).where(Discount.code == order.discount_code))
        discount = result.scalar_one_or_none()
        
        if discount and discount.is_active:
            if subtotal >= discount.min_order_amount:
                if discount.discount_type == "percentage":
                    discount_amount = min(
                        subtotal * (discount.discount_value / 100),
                        discount.max_discount or float('inf')
                    )
                else:
                    discount_amount = discount.discount_value
                discount_code = order.discount_code
                discount.usage_count += 1
    
    # Calculate tax and total
    taxable_amount = subtotal - discount_amount
    tax_amount = round(taxable_amount * (GST_RATE / 100), 2)
    total_amount = round(taxable_amount + tax_amount, 2)
    
    # Generate order number
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    order_number = f"ORD{timestamp}{order.table_number}"
    
    # Create order
    db_order = Order(
        order_number=order_number,
        table_number=order.table_number,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        items_json=items_data,
        subtotal=subtotal,
        discount_amount=discount_amount,
        discount_code=discount_code,
        tax_amount=tax_amount,
        total_amount=total_amount,
        notes=order.notes
    )
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    
    # Notify kitchen and admin
    await manager.broadcast_all({
        "type": "new_order",
        "order": {
            "id": db_order.id,
            "order_number": db_order.order_number,
            "table_number": db_order.table_number,
            "customer_name": db_order.customer_name,
            "items": items_data,
            "total_amount": total_amount,
            "status": db_order.status,
            "notes": order.notes,
            "created_at": db_order.created_at.isoformat()
        }
    })
    
    return {
        "order_id": db_order.id,
        "order_number": db_order.order_number,
        "total_amount": total_amount,
        "message": "Order created successfully"
    }

@router.get("/api/orders", response_model=List[OrderListResponse])
async def get_orders(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    table_number: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get orders with filters"""
    query = select(Order)
    
    if status:
        query = query.where(Order.status == status)
    if payment_status:
        query = query.where(Order.payment_status == payment_status)
    if table_number:
        query = query.where(Order.table_number == table_number)
    if search:
        query = query.where(Order.order_number.contains(search))
    
    query = query.order_by(Order.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    """Get order by ID"""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.get("/api/orders/number/{order_number}", response_model=OrderResponse)
async def get_order_by_number(order_number: str, db: AsyncSession = Depends(get_db)):
    """Get order by order number"""
    result = await db.execute(select(Order).where(Order.order_number == order_number))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.put("/api/orders/{order_id}/status")
async def update_order_status(
    order_id: int, 
    status_update: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update order status"""
    valid_statuses = [s.value for s in OrderStatus]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status_update.status
    if status_update.status == OrderStatus.COMPLETED.value:
        order.completed_at = datetime.utcnow()
    
    await db.commit()
    
    # Notify all connected clients
    await manager.broadcast_all({
        "type": "order_updated",
        "order_id": order_id,
        "status": status_update.status,
        "order": {
            "id": order.id,
            "order_number": order.order_number,
            "table_number": order.table_number,
            "status": order.status,
            "payment_status": order.payment_status
        }
    })
    
    return {"message": "Order status updated", "status": status_update.status}

# ===================== KITCHEN APIs (SECURED) =====================

@router.get("/api/kitchen/orders")
async def get_kitchen_orders(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all orders for kitchen display - requires authentication"""
    query = select(Order).distinct().order_by(Order.created_at.desc())
    if status:
        query = query.where(Order.status == status)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    kitchen_orders = []
    for order in orders:
        kitchen_orders.append({
            "id": order.id,
            "order_number": order.order_number,
            "table_number": order.table_number,
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "items": order.items_json,
            "total_amount": order.total_amount,
            "status": order.status,
            "payment_status": order.payment_status,
            "notes": order.notes,
            "created_at": order.created_at.isoformat(),
            "time_elapsed": int((datetime.utcnow() - order.created_at).total_seconds() / 60)
        })
    
    return kitchen_orders

@router.get("/api/kitchen/stats")
async def get_kitchen_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get kitchen statistics - requires authentication"""
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    result = await db.execute(
        select(Order).where(Order.created_at >= today_start)
    )
    today_orders = result.scalars().all()
    
    pending = sum(1 for o in today_orders if o.status in ["pending", "accepted"])
    preparing = sum(1 for o in today_orders if o.status == "preparing")
    ready = sum(1 for o in today_orders if o.status == "ready")
    completed = sum(1 for o in today_orders if o.status == "completed")
    total_revenue = sum(o.total_amount for o in today_orders if o.payment_status == "paid")
    
    return {
        "pending_orders": pending,
        "preparing_orders": preparing,
        "ready_orders": ready,
        "completed_today": completed,
        "total_revenue_today": total_revenue
    }

# ===================== PAYMENT APIs =====================

@router.post("/api/payment/create-order")
async def create_payment_order(order_data: Dict, db: AsyncSession = Depends(get_db)):
    """Create Razorpay order for payment"""
    order_id = order_data.get("order_id")
    amount = order_data.get("amount")
    
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": int(amount * 100),
            "currency": "INR",
            "receipt": order.order_number,
            "notes": {
                "table_number": order.table_number,
                "customer_name": order.customer_name
            }
        })
        
        return {
            "order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment creation failed: {str(e)}")

@router.post("/api/payment/verify")
async def verify_payment(
    payment: PaymentVerification,
    db: AsyncSession = Depends(get_db)
):
    """Verify Razorpay payment signature"""
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_payment_id": payment.razorpay_payment_id,
            "razorpay_order_id": payment.razorpay_order_id,
            "razorpay_signature": payment.razorpay_signature
        })
        
        # Find order by Razorpay order ID stored in receipt field
        # receipt contains the order_number
        razorpay_order = razorpay_client.order.fetch(payment.razorpay_order_id)
        receipt = razorpay_order.get("receipt", "")
        
        # Try to find order by order_number containing the receipt
        result = await db.execute(
            select(Order).where(Order.order_number == receipt)
        )
        order = result.scalar_one_or_none()
        
        # If not found by exact match, try partial match
        if not order:
            result = await db.execute(
                select(Order).where(Order.order_number.contains(receipt[-8:]))
            )
            order = result.scalar_one_or_none()
        
        if order:
            order.payment_status = "paid"
            order.payment_id = payment.razorpay_payment_id
            # Don't auto-accept order - let kitchen staff verify and accept
            await db.commit()
            
            await manager.broadcast_all({
                "type": "payment_completed",
                "order_id": order.id,
                "payment_id": payment.razorpay_payment_id,
                "order": {
                    "id": order.id,
                    "order_number": order.order_number,
                    "status": order.status,
                    "payment_status": order.payment_status
                }
            })
        
        return {"message": "Payment verified successfully", "status": "success"}
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===================== ORDER STATUS PAGE API (MASKED) =====================

@router.get("/api/order/track/{order_number}")
async def track_order(order_number: str, db: AsyncSession = Depends(get_db)):
    """Track order status - returns masked customer data to prevent scraping"""
    result = await db.execute(select(Order).where(Order.order_number == order_number))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    time_elapsed = int((datetime.utcnow() - order.created_at).total_seconds() / 60)
    
    return {
        "order": {
            "id": order.id,
            "order_number": order.order_number,
            "table_number": order.table_number,
            "customer_name": mask_name(order.customer_name),
            "customer_phone": mask_phone(order.customer_phone),
            "items": order.items_json,
            "total_amount": order.total_amount,
            "status": order.status,
            "payment_status": order.payment_status,
            "created_at": order.created_at.isoformat(),
            "time_elapsed": time_elapsed
        },
        "status_history": [
            {"status": "pending", "label": "Order Placed", "completed": True},
            {"status": "accepted", "label": "Confirmed", "completed": order.status in ["accepted", "preparing", "ready", "completed"]},
            {"status": "preparing", "label": "Preparing", "completed": order.status in ["preparing", "ready", "completed"]},
            {"status": "ready", "label": "Ready", "completed": order.status in ["ready", "completed"]},
            {"status": "completed", "label": "Delivered", "completed": order.status == "completed"}
        ]
    }

@router.get("/api/order/bill/{order_number}")
async def generate_bill(order_number: str, db: AsyncSession = Depends(get_db)):
    """Generate bill details for order"""
    result = await db.execute(select(Order).where(Order.order_number == order_number))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    bill_data = {
        "restaurant_name": "Delicacy Restaurant",
        "order_number": order.order_number,
        "table_number": order.table_number,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "date": order.created_at.strftime("%d/%m/%Y %H:%M"),
        "items": order.items_json,
        "subtotal": order.subtotal,
        "discount": order.discount_amount,
        "gst_rate": GST_RATE,
        "gst": order.tax_amount,
        "total": order.total_amount,
        "payment_status": order.payment_status,
        "payment_id": order.payment_id
    }
    
    return bill_data
