from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
import os
import jwt
import bcrypt
import difflib
from dotenv import load_dotenv
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

app = FastAPI(title="Romingo API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")
JWT_SECRET = os.getenv("JWT_SECRET")
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_collection = db.users
lessons_collection = db.lessons
user_progress_collection = db.user_progress
achievements_collection = db.achievements
shop_items_collection = db.shop_items
user_inventory_collection = db.user_inventory
friends_collection = db.friends
leagues_collection = db.leagues
league_members_collection = db.league_members
stories_collection = db.stories
mistakes_collection = db.user_mistakes

# Security
security = HTTPBearer()

# Pydantic Models
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LessonCreate(BaseModel):
    level: int
    topic: str

class ExerciseSubmit(BaseModel):
    lesson_id: str
    exercise_index: int
    user_answer: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    xp: int
    level: int
    streak: int
    last_login: str

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

def normalize_text(text: str) -> str:
    return " ".join((text or "").lower().strip().split())

def get_text_similarity(user_answer: str, correct_answer: str) -> float:
    return difflib.SequenceMatcher(None, normalize_text(user_answer), normalize_text(correct_answer)).ratio()

def detect_error_type(exercise: dict) -> str:
    exercise_type = exercise.get("type")
    if exercise_type in ["speaking", "listening"]:
        return f"{exercise_type}_accuracy"
    if exercise_type in ["translation", "sentence_complete"]:
        return "grammar"
    if exercise_type in ["word_match", "multiple_choice"]:
        return "vocabulary"
    return "general"

def spaced_repetition_days(repetition_count: int) -> int:
    schedule = [1, 3, 7, 14, 30]
    return schedule[min(repetition_count, len(schedule) - 1)]

def update_mistake_bank(user_id: str, lesson_id: str, exercise_index: int, exercise: dict, user_answer: str, is_correct: bool):
    now = datetime.utcnow()
    key = {
        "user_id": user_id,
        "lesson_id": lesson_id,
        "exercise_index": exercise_index,
    }

    existing = mistakes_collection.find_one(key)
    error_type = detect_error_type(exercise)

    if is_correct:
        if not existing:
            return

        next_repetition = existing.get("repetition_count", 0) + 1
        next_days = spaced_repetition_days(next_repetition)
        mistakes_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "last_answer": user_answer,
                    "last_result": "correct",
                    "last_seen_at": now.isoformat(),
                    "repetition_count": next_repetition,
                    "next_review_at": (now + timedelta(days=next_days)).isoformat(),
                    "status": "scheduled",
                }
            }
        )
        return

    if existing:
        mistakes_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "exercise_type": exercise.get("type"),
                    "error_type": error_type,
                    "question": exercise.get("question"),
                    "correct_answer": exercise.get("correct_answer"),
                    "last_answer": user_answer,
                    "last_result": "wrong",
                    "last_seen_at": now.isoformat(),
                    "next_review_at": (now + timedelta(days=1)).isoformat(),
                    "status": "due",
                },
                "$inc": {
                    "mistake_count": 1
                }
            }
        )
    else:
        mistakes_collection.insert_one({
            **key,
            "exercise_type": exercise.get("type"),
            "error_type": error_type,
            "question": exercise.get("question"),
            "correct_answer": exercise.get("correct_answer"),
            "last_answer": user_answer,
            "last_result": "wrong",
            "mistake_count": 1,
            "repetition_count": 0,
            "next_review_at": (now + timedelta(days=1)).isoformat(),
            "status": "due",
            "created_at": now.isoformat(),
            "last_seen_at": now.isoformat(),
        })

# AI Helper - Generate lessons using LLM
async def generate_lesson_content(level: int, topic: str):
    """Generate Romanian language lesson using AI"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"lesson_gen_{level}_{topic}",
        system_message="""Sen Türk kullanıcılara Romence öğreten bir dil öğretmeni asistanısın. 
        Duolingo tarzında interaktif dersler oluşturuyorsun. Her ders şunları içermeli:
        1. Temel kelimeler ve cümle yapıları
        2. Çeşitli alıştırma türleri (çoktan seçmeli, eşleştirme, çeviri, dinleme, konuşma)
        3. Pratik kullanım örnekleri
        Yanıtını JSON formatında ver."""
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Level {level} için "{topic}" konusunda bir Romence dersi oluştur. 
    Ders şu yapıda olmalı:
    {{
        "title": "Ders başlığı (Türkçe)",
        "description": "Ders açıklaması (Türkçe)",
        "vocabulary": [
            {{"romanian": "Romence kelime", "turkish": "Türkçe karşılık", "pronunciation": "Telaffuz"}},
            ...5-8 kelime
        ],
        "grammar_tip": "Gramer ipucu (Türkçe)",
        "exercises": [
            {{
                "type": "multiple_choice",
                "question": "Soru (Türkçe)",
                "options": ["Seçenek 1", "Seçenek 2", "Seçenek 3", "Seçenek 4"],
                "correct_answer": "Doğru cevap",
                "explanation": "Açıklama (Türkçe)"
            }},
            {{
                "type": "word_match",
                "question": "Kelimeleri eşleştir",
                "pairs": [{{"romanian": "kelime", "turkish": "karşılık"}}, ...4 çift]
            }},
            {{
                "type": "translation",
                "question": "Çevir: [Türkçe cümle]",
                "correct_answer": "Romence cevap",
                "acceptable_answers": ["Alternatif 1", "Alternatif 2"]
            }},
            {{
                "type": "sentence_complete",
                "question": "Boşluğu doldur: [Romence cümle __ boşlukla]",
                "options": ["Seçenek 1", "Seçenek 2", "Seçenek 3"],
                "correct_answer": "Doğru kelime"
            }},
            {{
                "type": "listening",
                "question": "Dinle ve yaz (ses metni Romence)",
                "audio_text": "Okunacak Romence metin",
                "correct_answer": "Romence cevap"
            }},
            {{
                "type": "speaking",
                "question": "Şu cümleyi Romence söyle: [Türkçe cümle]",
                "correct_answer": "Romence cevap",
                "pronunciation_guide": "Telaffuz rehberi"
            }}
        ]
    }}
    
    Lütfen sadece JSON yanıtı ver, başka açıklama ekleme."""
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    # Parse JSON response
    import json
    try:
        # Remove markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        clean_response = clean_response.strip()
        
        lesson_data = json.loads(clean_response)
        return lesson_data
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Response: {response}")
        raise HTTPException(status_code=500, detail="Failed to generate lesson content")

# Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Romingo API is running"}

# Auth endpoints
@app.post("/api/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = users_collection.find_one({"$or": [
        {"email": user_data.email},
        {"username": user_data.username}
    ]})
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email or username already exists")
    
    # Create new user with Duolingo features
    hashed_pw = hash_password(user_data.password)
    new_user = {
        "username": user_data.username,
        "email": user_data.email,
        "password": hashed_pw,
        "xp": 0,
        "level": 1,
        "streak": 0,
        "gems": 500,  # Starting gems
        "hearts": 5,  # Starting hearts (max 5)
        "max_hearts": 5,
        "last_heart_refill": datetime.utcnow().isoformat(),
        "daily_goal": 50,  # Daily XP goal
        "daily_goal_progress": 0,
        "league": "bronze",  # Starting league
        "league_rank": 0,
        "total_lessons_completed": 0,
        "current_skill_tree_level": 1,
        "friends": [],
        "onboarding_completed": False,  # New users need onboarding
        "last_login": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = users_collection.insert_one(new_user)
    user_id = str(result.inserted_id)
    
    # Initialize shop (first time setup)
    await initialize_shop()
    
    # Create token
    token = create_access_token({"user_id": user_id})
    
    return {
        "message": "User registered successfully",
        "token": token,
        "user": {
            "id": user_id,
            "username": new_user["username"],
            "email": new_user["email"],
            "xp": new_user["xp"],
            "level": new_user["level"],
            "streak": new_user["streak"],
            "gems": new_user["gems"],
            "hearts": new_user["hearts"],
            "daily_goal": new_user["daily_goal"],
            "daily_goal_progress": new_user["daily_goal_progress"],
            "league": new_user["league"]
        }
    }

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = users_collection.find_one({"email": user_data.email})
    
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Update last login
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow().isoformat()}}
    )
    
    # Create token
    token = create_access_token({"user_id": str(user["_id"])})
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 0),
            "last_login": user.get("last_login")
        }
    }

@app.get("/api/user/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "email": current_user["email"],
        "xp": current_user.get("xp", 0),
        "level": current_user.get("level", 1),
        "streak": current_user.get("streak", 0),
        "last_login": current_user.get("last_login"),
        "created_at": current_user.get("created_at")
    }

# Lesson endpoints
@app.get("/api/lessons")
async def get_lessons(current_user: dict = Depends(get_current_user)):
    """Get all lessons with user progress"""
    lessons = list(lessons_collection.find().sort("level", ASCENDING))
    user_id = str(current_user["_id"])
    
    lessons_with_progress = []
    for lesson in lessons:
        progress = user_progress_collection.find_one({
            "user_id": user_id,
            "lesson_id": str(lesson["_id"])
        })
        
        lesson_data = serialize_doc(lesson)
        lesson_data["completed"] = progress.get("completed", False) if progress else False
        lesson_data["score"] = progress.get("score", 0) if progress else 0
        lessons_with_progress.append(lesson_data)
    
    return {"lessons": lessons_with_progress}

@app.post("/api/lessons/generate")
async def create_lesson(lesson_data: LessonCreate, current_user: dict = Depends(get_current_user)):
    """Generate a new lesson using AI"""
    # Check if lesson already exists
    existing_lesson = lessons_collection.find_one({
        "level": lesson_data.level,
        "topic": lesson_data.topic
    })
    
    if existing_lesson:
        return {"message": "Lesson already exists", "lesson": serialize_doc(existing_lesson)}
    
    # Generate lesson content using AI
    try:
        content = await generate_lesson_content(lesson_data.level, lesson_data.topic)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate lesson: {str(e)}")
    
    # Save lesson
    new_lesson = {
        "level": lesson_data.level,
        "topic": lesson_data.topic,
        "title": content.get("title", lesson_data.topic),
        "description": content.get("description", ""),
        "vocabulary": content.get("vocabulary", []),
        "grammar_tip": content.get("grammar_tip", ""),
        "exercises": content.get("exercises", []),
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = lessons_collection.insert_one(new_lesson)
    new_lesson["id"] = str(result.inserted_id)
    del new_lesson["_id"]
    
    return {"message": "Lesson created successfully", "lesson": new_lesson}

@app.get("/api/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific lesson"""
    try:
        lesson = lessons_collection.find_one({"_id": ObjectId(lesson_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid lesson ID")
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return serialize_doc(lesson)

# Exercise endpoints
@app.post("/api/exercises/submit")
async def submit_exercise(submission: ExerciseSubmit, current_user: dict = Depends(get_current_user)):
    """Submit an exercise answer and check if correct"""
    user_id = str(current_user["_id"])
    
    # Get lesson
    try:
        lesson = lessons_collection.find_one({"_id": ObjectId(submission.lesson_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid lesson ID")
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Get exercise
    exercises = lesson.get("exercises", [])
    if submission.exercise_index >= len(exercises):
        raise HTTPException(status_code=400, detail="Invalid exercise index")
    
    exercise = exercises[submission.exercise_index]
    correct_answer = normalize_text(exercise.get("correct_answer", ""))
    user_answer = normalize_text(submission.user_answer)
    
    # Check if answer is correct
    is_correct = False
    similarity_score = get_text_similarity(user_answer, correct_answer)
    feedback_details = {}
    if exercise.get("type") == "translation":
        # Check acceptable answers for translation
        acceptable = [correct_answer] + [normalize_text(ans) for ans in exercise.get("acceptable_answers", [])]
        is_correct = user_answer in acceptable
        feedback_details["similarity"] = round(similarity_score * 100)
    elif exercise.get("type") in ["speaking", "listening"]:
        pronunciation_score = int(similarity_score * 100)
        is_correct = similarity_score >= 0.78
        feedback_details["pronunciation_score"] = pronunciation_score
        feedback_details["evaluation"] = "good" if pronunciation_score >= 90 else "okay" if pronunciation_score >= 78 else "needs_practice"
    else:
        is_correct = user_answer == correct_answer
    
    # Award XP if correct
    xp_earned = 0
    if is_correct:
        xp_earned = 10
        users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"xp": xp_earned}}
        )

    update_mistake_bank(
        user_id=user_id,
        lesson_id=submission.lesson_id,
        exercise_index=submission.exercise_index,
        exercise=exercise,
        user_answer=user_answer,
        is_correct=is_correct,
    )
    
    return {
        "correct": is_correct,
        "correct_answer": exercise.get("correct_answer"),
        "explanation": exercise.get("explanation", ""),
        "xp_earned": xp_earned,
        "feedback_details": feedback_details,
    }

@app.post("/api/lessons/{lesson_id}/complete")
async def complete_lesson(lesson_id: str, score: int, current_user: dict = Depends(get_current_user)):
    """Mark a lesson as complete"""
    user_id = str(current_user["_id"])
    
    # Check if lesson exists
    try:
        lesson = lessons_collection.find_one({"_id": ObjectId(lesson_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid lesson ID")
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Update or create progress
    progress = user_progress_collection.find_one({
        "user_id": user_id,
        "lesson_id": lesson_id
    })
    
    if progress:
        user_progress_collection.update_one(
            {"_id": progress["_id"]},
            {
                "$set": {
                    "completed": True,
                    "score": max(score, progress.get("score", 0)),
                    "completed_at": datetime.utcnow().isoformat()
                },
                "$inc": {"attempts": 1}
            }
        )
    else:
        user_progress_collection.insert_one({
            "user_id": user_id,
            "lesson_id": lesson_id,
            "completed": True,
            "score": score,
            "attempts": 1,
            "completed_at": datetime.utcnow().isoformat()
        })
    
    # Award completion XP
    completion_xp = 50
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"xp": completion_xp}}
    )
    
    return {
        "message": "Lesson completed",
        "xp_earned": completion_xp,
        "total_xp": current_user.get("xp", 0) + completion_xp
    }

# Streak endpoint
@app.post("/api/streak/update")
async def update_streak(current_user: dict = Depends(get_current_user)):
    """Update user's daily streak"""
    user_id = current_user["_id"]
    last_login = current_user.get("last_login")
    
    if last_login:
        last_login_date = datetime.fromisoformat(last_login).date()
        today = datetime.utcnow().date()
        
        # Check if last login was yesterday
        if (today - last_login_date).days == 1:
            # Increment streak
            users_collection.update_one(
                {"_id": user_id},
                {"$inc": {"streak": 1}}
            )
            new_streak = current_user.get("streak", 0) + 1
        elif (today - last_login_date).days > 1:
            # Reset streak
            users_collection.update_one(
                {"_id": user_id},
                {"$set": {"streak": 1}}
            )
            new_streak = 1
        else:
            new_streak = current_user.get("streak", 1)
    else:
        users_collection.update_one(
            {"_id": user_id},
            {"$set": {"streak": 1}}
        )
        new_streak = 1
    
    return {"streak": new_streak}

# Leaderboard endpoint
@app.get("/api/leaderboard")
async def get_leaderboard(limit: int = 50):
    """Get top users by XP"""
    users = list(users_collection.find(
        {},
        {"username": 1, "xp": 1, "level": 1, "streak": 1}
    ).sort("xp", DESCENDING).limit(limit))
    
    leaderboard = []
    for rank, user in enumerate(users, 1):
        leaderboard.append({
            "rank": rank,
            "username": user["username"],
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 0)
        })
    
    return {"leaderboard": leaderboard}

# Achievements endpoint
@app.get("/api/achievements")
async def get_achievements(current_user: dict = Depends(get_current_user)):
    """Get user's achievements"""
    user_id = str(current_user["_id"])
    achievements = list(achievements_collection.find({"user_id": user_id}))
    
    return {
        "achievements": [serialize_doc(ach) for ach in achievements]
    }

@app.post("/api/achievements/check")
async def check_achievements(current_user: dict = Depends(get_current_user)):
    """Check and award new achievements"""
    user_id = str(current_user["_id"])
    user_xp = current_user.get("xp", 0)
    user_streak = current_user.get("streak", 0)
    
    # Get completed lessons count
    completed_count = user_progress_collection.count_documents({
        "user_id": user_id,
        "completed": True
    })
    
    new_achievements = []
    
    # Define achievement criteria
    achievement_types = [
        {"type": "first_lesson", "condition": completed_count >= 1, "name": "İlk Ders!", "icon": "🎯"},
        {"type": "five_lessons", "condition": completed_count >= 5, "name": "Hızlı Başlangıç", "icon": "🚀"},
        {"type": "ten_lessons", "condition": completed_count >= 10, "name": "Kararlı Öğrenci", "icon": "💪"},
        {"type": "streak_3", "condition": user_streak >= 3, "name": "3 Günlük Seri", "icon": "🔥"},
        {"type": "streak_7", "condition": user_streak >= 7, "name": "Haftalık Kahraman", "icon": "⭐"},
        {"type": "xp_100", "condition": user_xp >= 100, "name": "100 XP", "icon": "💯"},
        {"type": "xp_500", "condition": user_xp >= 500, "name": "500 XP Master", "icon": "👑"},
    ]
    
    for ach_type in achievement_types:
        if ach_type["condition"]:
            # Check if already earned
            existing = achievements_collection.find_one({
                "user_id": user_id,
                "badge_type": ach_type["type"]
            })
            
            if not existing:
                # Award new achievement
                new_ach = {
                    "user_id": user_id,
                    "badge_type": ach_type["type"],
                    "name": ach_type["name"],
                    "icon": ach_type["icon"],
                    "earned_at": datetime.utcnow().isoformat()
                }
                result = achievements_collection.insert_one(new_ach)
                # Serialize for response
                new_ach_response = {
                    "id": str(result.inserted_id),
                    "user_id": user_id,
                    "badge_type": ach_type["type"],
                    "name": ach_type["name"],
                    "icon": ach_type["icon"],
                    "earned_at": new_ach["earned_at"]
                }
                new_achievements.append(new_ach_response)
    
    return {
        "new_achievements": new_achievements,
        "message": f"{len(new_achievements)} yeni rozet kazandınız!" if new_achievements else "Yeni rozet yok"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

# Import Duolingo features
from duolingo_features import (
    initialize_shop, refill_hearts_if_needed, deduct_heart,
    update_league_standings, get_league_standings,
    update_daily_goal_progress, get_skill_tree_lessons,
    init_collections
)

# Initialize collections for duolingo features
init_collections(db)

# Shop endpoints
@app.get("/api/shop")
async def get_shop(current_user: dict = Depends(get_current_user)):
    """Get all shop items"""
    await initialize_shop()
    items = list(shop_items_collection.find())
    return {"items": [serialize_doc(item) for item in items]}

@app.post("/api/shop/purchase/{item_id}")
async def purchase_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """Purchase an item from shop"""
    try:
        item = shop_items_collection.find_one({"_id": ObjectId(item_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    user_gems = current_user.get("gems", 0)
    if user_gems < item["price"]:
        raise HTTPException(status_code=400, detail="Not enough gems")
    
    # Deduct gems
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"gems": -item["price"]}}
    )
    
    # Apply item effect
    if item["item_type"] == "heart_refill":
        users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"hearts": current_user.get("max_hearts", 5)}}
        )
    elif item["item_type"] == "streak_freeze":
        user_inventory_collection.insert_one({
            "user_id": str(current_user["_id"]),
            "item_type": "streak_freeze",
            "quantity": 1,
            "purchased_at": datetime.utcnow().isoformat()
        })
    elif item["item_type"] == "xp_boost":
        user_inventory_collection.insert_one({
            "user_id": str(current_user["_id"]),
            "item_type": "xp_boost",
            "active_until": (datetime.utcnow() + timedelta(minutes=15)).isoformat(),
            "purchased_at": datetime.utcnow().isoformat()
        })
    elif item["item_type"] == "heart_increase":
        users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"max_hearts": 1}}
        )
    elif item["item_type"] == "timer_boost":
        user_inventory_collection.insert_one({
            "user_id": str(current_user["_id"]),
            "item_type": "timer_boost",
            "active_until": (datetime.utcnow() + timedelta(minutes=15)).isoformat(),
            "purchased_at": datetime.utcnow().isoformat()
        })
    elif item["item_type"] in ("hint_token", "mistake_shield", "level_skip", "bonus_lesson"):
        user_inventory_collection.insert_one({
            "user_id": str(current_user["_id"]),
            "item_type": item["item_type"],
            "quantity": 1,
            "purchased_at": datetime.utcnow().isoformat()
        })
    
    return {"message": "Purchase successful", "gems_remaining": user_gems - item["price"]}

# Hearts endpoint
@app.post("/api/hearts/refill")
async def refill_hearts(current_user: dict = Depends(get_current_user)):
    """Refill hearts (passive refill check)"""
    new_hearts = await refill_hearts_if_needed(current_user)
    return {"hearts": new_hearts, "max_hearts": current_user.get("max_hearts", 5)}

# League endpoints
@app.get("/api/league/standings")
async def league_standings(current_user: dict = Depends(get_current_user)):
    """Get current league standings"""
    standings = await get_league_standings(str(current_user["_id"]))
    return {
        "league": current_user.get("league", "bronze"),
        "standings": standings
    }

@app.post("/api/league/join")
async def join_league(current_user: dict = Depends(get_current_user)):
    """Join this week's league"""
    await update_league_standings(str(current_user["_id"]))
    return {"message": "Joined league"}

# Daily goal endpoint
@app.get("/api/daily-goal")
async def get_daily_goal(current_user: dict = Depends(get_current_user)):
    """Get daily goal progress"""
    return {
        "goal": current_user.get("daily_goal", 50),
        "progress": current_user.get("daily_goal_progress", 0),
        "completed": current_user.get("daily_goal_progress", 0) >= current_user.get("daily_goal", 50)
    }

# Skill tree endpoint
@app.get("/api/skill-tree")
async def get_skill_tree(current_user: dict = Depends(get_current_user)):
    """Get skill tree (lesson path)"""
    tree = await get_skill_tree_lessons(current_user)
    return {"tree": tree}

# Friends endpoints
@app.get("/api/friends")
async def get_friends(current_user: dict = Depends(get_current_user)):
    """Get user's friends list"""
    friend_ids = current_user.get("friends", [])
    friends = []
    for friend_id in friend_ids:
        friend = users_collection.find_one({"_id": ObjectId(friend_id)})
        if friend:
            friends.append({
                "id": str(friend["_id"]),
                "username": friend["username"],
                "xp": friend.get("xp", 0),
                "streak": friend.get("streak", 0),
                "level": friend.get("level", 1)
            })
    return {"friends": friends}

@app.post("/api/friends/add/{username}")
async def add_friend(username: str, current_user: dict = Depends(get_current_user)):
    """Add a friend by username"""
    friend = users_collection.find_one({"username": username})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    friend_id = str(friend["_id"])
    if friend_id == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    
    if friend_id in current_user.get("friends", []):
        raise HTTPException(status_code=400, detail="Already friends")
    
    # Add to both users' friend lists
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$push": {"friends": friend_id}}
    )
    users_collection.update_one(
        {"_id": friend["_id"]},
        {"$push": {"friends": str(current_user["_id"])}}
    )
    
    return {"message": f"Added {username} as friend"}

@app.delete("/api/friends/remove/{friend_id}")
async def remove_friend(friend_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a friend"""
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$pull": {"friends": friend_id}}
    )
    users_collection.update_one(
        {"_id": ObjectId(friend_id)},
        {"$pull": {"friends": str(current_user["_id"])}}
    )
    return {"message": "Friend removed"}


# Stories endpoints
@app.get("/api/stories")
async def get_stories(current_user: dict = Depends(get_current_user)):
    """Get available stories"""
    stories = list(stories_collection.find().sort("level", ASCENDING))
    user_id = str(current_user["_id"])
    
    stories_with_progress = []
    for story in stories:
        progress = user_progress_collection.find_one({
            "user_id": user_id,
            "story_id": str(story["_id"])
        })
        
        story_data = serialize_doc(story)
        story_data["completed"] = progress.get("completed", False) if progress else False
        stories_with_progress.append(story_data)
    
    return {"stories": stories_with_progress}

@app.post("/api/stories/generate")
async def generate_story(level: int, current_user: dict = Depends(get_current_user)):
    """Generate a new story using AI"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"story_gen_{level}",
        system_message="""Sen Türk kullanıcılara Romence öğreten bir hikaye yazarısın. 
        İnteraktif hikayeler oluşturuyorsun. Her hikaye:
        1. Kısa paragraflar halinde (3-5 paragraf)
        2. Her paragrafta anlama soruları
        3. Romence kelimeler ve Türkçe karşılıkları
        Yanıtını JSON formatında ver."""
    ).with_model("openai", "gpt-5.2")
    
    topics = ["Restoran", "Alışveriş", "Havaalanı", "Otel", "Park", "Müze", "Kafe"]
    topic = topics[level % len(topics)]
    
    prompt = f"""Level {level} için "{topic}" konusunda interaktif bir Romence hikaye oluştur.
    Hikaye şu yapıda olmalı:
    {{
        "title": "Hikaye başlığı (Türkçe)",
        "level": {level},
        "topic": "{topic}",
        "parts": [
            {{
                "text": "Hikaye metni (Türkçe + Romence kelimeler)",
                "question": "Anlama sorusu (Türkçe)",
                "options": ["Seçenek 1", "Seçenek 2", "Seçenek 3"],
                "correct_answer": 0,
                "explanation": "Açıklama"
            }},
            ...3-4 bölüm
        ],
        "vocabulary": [
            {{"romanian": "kelime", "turkish": "karşılık"}},
            ...5-8 kelime
        ]
    }}
    
    Lütfen sadece JSON yanıtı ver."""
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    import json
    try:
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        clean_response = clean_response.strip()
        
        story_data = json.loads(clean_response)
        story_data["created_at"] = datetime.utcnow().isoformat()
        
        result = stories_collection.insert_one(story_data)
        story_data["id"] = str(result.inserted_id)
        del story_data["_id"]
        
        return {"message": "Story created", "story": story_data}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail="Failed to generate story")

@app.get("/api/stories/{story_id}")
async def get_story(story_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific story"""
    try:
        story = stories_collection.find_one({"_id": ObjectId(story_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid story ID")
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return serialize_doc(story)

@app.post("/api/stories/{story_id}/complete")
async def complete_story(story_id: str, score: int, current_user: dict = Depends(get_current_user)):
    """Mark story as complete"""
    user_id = str(current_user["_id"])
    
    user_progress_collection.update_one(
        {"user_id": user_id, "story_id": story_id},
        {
            "$set": {
                "completed": True,
                "score": score,
                "completed_at": datetime.utcnow().isoformat()
            }
        },
        upsert=True
    )
    
    # Award XP
    xp_earned = 30
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"xp": xp_earned}}
    )
    
    return {"message": "Story completed", "xp_earned": xp_earned}

# Practice endpoints
@app.get("/api/practice/mistakes")
async def get_practice_mistakes(current_user: dict = Depends(get_current_user)):
    """Get questions user got wrong for practice"""
    user_id = str(current_user["_id"])
    
    # Find lessons with low scores or incomplete
    poor_progress = list(user_progress_collection.find({
        "user_id": user_id,
        "$or": [
            {"score": {"$lt": 80}},
            {"completed": False}
        ]
    }).limit(10))
    
    practice_lessons = []
    for progress in poor_progress:
        lesson_id = progress.get("lesson_id")
        try:
            lesson = lessons_collection.find_one({"_id": ObjectId(lesson_id)})
            if lesson:
                practice_lessons.append({
                    "lesson_id": lesson_id,
                    "title": lesson.get("title"),
                    "score": progress.get("score", 0),
                    "exercises_count": len(lesson.get("exercises", []))
                })
        except:
            continue
    
    now_iso = datetime.utcnow().isoformat()
    due_reviews = list(mistakes_collection.find({
        "user_id": user_id,
        "next_review_at": {"$lte": now_iso}
    }).sort("next_review_at", ASCENDING).limit(30))

    return {
        "practice_lessons": practice_lessons,
        "due_reviews": [
            {
                "lesson_id": item.get("lesson_id"),
                "exercise_index": item.get("exercise_index"),
                "question": item.get("question"),
                "error_type": item.get("error_type"),
                "exercise_type": item.get("exercise_type"),
                "mistake_count": item.get("mistake_count", 0),
                "next_review_at": item.get("next_review_at"),
            }
            for item in due_reviews
        ],
    }

@app.post("/api/practice/session")
async def create_practice_session(current_user: dict = Depends(get_current_user)):
    """Create a practice session with mixed questions"""
    user_id = str(current_user["_id"])
    
    # 1) Prioritize SRS queue items due now
    now_iso = datetime.utcnow().isoformat()
    due_reviews = list(mistakes_collection.find({
        "user_id": user_id,
        "next_review_at": {"$lte": now_iso}
    }).sort("next_review_at", ASCENDING).limit(10))

    adaptive_type_boost = {}
    for item in due_reviews:
        error_type = item.get("error_type", "general")
        adaptive_type_boost[error_type] = adaptive_type_boost.get(error_type, 0) + 1

    # 2) Get weak areas
    poor_progress = list(user_progress_collection.find({
        "user_id": user_id,
        "score": {"$lt": 80}
    }).limit(5))
    
    all_exercises = []
    for progress in poor_progress:
        lesson_id = progress.get("lesson_id")
        try:
            lesson = lessons_collection.find_one({"_id": ObjectId(lesson_id)})
            if lesson:
                exercises = lesson.get("exercises", [])
                preferred_types = sorted(adaptive_type_boost.items(), key=lambda x: x[1], reverse=True)

                if preferred_types:
                    ranked_exercises = sorted(
                        exercises,
                        key=lambda ex: 0 if detect_error_type(ex) == preferred_types[0][0] else 1
                    )
                else:
                    ranked_exercises = exercises

                for ex in ranked_exercises[:2]:  # Take 2 exercises per weak lesson
                    ex["lesson_id"] = lesson_id
                    ex["lesson_title"] = lesson.get("title")
                    all_exercises.append(ex)
        except:
            continue
    
    # Shuffle exercises
    import random
    random.shuffle(all_exercises)
    
    due_review_exercises = []
    for review in due_reviews:
        try:
            lesson = lessons_collection.find_one({"_id": ObjectId(review.get("lesson_id"))})
            if not lesson:
                continue
            exercises = lesson.get("exercises", [])
            ex_index = review.get("exercise_index", 0)
            if ex_index >= len(exercises):
                continue
            ex = exercises[ex_index]
            ex["lesson_id"] = review.get("lesson_id")
            ex["lesson_title"] = lesson.get("title")
            ex["review_reason"] = review.get("error_type")
            due_review_exercises.append(ex)
        except:
            continue

    mixed = (due_review_exercises + all_exercises)[:10]

    return {
        "exercises": mixed,
        "total": len(mixed),
        "adaptive_focus": adaptive_type_boost,
        "srs_due_count": len(due_review_exercises),
    }

@app.get("/api/practice/review-queue")
async def get_review_queue(current_user: dict = Depends(get_current_user)):
    """SRS tekrar kuyruğunu getirir (1g/3g/7g/14g/30g)."""
    user_id = str(current_user["_id"])
    now_iso = datetime.utcnow().isoformat()
    queue = list(mistakes_collection.find({
        "user_id": user_id
    }).sort("next_review_at", ASCENDING).limit(50))

    due = [item for item in queue if item.get("next_review_at", now_iso) <= now_iso]

    return {
        "due_now": len(due),
        "total_tracked": len(queue),
        "queue": [
            {
                "lesson_id": item.get("lesson_id"),
                "exercise_index": item.get("exercise_index"),
                "question": item.get("question"),
                "error_type": item.get("error_type"),
                "exercise_type": item.get("exercise_type"),
                "mistake_count": item.get("mistake_count", 0),
                "repetition_count": item.get("repetition_count", 0),
                "next_review_at": item.get("next_review_at"),
                "status": "due" if item.get("next_review_at", now_iso) <= now_iso else "scheduled",
            }
            for item in queue
        ]
    }


# User preferences endpoint
@app.post("/api/user/update-preferences")
async def update_preferences(
    reason: str = None,
    daily_goal: int = None,
    experience_level: str = None,
    onboarding_completed: bool = None,
    current_user: dict = Depends(get_current_user)
):
    """Update user preferences"""
    update_data = {}
    if reason:
        update_data["learning_reason"] = reason
    if daily_goal:
        update_data["daily_goal"] = daily_goal
    if experience_level:
        update_data["experience_level"] = experience_level
    if onboarding_completed is not None:
        update_data["onboarding_completed"] = onboarding_completed
    
    if update_data:
        users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_data}
        )
    
    return {"message": "Preferences updated", "updated": update_data}
