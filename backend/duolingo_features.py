from fastapi import HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List, Dict
import random

# This will be imported from server.py
users_collection = None
shop_items_collection = None
user_inventory_collection = None
friends_collection = None
leagues_collection = None
league_members_collection = None
stories_collection = None
lessons_collection = None

def init_collections(db):
    """Initialize collections from main server"""
    global users_collection, shop_items_collection, user_inventory_collection
    global friends_collection, leagues_collection, league_members_collection, stories_collection, lessons_collection
    
    users_collection = db.users
    shop_items_collection = db.shop_items
    user_inventory_collection = db.user_inventory
    friends_collection = db.friends
    leagues_collection = db.leagues
    league_members_collection = db.league_members
    stories_collection = db.stories
    lessons_collection = db.lessons

# Helper function for shop initialization
async def initialize_shop():
    """Initialize shop with default items"""
    shop_items = [
        {
            "item_type": "heart_refill",
            "name": "Kalp Doldur",
            "description": "Tüm kalplerin yenilenir",
            "price": 350,
            "icon": "❤️",
            "category": "consumable"
        },
        {
            "item_type": "streak_freeze",
            "name": "Seri Dondurucu",
            "description": "Bir gün ders yapmasanız bile seriniz korunur",
            "price": 200,
            "icon": "🧊",
            "category": "power_up"
        },
        {
            "item_type": "xp_boost",
            "name": "XP Arttırıcı",
            "description": "15 dakika boyunca 2x XP kazanın",
            "price": 100,
            "icon": "⚡",
            "category": "power_up"
        },
        {
            "item_type": "heart_increase",
            "name": "Ekstra Kalp Slotu",
            "description": "Maksimum kalp sayısını 1 arttırır",
            "price": 500,
            "icon": "💗",
            "category": "permanent"
        },
        {
            "item_type": "timer_boost",
            "name": "Zamanlayıcı Artırıcı",
            "description": "Zamanlı alıştırmalarda ekstra süre kazanın",
            "price": 150,
            "icon": "⏱️",
            "category": "power_up"
        },
        {
            "item_type": "hint_token",
            "name": "İpucu Jetonu",
            "description": "Alıştırmalarda ipucu almak için kullanın",
            "price": 75,
            "icon": "💡",
            "category": "consumable"
        },
        {
            "item_type": "mistake_shield",
            "name": "Hata Kalkanı",
            "description": "Bir yanlış cevap verdiğinizde kalp kaybetmezsiniz",
            "price": 300,
            "icon": "🛡️",
            "category": "power_up"
        },
        {
            "item_type": "level_skip",
            "name": "Seviye Atlama",
            "description": "Bir dersi atlayarak bir sonraki derse geçin",
            "price": 450,
            "icon": "🚀",
            "category": "permanent"
        },
        {
            "item_type": "bonus_lesson",
            "name": "Bonus Ders",
            "description": "Ekstra bir bonus ders açarak daha fazla XP kazanın",
            "price": 200,
            "icon": "📚",
            "category": "consumable"
        },
    ]
    for item in shop_items:
        existing = shop_items_collection.find_one({"item_type": item["item_type"]})
        if not existing:
            shop_items_collection.insert_one(item)

# Hearts system
async def refill_hearts_if_needed(user):
    """Refill one heart every 30 minutes"""
    if user.get("hearts", 5) < user.get("max_hearts", 5):
        last_refill = datetime.fromisoformat(user.get("last_heart_refill", datetime.utcnow().isoformat()))
        now = datetime.utcnow()
        time_diff = (now - last_refill).total_seconds() / 60  # minutes
        
        hearts_to_add = int(time_diff / 30)  # 1 heart per 30 minutes
        if hearts_to_add > 0:
            new_hearts = min(user["hearts"] + hearts_to_add, user.get("max_hearts", 5))
            users_collection.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "hearts": new_hearts,
                        "last_heart_refill": now.isoformat()
                    }
                }
            )
            return new_hearts
    return user.get("hearts", 5)

async def deduct_heart(user):
    """Deduct a heart on wrong answer"""
    if user.get("hearts", 0) <= 0:
        return False
    
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$inc": {"hearts": -1}}
    )
    return True

# League system
LEAGUE_TIERS = ["bronze", "silver", "gold", "sapphire", "ruby", "emerald", "diamond"]

async def update_league_standings(user_id: str):
    """Update user's position in their league"""
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return
    
    # Get current league
    league = user.get("league", "bronze")
    
    # Get or create league for this week
    week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
    week_key = week_start.strftime("%Y-W%W")
    
    league_doc = leagues_collection.find_one({
        "tier": league,
        "week": week_key
    })
    
    if not league_doc:
        # Create new league
        league_doc = {
            "tier": league,
            "week": week_key,
            "created_at": datetime.utcnow().isoformat()
        }
        leagues_collection.insert_one(league_doc)
    
    # Update or create member entry
    member = league_members_collection.find_one({
        "user_id": user_id,
        "league_id": str(league_doc["_id"])
    })
    
    if not member:
        league_members_collection.insert_one({
            "user_id": user_id,
            "league_id": str(league_doc["_id"]),
            "xp_this_week": 0,
            "joined_at": datetime.utcnow().isoformat()
        })

async def get_league_standings(user_id: str):
    """Get current league standings"""
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return []
    
    league = user.get("league", "bronze")
    week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
    week_key = week_start.strftime("%Y-W%W")
    
    league_doc = leagues_collection.find_one({
        "tier": league,
        "week": week_key
    })
    
    if not league_doc:
        return []
    
    # Get all members and their weekly XP
    members = list(league_members_collection.find({"league_id": str(league_doc["_id"])}))
    
    standings = []
    for member in members:
        member_user = users_collection.find_one({"_id": ObjectId(member["user_id"])})
        if member_user:
            standings.append({
                "user_id": member["user_id"],
                "username": member_user["username"],
                "xp_this_week": member.get("xp_this_week", 0),
                "is_current_user": member["user_id"] == user_id
            })
    
    # Sort by XP
    standings.sort(key=lambda x: x["xp_this_week"], reverse=True)
    
    # Add ranks
    for idx, standing in enumerate(standings):
        standing["rank"] = idx + 1
    
    return standings[:20]  # Top 20

# Daily goal system
async def update_daily_goal_progress(user, xp_earned: int):
    """Update progress towards daily XP goal"""
    today = datetime.utcnow().date()
    last_login_date = datetime.fromisoformat(user.get("last_login", datetime.utcnow().isoformat())).date()
    
    if today != last_login_date:
        # Reset daily goal if new day
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"daily_goal_progress": 0}}
        )
    
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$inc": {"daily_goal_progress": xp_earned}}
    )
    
    new_progress = user.get("daily_goal_progress", 0) + xp_earned
    goal = user.get("daily_goal", 50)
    
    return {
        "progress": new_progress,
        "goal": goal,
        "completed": new_progress >= goal
    }

# Skill tree / Path system
async def get_skill_tree_lessons(user):
    """Get lessons organized as skill tree"""
    from server import user_progress_collection
    
    all_lessons = list(lessons_collection.find().sort("level", 1))
    user_id = str(user["_id"])
    
    tree = []
    for lesson in all_lessons:
        lesson_id = str(lesson["_id"])
        
        # Check if lesson is unlocked (previous lessons completed)
        is_unlocked = True
        if lesson.get("level", 1) > 1:
            # Check if previous level is completed
            prev_level_lessons = lessons_collection.count_documents({"level": lesson["level"] - 1})
            from server import user_progress_collection
            completed_prev = user_progress_collection.count_documents({
                "user_id": user_id,
                "completed": True,
                "lesson_id": {"$in": [str(l["_id"]) for l in lessons_collection.find({"level": lesson["level"] - 1})]}
            })
            is_unlocked = completed_prev >= prev_level_lessons
        
        # Get lesson progress
        progress = user_progress_collection.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        tree.append({
            "id": lesson_id,
            "title": lesson.get("title", ""),
            "level": lesson.get("level", 1),
            "is_unlocked": is_unlocked,
            "is_completed": progress.get("completed", False) if progress else False,
            "stars": min(5, (progress.get("score", 0) // 20)) if progress else 0,  # 0-5 stars
            "description": lesson.get("description", "")
        })
    
    return tree

# Generate initial shop items and stories
async def generate_story_with_ai():
    """Generate a story using AI"""
    # Placeholder - implement with AI if needed
    return {
        "title": "Restoran'da",
        "content": [
            {"type": "text", "text": "Ana kahvaltıda bir restorana gidiyor..."},
            {"type": "question", "text": "Ana ne sipariş ediyor?", "options": ["Kahve", "Çay", "Su"], "correct": 0}
        ]
    }

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc
