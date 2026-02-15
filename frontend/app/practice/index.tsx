import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { Button } from '../../components/Button';
import { UserStatsHeader } from '../../components/UserStatsHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

interface PracticeLesson {
  lesson_id: string;
  title: string;
  score: number;
  exercises_count: number;
}

interface DueReview {
  lesson_id: string;
  exercise_index: number;
  question: string;
  error_type: string;
  exercise_type: string;
  mistake_count: number;
  next_review_at: string;
}

export default function Practice() {
  const { user } = useAuth();
  const [mistakes, setMistakes] = useState<PracticeLesson[]>([]);
  const [startingPractice, setStartingPractice] = useState(false);
  const [dueReviews, setDueReviews] = useState<DueReview[]>([]);
  const [reviewQueueStats, setReviewQueueStats] = useState<{due_now: number; total_tracked: number}>({ due_now: 0, total_tracked: 0 });
  const router = useRouter();

  useEffect(() => {
    loadMistakes();
  }, []);

  const loadMistakes = async () => {
    try {
      const [data, queue] = await Promise.all([api.getPracticeMistakes(), api.getReviewQueue()]);
      setMistakes(data.practice_lessons || []);
      setDueReviews(data.due_reviews || []);
      setReviewQueueStats({ due_now: queue.due_now || 0, total_tracked: queue.total_tracked || 0 });
    } catch (error) {
      console.error('Failed to load practice mistakes:', error);
    }
  };

  const startPracticeSession = async () => {
    setStartingPractice(true);
    try {
      const session = await api.createPracticeSession();
      
      if (session.exercises.length === 0) {
        Alert.alert('Harika!', 'Tekrar yapman gereken zayıf konu yok! Devam et!');
        setStartingPractice(false);
        return;
      }

      // Navigate to practice session (would need a new screen)
      Alert.alert(
        'Pratik Başlıyor!',
        `${session.total} soru ile pratik yapmaya başlıyorsun! (${session.srs_due_count || 0} soru SRS tekrar kuyruğundan)`,
        [
          { text: 'Tamam', onPress: () => {
            // TODO: Navigate to practice session screen
            setStartingPractice(false);
          }}
        ]
      );
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Pratik oturumu başlatılamadı');
    } finally {
      setStartingPractice(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎯 Tekrar Pratiği</Text>
        <UserStatsHeader
          hearts={user.hearts}
          maxHearts={user.max_hearts}
          gems={user.gems}
          streak={user.streak}
        />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#FF6B35', '#FF8C42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <MaterialCommunityIcons name="target" size={60} color="white" />
            <Text style={styles.heroTitle}>Zayıf Konularını Güçlendir</Text>
            <Text style={styles.heroSubtitle}>
              Yanlış yaptığın soruları tekrar ederek öğrenmeyi pekiştir
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧠 Yanlışlarım & SRS Takvimi</Text>
          <View style={styles.srsSummary}>
            <Text style={styles.srsSummaryText}>Bugün tekrar: {reviewQueueStats.due_now}</Text>
            <Text style={styles.srsSummarySubtext}>Takip edilen toplam yanlış: {reviewQueueStats.total_tracked}</Text>
          </View>

          {dueReviews.length > 0 ? (
            <View style={styles.srsList}>
              {dueReviews.slice(0, 5).map((item, index) => (
                <View key={`${item.lesson_id}-${item.exercise_index}-${index}`} style={styles.srsCard}>
                  <View style={styles.srsTag}>
                    <Text style={styles.srsTagText}>{item.error_type}</Text>
                  </View>
                  <Text style={styles.srsQuestion} numberOfLines={2}>{item.question}</Text>
                  <Text style={styles.srsMeta}>Yanlış sayısı: {item.mistake_count} • Plan: 1g → 3g → 7g</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.srsEmpty}>Bugün planlı tekrarın yok. Süper gidiyorsun! ✨</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 İyileştirme Gereken Dersler</Text>

          {mistakes.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="trophy" size={60} color={Colors.primary} />
              <Text style={styles.emptyText}>Tebrikler!</Text>
              <Text style={styles.emptySubtext}>
                Tüm derslerde iyi performans gösteriyorsun!
              </Text>
            </View>
          ) : (
            <View style={styles.mistakesList}>
              {mistakes.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mistakeCard}
                  onPress={() => router.push(`/lesson/${item.lesson_id}`)}
                >
                  <View style={styles.mistakeHeader}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={32}
                      color={item.score < 50 ? '#FF4B4B' : '#FFA500'}
                    />
                    <View style={styles.mistakeInfo}>
                      <Text style={styles.mistakeTitle}>{item.title}</Text>
                      <Text style={styles.mistakeScore}>Skor: {item.score}%</Text>
                    </View>
                  </View>
                  <View style={styles.mistakeFooter}>
                    <Text style={styles.exerciseCount}>
                      {item.exercises_count} alıştırma
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textLight} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {mistakes.length > 0 && (
          <View style={styles.actionSection}>
            <Button
              title="Pratik Oturumu Başlat"
              onPress={startPracticeSession}
              loading={startingPractice}
              variant="success"
              fullWidth
            />
            <Text style={styles.actionHint}>
              💡 Karışık 10 soru ile zayıf konularını pekiştir
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  heroGradient: {
    padding: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  mistakesList: {
    gap: 12,
  },
  mistakeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mistakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mistakeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mistakeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  mistakeScore: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  mistakeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  srsSummary: {
    backgroundColor: '#EEF7FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  srsSummaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  srsSummarySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  srsList: {
    gap: 10,
  },
  srsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
  },
  srsTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE7D0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  srsTagText: {
    color: '#B35B00',
    fontWeight: '700',
    fontSize: 12,
  },
  srsQuestion: {
    color: Colors.text,
    fontWeight: '600',
  },
  srsMeta: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  srsEmpty: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  actionSection: {
    marginTop: 8,
  },
  actionHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
});
