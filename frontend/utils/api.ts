import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Lesson, LeaderboardEntry, Achievement, AuthResponse } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const api = {
  // Auth
  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    return response.json();
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    return response.json();
  },

  getProfile: async (): Promise<User> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/user/profile`, { headers });
    if (!response.ok) throw new Error('Failed to get profile');
    return response.json();
  },

  // Lessons
  getLessons: async (): Promise<{ lessons: Lesson[] }> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/lessons`, { headers });
    if (!response.ok) throw new Error('Failed to get lessons');
    return response.json();
  },

  getLesson: async (lessonId: string): Promise<Lesson> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/lessons/${lessonId}`, { headers });
    if (!response.ok) throw new Error('Failed to get lesson');
    return response.json();
  },

  generateLesson: async (level: number, topic: string): Promise<{ lesson: Lesson }> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/lessons/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ level, topic }),
    });
    if (!response.ok) throw new Error('Failed to generate lesson');
    return response.json();
  },

  completeLesson: async (lessonId: string, score: number): Promise<any> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/lessons/${lessonId}/complete?score=${score}`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to complete lesson');
    return response.json();
  },

  // Exercises
  submitExercise: async (lessonId: string, exerciseIndex: number, userAnswer: string): Promise<any> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/exercises/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ lesson_id: lessonId, exercise_index: exerciseIndex, user_answer: userAnswer }),
    });
    if (!response.ok) throw new Error('Failed to submit exercise');
    return response.json();
  },

  // Streak
  updateStreak: async (): Promise<{ streak: number }> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/streak/update`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to update streak');
    return response.json();
  },

  // Leaderboard
  getLeaderboard: async (): Promise<{ leaderboard: LeaderboardEntry[] }> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/leaderboard`, { headers });
    if (!response.ok) throw new Error('Failed to get leaderboard');
    return response.json();
  },

  // Achievements
  getAchievements: async (): Promise<{ achievements: Achievement[] }> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/achievements`, { headers });
    if (!response.ok) throw new Error('Failed to get achievements');
    return response.json();
  },

  checkAchievements: async (): Promise<any> => {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_URL}/api/achievements/check`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to check achievements');
    return response.json();
  },
};
