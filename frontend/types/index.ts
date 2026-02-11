export interface User {
  id: string;
  username: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  last_login?: string;
  created_at?: string;
}

export interface Lesson {
  id: string;
  level: number;
  topic: string;
  title: string;
  description: string;
  vocabulary: VocabularyItem[];
  grammar_tip: string;
  exercises: Exercise[];
  completed?: boolean;
  score?: number;
}

export interface VocabularyItem {
  romanian: string;
  turkish: string;
  pronunciation: string;
}

export interface Exercise {
  type: 'multiple_choice' | 'word_match' | 'translation' | 'sentence_complete' | 'listening' | 'speaking';
  question: string;
  options?: string[];
  pairs?: { romanian: string; turkish: string }[];
  correct_answer: string;
  acceptable_answers?: string[];
  explanation?: string;
  audio_text?: string;
  pronunciation_guide?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  xp: number;
  level: number;
  streak: number;
}

export interface Achievement {
  id: string;
  badge_type: string;
  name: string;
  icon: string;
  earned_at: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
