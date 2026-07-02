from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import (
    Category, CategoryCreate, CategoryResponse,
    MenuItem, MenuItemCreate, MenuItemResponse
)

router = APIRouter()

# ===================== MENU DATA =====================

def get_default_menu():
    """Return default menu items for seeding"""
    return [
        # Soups
        {"name": "Chicken Manchow Soup", "description": "Hot and spicy soup with crispy noodles", "price": 120, "category": "soups", "subcategory": "non-veg", "is_vegetarian": False, "has_half_full": False, "preparation_time": 8},
        {"name": "Chicken Hot & Sour Soup", "description": "Tangy and spicy soup", "price": 120, "category": "soups", "subcategory": "non-veg", "is_vegetarian": False, "has_half_full": False, "preparation_time": 8},
        {"name": "Veg Manchow Soup", "description": "Hot and spicy vegetable soup with noodles", "price": 90, "category": "soups", "subcategory": "veg", "is_vegetarian": True, "has_half_full": False, "preparation_time": 8},
        {"name": "Sweet Corn Soup", "description": "Creamy sweet corn soup", "price": 100, "category": "soups", "subcategory": "veg", "is_vegetarian": True, "has_half_full": False, "preparation_time": 8},
        # Starters
        {"name": "Chicken Lollipop", "description": "Spicy chicken wings on bone", "price_half": 90, "price_full": 170, "category": "starters", "subcategory": "chicken", "is_vegetarian": False, "has_half_full": True, "preparation_time": 15},
        {"name": "Chicken 65", "description": "Spicy deep fried chicken", "price_half": 100, "price_full": 190, "category": "starters", "subcategory": "chicken", "is_vegetarian": False, "has_half_full": True, "preparation_time": 15},
        {"name": "Veg Crispy", "description": "Crispy fried vegetables", "price_half": 80, "price_full": 150, "category": "starters", "subcategory": "veg", "is_vegetarian": True, "has_half_full": True, "preparation_time": 12},
        {"name": "Paneer 65", "description": "Spicy paneer fry", "price_half": 110, "price_full": 210, "category": "starters", "subcategory": "veg", "is_vegetarian": True, "has_half_full": True, "preparation_time": 15},
        # Main Course
        {"name": "Butter Chicken", "description": "Creamy tomato gravy with tender chicken", "price_half": 200, "price_full": 380, "category": "main_course", "subcategory": "chicken", "is_vegetarian": False, "has_half_full": True, "preparation_time": 20},
        {"name": "Chicken Tikka Masala", "description": "Spicy tomato gravy with chicken pieces", "price_half": 210, "price_full": 400, "category": "main_course", "subcategory": "chicken", "is_vegetarian": False, "has_half_full": True, "preparation_time": 20},
        {"name": "Paneer Butter Masala", "description": "Creamy paneer in tomato gravy", "price_half": 200, "price_full": 380, "category": "main_course", "subcategory": "veg", "is_vegetarian": True, "has_half_full": True, "preparation_time": 18},
        {"name": "Dal Makhani", "description": "Black lentil creamy gravy", "price": 200, "category": "main_course", "subcategory": "veg", "is_vegetarian": True, "has_half_full": False, "preparation_time": 15},
        # Biryani
        {"name": "Chicken Dum Biryani", "description": "Aromatic basmati rice with tender chicken", "price_half": 180, "price_full": 320, "category": "biryani", "subcategory": "chicken", "is_vegetarian": False, "has_half_full": True, "preparation_time": 30},
        {"name": "Mutton Dum Biryani", "description": "Aromatic basmati rice with tender mutton", "price_half": 220, "price_full": 420, "category": "biryani", "subcategory": "mutton", "is_vegetarian": False, "has_half_full": True, "preparation_time": 35},
        {"name": "Veg Biryani", "description": "Aromatic rice with vegetables", "price_half": 140, "price_full": 260, "category": "biryani", "subcategory": "veg", "is_vegetarian": True, "has_half_full": True, "preparation_time": 22},
        # Rice & Noodles
        {"name": "Chicken Fried Rice", "description": "Fried rice with chicken", "price_half": 120, "price_full": 200, "category": "rice_noodles", "subcategory": "chicken", "is_vegetarian": False, "has_half_full": True, "preparation_time": 15},
        {"name": "Veg Fried Rice", "description": "Mixed vegetable fried rice", "price_half": 90, "price_full": 150, "category": "rice_noodles", "subcategory": "veg", "is_vegetarian": True, "has_half_full": True, "preparation_time": 12},
        {"name": "Chicken Hakka Noodles", "description": "Stir fried noodles with chicken", "price_half": 120, "price_full": 200, "category": "rice_noodles", "subcategory": "chicken", "is_vegetarian": False, "has_half_full": True, "preparation_time": 15},
        {"name": "Veg Hakka Noodles", "description": "Stir fried vegetables with noodles", "price_half": 90, "price_full": 150, "category": "rice_noodles", "subcategory": "veg", "is_vegetarian": True, "has_half_full": True, "preparation_time": 12},
        # Rolls
        {"name": "Paneer Roll", "description": "Soft roti with paneer filling", "price": 80, "category": "rolls", "subcategory": "paneer", "is_vegetarian": True, "has_half_full": False, "preparation_time": 8},
        {"name": "Chicken Roll", "description": "Soft roti with chicken filling", "price": 90, "category": "rolls", "subcategory": "chicken", "is_vegetarian": False, "has_half_full": False, "preparation_time": 8},
        {"name": "Egg Roll", "description": "Roti with egg filling", "price": 60, "category": "rolls", "subcategory": "egg", "is_vegetarian": False, "has_half_full": False, "preparation_time": 6},
        # Breads
        {"name": "Plain Roti", "description": "Soft Indian bread", "price": 15, "category": "breads", "subcategory": "roti", "is_vegetarian": True, "has_half_full": False, "preparation_time": 5},
        {"name": "Butter Naan", "description": "Butter naan", "price": 50, "category": "breads", "subcategory": "naan", "is_vegetarian": True, "has_half_full": False, "preparation_time": 6},
        {"name": "Aloo Paratha", "description": "Stuffed potato paratha", "price": 70, "category": "breads", "subcategory": "paratha", "is_vegetarian": True, "has_half_full": False, "preparation_time": 10},
        # Beverages
        {"name": "Tea (Regular)", "description": "Indian masala tea", "price": 25, "category": "beverages", "subcategory": "tea", "is_vegetarian": True, "has_half_full": False, "preparation_time": 5},
        {"name": "Coffee (Regular)", "description": "South Indian coffee", "price": 35, "category": "beverages", "subcategory": "coffee", "is_vegetarian": True, "has_half_full": False, "preparation_time": 5},
        {"name": "Cold Drink (250ml)", "description": "Soft drink", "price": 30, "category": "beverages", "subcategory": "cold_drink", "is_vegetarian": True, "has_half_full": False, "preparation_time": 2},
        {"name": "Mineral Water (500ml)", "description": "Packaged drinking water", "price": 20, "category": "beverages", "subcategory": "water", "is_vegetarian": True, "has_half_full": False, "preparation_time": 2},
    ]

# ===================== CATEGORY APIs =====================

@router.get("/api/categories", response_model=List[CategoryResponse])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all active categories"""
    result = await db.execute(
        select(Category).where(Category.is_active == True).order_by(Category.display_order)
    )
    return result.scalars().all()

@router.post("/api/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, db: AsyncSession = Depends(get_db)):
    """Create new category"""
    db_category = Category(**category.dict())
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category

@router.put("/api/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: int, category: CategoryCreate, db: AsyncSession = Depends(get_db)):
    """Update category"""
    result = await db.execute(select(Category).where(Category.id == category_id))
    db_category = result.scalar_one_or_none()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category.dict().items():
        setattr(db_category, key, value)
    
    await db.commit()
    await db.refresh(db_category)
    return db_category

@router.delete("/api/categories/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    """Delete category (soft delete by setting is_active=False)"""
    result = await db.execute(select(Category).where(Category.id == category_id))
    db_category = result.scalar_one_or_none()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_category.is_active = False
    await db.commit()
    return {"message": "Category deleted"}

# ===================== MENU APIs =====================

@router.get("/api/menu", response_model=List[MenuItemResponse])
async def get_menu(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    is_vegetarian: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all menu items with optional filters"""
    query = select(MenuItem).where(MenuItem.is_available == True)
    
    if category and category != 'undefined':
        # Try to filter by category_id first (if numeric)
        try:
            category_id = int(category)
            query = query.where(MenuItem.category_id == category_id)
        except ValueError:
            # If not numeric, filter by category name (join with categories table)
            cat_result = await db.execute(select(Category).where(Category.name == category))
            cat = cat_result.scalar_one_or_none()
            if cat:
                query = query.where(MenuItem.category_id == cat.id)
            else:
                # If category not found, return empty list
                return []
    
    if subcategory and subcategory != 'undefined':
        query = query.where(MenuItem.subcategory == subcategory)
    if is_vegetarian is not None:
        query = query.where(MenuItem.is_vegetarian == is_vegetarian)
    if search:
        query = query.where(MenuItem.name.contains(search))
    
    result = await db.execute(query)
    items = result.scalars().all()
    return items

@router.get("/api/menu/{item_id}", response_model=MenuItemResponse)
async def get_menu_item(item_id: int, db: AsyncSession = Depends(get_db)):
    """Get single menu item"""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item

@router.post("/api/menu", response_model=MenuItemResponse)
async def create_menu_item(item: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    """Create new menu item"""
    db_item = MenuItem(**item.dict())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.put("/api/menu/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(item_id: int, item: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    """Update menu item"""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    from datetime import datetime
    db_item.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/api/menu/{item_id}")
async def delete_menu_item(item_id: int, db: AsyncSession = Depends(get_db)):
    """Delete menu item"""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await db.delete(db_item)
    await db.commit()
    return {"message": "Menu item deleted"}

@router.put("/api/menu/{item_id}/toggle-availability")
async def toggle_availability(item_id: int, db: AsyncSession = Depends(get_db)):
    """Toggle menu item availability"""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    db_item.is_available = not db_item.is_available
    await db.commit()
    return {"message": "Availability updated", "is_available": db_item.is_available}

# ===================== SINGLE MENU SEED ENDPOINT =====================

@router.post("/api/menu/seed")
async def seed_menu(db: AsyncSession = Depends(get_db)):
    """
    Seed default menu items. Use 'force=true' query parameter to replace existing items.
    This is the single source of truth for menu seeding.
    """
    # Check existing items
    result = await db.execute(select(func.count()).select_from(MenuItem))
    existing_count = result.scalar_one()
    
    if existing_count == 0:
        # Seed menu if empty
        menu_items_data = get_default_menu()
        
        for item_data in menu_items_data:
            # Find category
            item_data_copy = item_data.copy()
            cat_name = item_data_copy.pop("category", "default")
            cat_result = await db.execute(select(Category).where(Category.name == cat_name))
            category = cat_result.scalar_one_or_none()
            
            if not category:
                category = Category(name=cat_name)
                db.add(category)
                await db.commit()
                await db.refresh(category)
            
            item_data_copy["category_id"] = category.id
            db_item = MenuItem(**item_data_copy)
            db.add(db_item)
        
        await db.commit()
        return {"message": f"Menu seeded successfully with {len(menu_items_data)} items", "items_count": len(menu_items_data)}
    else:
        return {
            "message": f"Menu already has {existing_count} items. Use ?force=true to reset.",
            "items_count": existing_count,
            "hint": "Call /api/menu/seed?force=true to reset menu"
        }

@router.post("/api/menu/reset")
async def reset_menu(db: AsyncSession = Depends(get_db)):
    """Force reset menu - deletes all items and categories and reseeds"""
    from sqlalchemy import text
    
    # Delete existing menu items
    await db.execute(text("DELETE FROM menu_items"))
    await db.commit()
    
    # Delete existing categories
    await db.execute(text("DELETE FROM categories"))
    await db.commit()
    
    # Seed fresh menu
    menu_items_data = get_default_menu()
    
    for item_data in menu_items_data:
        item_data_copy = item_data.copy()
        cat_name = item_data_copy.pop("category", "default")
        
        # Create category
        cat_result = await db.execute(select(Category).where(Category.name == cat_name))
        category = cat_result.scalar_one_or_none()
        
        if not category:
            category = Category(name=cat_name)
            db.add(category)
            await db.commit()
            await db.refresh(category)
        
        item_data_copy["category_id"] = category.id
        db_item = MenuItem(**item_data_copy)
        db.add(db_item)
    
    await db.commit()
    return {"message": f"Menu reset successfully with {len(menu_items_data)} items", "items_count": len(menu_items_data)}
