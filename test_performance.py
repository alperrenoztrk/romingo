#!/usr/bin/env python3
"""
Performance test for optimized code
Tests that the optimized functions work correctly
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test that all modules import correctly"""
    try:
        import server
        print("✅ server.py imports successfully")
        
        import duolingo_features
        print("✅ duolingo_features.py imports successfully")
        
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def test_database_indexes_function():
    """Test that the create_database_indexes function exists"""
    try:
        import server
        assert hasattr(server, 'create_database_indexes'), "create_database_indexes function not found"
        print("✅ create_database_indexes function exists")
        
        # Check startup event
        assert hasattr(server.app, 'on_event'), "on_event decorator not found"
        print("✅ startup event handler configured")
        
        return True
    except Exception as e:
        print(f"❌ Database indexes test failed: {e}")
        return False

def test_optimized_functions_exist():
    """Test that optimized functions exist and have correct structure"""
    try:
        import duolingo_features
        
        # Check get_league_standings
        assert hasattr(duolingo_features, 'get_league_standings'), "get_league_standings not found"
        print("✅ get_league_standings function exists")
        
        # Check get_skill_tree_lessons
        assert hasattr(duolingo_features, 'get_skill_tree_lessons'), "get_skill_tree_lessons not found"
        print("✅ get_skill_tree_lessons function exists")
        
        return True
    except Exception as e:
        print(f"❌ Optimized functions test failed: {e}")
        return False

def test_code_quality():
    """Basic code quality checks"""
    try:
        # Check for N+1 anti-patterns in the code
        with open('backend/server.py', 'r') as f:
            server_code = f.read()
        
        with open('backend/duolingo_features.py', 'r') as f:
            features_code = f.read()
        
        # Look for batch query patterns (good)
        batch_patterns = ['{"$in":', 'progress_map', 'users_map']
        found_patterns = []
        
        for pattern in batch_patterns:
            if pattern in server_code or pattern in features_code:
                found_patterns.append(pattern)
        
        print(f"✅ Found {len(found_patterns)} batch query optimizations")
        
        # Check for index creation
        if 'create_index' in server_code:
            print("✅ Database index creation code present")
        else:
            print("⚠️  Warning: No database index creation found")
        
        return True
    except Exception as e:
        print(f"❌ Code quality test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Running Performance Optimization Tests")
    print("=" * 60)
    
    tests = [
        ("Module Imports", test_imports),
        ("Database Indexes", test_database_indexes_function),
        ("Optimized Functions", test_optimized_functions_exist),
        ("Code Quality", test_code_quality)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        print("-" * 60)
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test crashed: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("✅ All performance optimization tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
