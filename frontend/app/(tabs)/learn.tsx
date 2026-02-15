import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { UserStatsHeader } from '../../components/UserStatsHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

interface SkillTreeLesson {
  id: string;
  title: string;
  level: number;
  is_unlocked: boolean;
  is_completed: boolean;
  stars: number;
  description: string;
}

export default function Learn() {
  const { user } = useAuth();
  const [tree, setTree] = useState<SkillTreeLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSkillTree();
  }, []);

  const loadSkillTree = async () => {
    try {
      const data = await api.getSkillTree();
      setTree(data.tree || []);
    } catch (error) {
      console.error('Failed to load skill tree:', error);
      // Fallback to lessons API
      try {
        const lessonsData = await api.getLessons();
        setTree(lessonsData.lessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          level: l.level,
          is_unlocked: true,
          is_completed: l.completed,
          stars: Math.floor((l.score || 0) / 20),
          description: l.description
        })));
      } catch (err) {
        console.error('Fallback failed:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSkillTree();
    setRefreshing(false);
  };

  const handleLessonPress = (lesson: SkillTreeLesson) => {
    if (!lesson.is_unlocked) {
      Alert.alert('Kilitli', 'Önce önceki dersleri tamamlamalısın!');
      return;
    }
    router.push(`/lesson/${lesson.id}`);
  };

  const renderStars = (stars: number) => {
    return (
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, i) => (
          <MaterialCommunityIcons
            key={i}
            name={i < stars ? 'star' : 'star-outline'}
            size={16}
            color={i < stars ? '#FFD700' : '#E0E0E0'}
          />
        ))}
      </View>
    );
  };

  const renderLesson = (lesson: SkillTreeLesson, index: number) => {
    const isLeft = index % 2 === 0;
    const isCheckpoint = (index + 1) % 5 === 0;

    return (
      <View key={lesson.id}>
        {/* Checkpoint */}
        {isCheckpoint && index !== 0 && (
          <View style={styles.checkpointContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.checkpoint}
            >
              <MaterialCommunityIcons name="trophy-variant" size={32} color="white" />
              <Text style={styles.checkpointText}>Kontrol Noktası {Math.floor((index + 1) / 5)}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Lesson */}
        <View style={[styles.lessonRow, isLeft ? styles.lessonLeft : styles.lessonRight]}>
          {isLeft && <View style={styles.spacer} />}
          
          <TouchableOpacity
            style={[
              styles.lessonNode,
              !lesson.is_unlocked && styles.lockedNode,
              lesson.is_completed && styles.completedNode,
            ]}
            onPress={() => handleLessonPress(lesson)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                lesson.is_completed
                  ? ['#58CC02', '#4CAF00']
                  : lesson.is_unlocked
                  ? ['#1CB0F6', '#1899D6']
                  : ['#E0E0E0', '#BDBDBD']
              }
              style={styles.lessonGradient}
            >
              <MaterialCommunityIcons
                name={
                  lesson.is_completed
                    ? 'check-circle'
                    : lesson.is_unlocked
                    ? 'book-open-variant'
                    : 'lock'
                }
                size={40}
                color="white"
              />
            </LinearGradient>

            <View style={styles.lessonInfo}>
              <Text style={styles.lessonLevel}>Level {lesson.level}</Text>
              <Text style={styles.lessonTitle} numberOfLines={2}>
                {lesson.title}
              </Text>
              {lesson.is_completed && renderStars(lesson.stars)}
            </View>
          </TouchableOpacity>

          {!isLeft && <View style={styles.spacer} />}
        </View>

        {/* Path connector */}
        {index < tree.length - 1 && (
          <View style={styles.pathConnector}>
            <View style={styles.pathLine} />
          </View>
        )}
      </View>
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌳 Öğrenme Yolu</Text>
        <UserStatsHeader
          hearts={user.hearts}
          maxHearts={user.max_hearts}
          gems={user.gems}
          streak={user.streak}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {tree.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="tree" size={80} color={Colors.textLight} />
            <Text style={styles.emptyText}>Henüz ders yok</Text>
            <Text style={styles.emptySubtext}>Dersler yakında burada görünecek</Text>
          </View>
        ) : (
          <View style={styles.tree}>
            {tree.map((lesson, index) => renderLesson(lesson, index))}
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
    paddingVertical: 24,
  },
  tree: {
    paddingHorizontal: 16,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  lessonLeft: {
    justifyContent: 'flex-start',
  },
  lessonRight: {
    justifyContent: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  lessonNode: {
    alignItems: 'center',
    width: 160,
  },
  lessonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lockedNode: {
    opacity: 0.6,
  },
  completedNode: {
    // Add shine effect
  },
  lessonInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  lessonLevel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 2,
  },
  pathConnector: {
    alignItems: 'center',
    height: 30,
  },
  pathLine: {
    width: 4,
    height: '100%',
    backgroundColor: Colors.gray300,
    borderRadius: 2,
  },
  checkpointContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  checkpoint: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  checkpointText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
});
