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
    correct_answer = exercise.get("correct_answer", "").lower().strip()
    user_answer = submission.user_answer.lower().strip()
    
    # Check if answer is correct
    is_correct = False
    if exercise.get("type") == "translation":
        # Check acceptable answers for translation
        acceptable = [correct_answer] + [ans.lower().strip() for ans in exercise.get("acceptable_answers", [])]
        is_correct = user_answer in acceptable
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
    
    return {
        "correct": is_correct,
        "correct_answer": exercise.get("correct_answer"),
        "explanation": exercise.get("explanation", ""),
        "xp_earned": xp_earned
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
