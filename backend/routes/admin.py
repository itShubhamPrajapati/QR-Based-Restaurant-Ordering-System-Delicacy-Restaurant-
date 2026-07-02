import os
import csv
import io as csv_io
import qrcode
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from database import get_db, FRONTEND_URL
from models import (
    Table, TableCreate, TableResponse,
    Discount, DiscountCreate, DiscountResponse,
    Order, MenuItem, User, UserLogin, TokenResponse
)
from auth import verify_password, create_access_token, get_current_user

router = APIRouter()

# ===================== LOGIN API =====================

@router.post("/api/admin/login", response_model=TokenResponse)
async def admin_login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Admin/staff login to obtain JWT token"""
    result = await db.execute(select(User).where(User.username == login_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Inactive user account"
        )
        
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# ===================== TABLE APIs =====================

@router.get("/api/tables", response_model=List[TableResponse])
async def get_tables(db: AsyncSession = Depends(get_db)):
    """Get all tables"""
    result = await db.execute(select(Table))
    return result.scalars().all()

@router.post("/api/tables", response_model=TableResponse)
async def create_table(
    table: TableCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new table"""
    # Check if table number already exists
    result = await db.execute(select(Table).where(Table.table_number == table.table_number))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Table number already exists")
    
    db_table = Table(**table.dict())
    db.add(db_table)
    await db.commit()
    await db.refresh(db_table)
    return db_table

@router.put("/api/tables/{table_id}", response_model=TableResponse)
async def update_table(
    table_id: int,
    table: TableCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update table"""
    result = await db.execute(select(Table).where(Table.id == table_id))
    db_table = result.scalar_one_or_none()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    for key, value in table.dict().items():
        setattr(db_table, key, value)
    
    await db.commit()
    await db.refresh(db_table)
    return db_table

@router.put("/api/tables/{table_id}/status")
async def update_table_status(
    table_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update table status"""
    valid_statuses = ["available", "occupied", "reserved", "maintenance"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.execute(select(Table).where(Table.id == table_id))
    db_table = result.scalar_one_or_none()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    db_table.status = status
    await db.commit()
    return {"message": "Table status updated", "status": status}

@router.delete("/api/tables/{table_id}")
async def delete_table(
    table_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete table"""
    result = await db.execute(select(Table).where(Table.id == table_id))
    db_table = result.scalar_one_or_none()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    await db.delete(db_table)
    await db.commit()
    return {"message": "Table deleted"}

# ===================== DISCOUNT APIs =====================

@router.get("/api/discounts", response_model=List[DiscountResponse])
async def get_discounts(db: AsyncSession = Depends(get_db)):
    """Get all active discounts"""
    result = await db.execute(select(Discount).where(Discount.is_active == True))
    return result.scalars().all()

@router.post("/api/discounts", response_model=DiscountResponse)
async def create_discount(
    discount: DiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new discount"""
    # Check if code already exists
    result = await db.execute(select(Discount).where(Discount.code == discount.code))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Discount code already exists")
    
    db_discount = Discount(**discount.dict())
    db.add(db_discount)
    await db.commit()
    await db.refresh(db_discount)
    return db_discount

@router.post("/api/discounts/validate")
async def validate_discount(code: str, order_amount: float, db: AsyncSession = Depends(get_db)):
    """Validate discount code"""
    result = await db.execute(select(Discount).where(Discount.code == code))
    discount = result.scalar_one_or_none()
    
    if not discount or not discount.is_active:
        raise HTTPException(status_code=404, detail="Invalid or expired discount code")
    
    if discount.valid_until and discount.valid_until < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Discount code has expired")
    
    if discount.usage_limit and discount.usage_count >= discount.usage_limit:
        raise HTTPException(status_code=400, detail="Discount code usage limit reached")
    
    if order_amount < discount.min_order_amount:
        raise HTTPException(status_code=400, detail=f"Minimum order amount ₹{discount.min_order_amount} required")
    
    # Calculate discount
    if discount.discount_type == "percentage":
        discount_amount = min(
            order_amount * (discount.discount_value / 100),
            discount.max_discount or float('inf')
        )
    else:
        discount_amount = discount.discount_value
    
    return {
        "valid": True,
        "code": discount.code,
        "name": discount.name,
        "discount_amount": round(discount_amount, 2)
    }

@router.delete("/api/discounts/{discount_id}")
async def delete_discount(
    discount_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete discount"""
    result = await db.execute(select(Discount).where(Discount.id == discount_id))
    db_discount = result.scalar_one_or_none()
    if not db_discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    
    db_discount.is_active = False
    await db.commit()
    return {"message": "Discount deleted"}

# ===================== ADMIN APIs =====================

@router.get("/api/admin/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get real-time admin statistics"""
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    # Today's orders
    result = await db.execute(
        select(Order).where(Order.created_at >= today_start)
    )
    today_orders = result.scalars().all()
    
    today_revenue = sum(o.total_amount for o in today_orders if o.payment_status == "paid")
    today_orders_count = sum(1 for o in today_orders if o.payment_status == "paid")
    pending_orders = sum(1 for o in today_orders if o.status == "pending")
    preparing_orders = sum(1 for o in today_orders if o.status == "preparing")
    
    # This month
    month_start = today.replace(day=1)
    month_result = await db.execute(
        select(Order).where(Order.created_at >= month_start)
    )
    month_orders = month_result.scalars().all()
    month_revenue = sum(o.total_amount for o in month_orders if o.payment_status == "paid")
    
    # All time stats
    all_orders = await db.execute(select(Order))
    all_orders_list = all_orders.scalars().all()
    all_time_revenue = sum(o.total_amount for o in all_orders_list if o.payment_status == "paid")
    all_time_orders = sum(1 for o in all_orders_list if o.payment_status == "paid")
    
    # Menu items count
    menu_count = await db.execute(select(func.count()).select_from(MenuItem))
    menu_items_count = menu_count.scalar_one()
    
    return {
        "today_revenue": today_revenue,
        "today_orders": today_orders_count,
        "pending_orders": pending_orders,
        "preparing_orders": preparing_orders,
        "month_revenue": month_revenue,
        "all_time_revenue": all_time_revenue,
        "all_time_orders": all_time_orders,
        "menu_items_count": menu_items_count
    }

@router.get("/api/admin/sales")
async def get_sales_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sales report"""
    query = select(Order).where(Order.payment_status == "paid")
    
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        query = query.where(Order.created_at >= start)
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
        query = query.where(Order.created_at <= end)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    total_revenue = sum(order.total_amount for order in orders)
    total_orders = len(orders)
    
    # Daily breakdown
    daily_sales = {}
    for order in orders:
        date_key = order.created_at.strftime("%Y-%m-%d")
        if date_key not in daily_sales:
            daily_sales[date_key] = {"orders": 0, "revenue": 0}
        daily_sales[date_key]["orders"] += 1
        daily_sales[date_key]["revenue"] += order.total_amount
    
    # Item breakdown
    item_counts = {}
    for order in orders:
        for item in order.items_json:
            name = item["name"]
            if name in item_counts:
                item_counts[name]["quantity"] += item["quantity"]
                item_counts[name]["revenue"] += item["price"] * item["quantity"]
            else:
                item_counts[name] = {
                    "quantity": item["quantity"],
                    "revenue": item["price"] * item["quantity"]
                }
    
    # Category breakdown
    category_sales = {}
    category_items = await db.execute(select(MenuItem))
    category_map = {item.id: item.category_id for item in category_items.scalars().all()}
    
    for order in orders:
        for item in order.items_json:
            cat_id = category_map.get(item["menu_item_id"], "unknown")
            if cat_id not in category_sales:
                category_sales[cat_id] = {"orders": 0, "revenue": 0}
            category_sales[cat_id]["revenue"] += item["price"] * item["quantity"]
    
    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "daily_sales": daily_sales,
        "items_sold": dict(sorted(item_counts.items(), key=lambda x: x[1]["revenue"], reverse=True)),
        "category_sales": category_sales
    }

@router.get("/api/admin/analytics")
async def get_analytics(
    period: str = Query(default="daily", regex="^(daily|weekly|monthly)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get analytics data for charts"""
    if period == "daily":
        days = 7
        date_format = "%Y-%m-%d"
    elif period == "weekly":
        days = 28
        date_format = "%Y-%m-%d"
    else:
        days = 90
        date_format = "%Y-%m"
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(Order).where(
            Order.created_at >= start_date,
            Order.payment_status == "paid"
        )
    )
    orders = result.scalars().all()
    
    # Group by period
    period_data = {}
    for order in orders:
        if period == "monthly":
            key = order.created_at.strftime("%Y-%m")
        else:
            key = order.created_at.strftime(date_format)
        
        if key not in period_data:
            period_data[key] = {"orders": 0, "revenue": 0}
        period_data[key]["orders"] += 1
        period_data[key]["revenue"] += order.total_amount
    
    # Top items
    item_counts = {}
    for order in orders:
        for item in order.items_json:
            name = item["name"]
            if name in item_counts:
                item_counts[name] += item["quantity"]
            else:
                item_counts[name] = item["quantity"]
    
    top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    return {
        "period": period,
        "period_data": period_data,
        "top_items": top_items,
        "total_revenue": sum(o.total_amount for o in orders),
        "total_orders": len(orders)
    }

@router.get("/api/admin/export")
async def export_data(
    format: str = Query(default="csv", regex="^(csv)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export sales data"""
    result = await db.execute(select(Order).where(Order.payment_status == "paid"))
    orders = result.scalars().all()
    
    # Create CSV
    output = csv_io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Order ID", "Order Number", "Table", "Customer", "Phone", 
                     "Items", "Subtotal", "Discount", "Tax", "Total", 
                     "Status", "Payment Status", "Created At", "Completed At"])
    
    # Data
    for order in orders:
        items_str = ", ".join([f"{item['name']} x{item['quantity']}" for item in order.items_json])
        writer.writerow([
            order.id,
            order.order_number,
            order.table_number,
            order.customer_name,
            order.customer_phone,
            items_str,
            order.subtotal,
            order.discount_amount,
            order.tax_amount,
            order.total_amount,
            order.status,
            order.payment_status,
            order.created_at,
            order.completed_at or ""
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sales_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ===================== QR CODE GENERATION =====================

@router.get("/api/admin/generate-qr/{table_number}")
async def generate_qr_code(
    table_number: int,
    current_user: User = Depends(get_current_user)
):
    """Generate QR code for table"""
    # Validate table number
    if table_number < 1:
        raise HTTPException(status_code=400, detail="Table number must be at least 1")
    
    # Get max tables from environment or use default
    max_tables = int(os.getenv("MAX_TABLES", "20"))
    if table_number > max_tables:
        raise HTTPException(status_code=400, detail=f"Table number exceeds maximum of {max_tables}")
    
    url = f"{FRONTEND_URL}/table/{table_number}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save to file
    filename = f"backend/static/qr_table_{table_number}.png"
    img.save(filename)
    
    return FileResponse(filename, media_type="image/png")

@router.get("/api/admin/generate-all-qr")
async def generate_all_qr_codes(
    max_tables: int = Query(default=20, le=50),
    current_user: User = Depends(get_current_user)
):
    """Generate QR codes for all tables"""
    max_tables = min(max_tables, int(os.getenv("MAX_TABLES", "20")))
    
    for table in range(1, max_tables + 1):
        url = f"{FRONTEND_URL}/table/{table}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        filename = f"backend/static/qr_table_{table}.png"
        img.save(filename)
    
    return {"message": f"QR codes generated for tables 1-{max_tables}", "count": max_tables}
