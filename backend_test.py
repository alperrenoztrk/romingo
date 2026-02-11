#!/usr/bin/env python3
"""
Romingo Backend API Test Suite
Tests all critical endpoints for the Duolingo-like Romanian language learning app
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://romingo-fluent.preview.emergentagent.com/api"

class RomingoAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        self.test_results = {}
        
        # Test user data
        self.test_user = {
            "username": "testuser_romana",
            "email": "test.romania@example.com", 
            "password": "testpass123"
        }
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results"""
        print(f"\n{'✅' if success else '❌'} {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
            
        self.test_results[test_name] = {
            "success": success,
            "details": details,
            "error": error
        }
        
    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, f"Status: {data.get('message', 'OK')}")
                    return True
                else:
                    self.log_test("Health Check", False, "", "Status not healthy")
                    return False
            else:
                self.log_test("Health Check", False, "", f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, "", str(e))
            return False
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        try:
            # First try to register a new user
            response = self.session.post(
                f"{self.base_url}/auth/register",
                json=self.test_user
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.token = data["token"]
                    self.user_data = data["user"]
                    self.log_test("User Registration", True, 
                                f"User ID: {data['user']['id']}, Token received")
                    return True
                else:
                    self.log_test("User Registration", False, "", "Missing token or user data")
                    return False
            elif response.status_code == 400:
                # User might already exist, try login instead
                self.log_test("User Registration", True, 
                            "User already exists (expected behavior)", "")
                return self.test_user_login()
            else:
                self.log_test("User Registration", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Registration", False, "", str(e))
            return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        try:
            login_data = {
                "email": self.test_user["email"],
                "password": self.test_user["password"]
            }
            
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.token = data["token"]
                    self.user_data = data["user"]
                    self.log_test("User Login", True, 
                                f"User: {data['user']['username']}, XP: {data['user']['xp']}")
                    return True
                else:
                    self.log_test("User Login", False, "", "Missing token or user data")
                    return False
            else:
                self.log_test("User Login", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, "", str(e))
            return False
    
    def test_user_profile(self):
        """Test user profile endpoint with authentication"""
        if not self.token:
            self.log_test("User Profile", False, "", "No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(f"{self.base_url}/user/profile", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "username", "email", "xp", "level", "streak"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("User Profile", True, 
                                f"Profile: {data['username']}, Level: {data['level']}, XP: {data['xp']}")
                    return True
                else:
                    self.log_test("User Profile", False, "", f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("User Profile", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Profile", False, "", str(e))
            return False
    
    def test_get_lessons(self):
        """Test getting lessons list"""
        if not self.token:
            self.log_test("Get Lessons", False, "", "No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(f"{self.base_url}/lessons", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "lessons" in data and isinstance(data["lessons"], list):
                    lesson_count = len(data["lessons"])
                    self.log_test("Get Lessons", True, 
                                f"Retrieved {lesson_count} lessons")
                    return True
                else:
                    self.log_test("Get Lessons", False, "", "Invalid response format")
                    return False
            else:
                self.log_test("Get Lessons", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Lessons", False, "", str(e))
            return False
    
    def test_generate_lesson(self):
        """Test AI lesson generation - critical for OpenAI integration"""
        if not self.token:
            self.log_test("Generate AI Lesson", False, "", "No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            lesson_data = {
                "level": 1,
                "topic": "Selamlaşma ve Tanışma"  # Greetings and Introductions
            }
            
            print("\n🤖 Testing AI lesson generation (OpenAI GPT-5.2 integration)...")
            response = self.session.post(
                f"{self.base_url}/lessons/generate",
                json=lesson_data,
                headers=headers,
                timeout=30  # AI generation might take time
            )
            
            if response.status_code == 200:
                data = response.json()
                if "lesson" in data:
                    lesson = data["lesson"]
                    required_fields = ["title", "vocabulary", "exercises"]
                    missing_fields = [field for field in required_fields if field not in lesson]
                    
                    if not missing_fields:
                        vocab_count = len(lesson.get("vocabulary", []))
                        exercise_count = len(lesson.get("exercises", []))
                        self.lesson_id = lesson.get("id")  # Store for further tests
                        
                        self.log_test("Generate AI Lesson", True, 
                                    f"Title: '{lesson['title']}', Vocab: {vocab_count}, Exercises: {exercise_count}")
                        return True
                    else:
                        self.log_test("Generate AI Lesson", False, "", 
                                    f"Missing lesson fields: {missing_fields}")
                        return False
                else:
                    self.log_test("Generate AI Lesson", False, "", "No lesson in response")
                    return False
            else:
                self.log_test("Generate AI Lesson", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Generate AI Lesson", False, "", str(e))
            return False
    
    def test_get_specific_lesson(self):
        """Test getting a specific lesson by ID"""
        if not self.token:
            self.log_test("Get Specific Lesson", False, "", "No authentication token")
            return False
        
        if not hasattr(self, 'lesson_id') or not self.lesson_id:
            self.log_test("Get Specific Lesson", False, "", "No lesson ID available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(
                f"{self.base_url}/lessons/{self.lesson_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                lesson = response.json()
                if lesson.get("id") == self.lesson_id:
                    self.log_test("Get Specific Lesson", True, 
                                f"Retrieved lesson: {lesson.get('title', 'Untitled')}")
                    return True
                else:
                    self.log_test("Get Specific Lesson", False, "", "ID mismatch")
                    return False
            else:
                self.log_test("Get Specific Lesson", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Specific Lesson", False, "", str(e))
            return False
    
    def test_submit_exercise(self):
        """Test exercise submission"""
        if not self.token:
            self.log_test("Submit Exercise", False, "", "No authentication token")
            return False
        
        if not hasattr(self, 'lesson_id') or not self.lesson_id:
            self.log_test("Submit Exercise", False, "", "No lesson ID available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # Submit a test exercise answer
            exercise_data = {
                "lesson_id": self.lesson_id,
                "exercise_index": 0,
                "user_answer": "test answer"
            }
            
            response = self.session.post(
                f"{self.base_url}/exercises/submit",
                json=exercise_data,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["correct", "correct_answer", "xp_earned"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    correct = data["correct"]
                    xp = data["xp_earned"]
                    self.log_test("Submit Exercise", True, 
                                f"Answer: {'correct' if correct else 'incorrect'}, XP: {xp}")
                    return True
                else:
                    self.log_test("Submit Exercise", False, "", f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Submit Exercise", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Submit Exercise", False, "", str(e))
            return False
    
    def test_complete_lesson(self):
        """Test lesson completion"""
        if not self.token:
            self.log_test("Complete Lesson", False, "", "No authentication token")
            return False
        
        if not hasattr(self, 'lesson_id') or not self.lesson_id:
            self.log_test("Complete Lesson", False, "", "No lesson ID available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            response = self.session.post(
                f"{self.base_url}/lessons/{self.lesson_id}/complete?score=85",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if "xp_earned" in data and "total_xp" in data:
                    xp_earned = data["xp_earned"]
                    total_xp = data["total_xp"]
                    self.log_test("Complete Lesson", True, 
                                f"XP earned: {xp_earned}, Total XP: {total_xp}")
                    return True
                else:
                    self.log_test("Complete Lesson", False, "", "Missing XP data")
                    return False
            else:
                self.log_test("Complete Lesson", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Complete Lesson", False, "", str(e))
            return False
    
    def test_update_streak(self):
        """Test streak update"""
        if not self.token:
            self.log_test("Update Streak", False, "", "No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.post(f"{self.base_url}/streak/update", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "streak" in data:
                    streak = data["streak"]
                    self.log_test("Update Streak", True, f"Current streak: {streak} days")
                    return True
                else:
                    self.log_test("Update Streak", False, "", "Missing streak data")
                    return False
            else:
                self.log_test("Update Streak", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update Streak", False, "", str(e))
            return False
    
    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/leaderboard")
            
            if response.status_code == 200:
                data = response.json()
                if "leaderboard" in data and isinstance(data["leaderboard"], list):
                    count = len(data["leaderboard"])
                    self.log_test("Leaderboard", True, f"Retrieved {count} leaderboard entries")
                    return True
                else:
                    self.log_test("Leaderboard", False, "", "Invalid leaderboard format")
                    return False
            else:
                self.log_test("Leaderboard", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Leaderboard", False, "", str(e))
            return False
    
    def test_get_achievements(self):
        """Test getting user achievements"""
        if not self.token:
            self.log_test("Get Achievements", False, "", "No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(f"{self.base_url}/achievements", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "achievements" in data and isinstance(data["achievements"], list):
                    count = len(data["achievements"])
                    self.log_test("Get Achievements", True, f"User has {count} achievements")
                    return True
                else:
                    self.log_test("Get Achievements", False, "", "Invalid achievements format")
                    return False
            else:
                self.log_test("Get Achievements", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Achievements", False, "", str(e))
            return False
    
    def test_check_achievements(self):
        """Test achievement checking and awarding"""
        if not self.token:
            self.log_test("Check Achievements", False, "", "No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.post(f"{self.base_url}/achievements/check", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "new_achievements" in data and "message" in data:
                    new_count = len(data["new_achievements"])
                    message = data["message"]
                    self.log_test("Check Achievements", True, 
                                f"New achievements: {new_count}, Message: {message}")
                    return True
                else:
                    self.log_test("Check Achievements", False, "", "Missing achievement data")
                    return False
            else:
                self.log_test("Check Achievements", False, "", 
                            f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Check Achievements", False, "", str(e))
            return False
    
    def run_all_tests(self):
        """Run all test cases in sequence"""
        print("🚀 Starting Romingo Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("="*60)
        
        # Test order is important - some tests depend on previous ones
        tests = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_user_profile,
            self.test_get_lessons,
            self.test_generate_lesson,  # Tests OpenAI integration
            self.test_get_specific_lesson,
            self.test_submit_exercise,
            self.test_complete_lesson,
            self.test_update_streak,
            self.test_leaderboard,
            self.test_get_achievements,
            self.test_check_achievements
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"\n❌ Test {test.__name__} crashed: {str(e)}")
                failed += 1
        
        print("\n" + "="*60)
        print(f"📊 Test Results: {passed} passed, {failed} failed")
        
        # Print summary of critical issues
        critical_failures = []
        for test_name, result in self.test_results.items():
            if not result["success"] and any(keyword in test_name.lower() for keyword in 
                                           ["health", "login", "register", "generate", "profile"]):
                critical_failures.append(f"{test_name}: {result['error']}")
        
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for failure in critical_failures:
                print(f"   • {failure}")
        else:
            print("\n✅ All critical systems operational!")
        
        return passed, failed, self.test_results

def main():
    """Main test execution"""
    tester = RomingoAPITester()
    passed, failed, results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()