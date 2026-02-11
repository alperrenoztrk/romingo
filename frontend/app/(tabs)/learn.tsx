import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { Lesson } from '../../types';
import { Button } from '../../components/Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';

export default function Learn() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      const data = await api.getLessons();
      setLessons(data.lessons);
    } catch (error) {
      console.error('Failed to load lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLessons();
    setRefreshing(false);
  };

  const generateNewLesson = async () => {
    setGenerating(true);
    try {
      // Determine next level and topic
      const nextLevel = lessons.length + 1;
      const topics = [
        'Temel Sohbet',
        'Sayılar ve Renkler',
        'Aile ve Arkadaşlar',
        'Yemek ve İçecek',
        'Alışveriş',
        'Seyahat',
        'Ev ve Mobilya',
        'Hava Durumu',
        'Hoşgeldiniz',
        'Merhaba ve Güle Güle',
      ];
      const topic = topics[lessons.length % topics.length];

      const result = await api.generateLesson(nextLevel, topic);
      Alert.alert('Başarılı!', 'Yeni ders oluşturuldu!');
      await loadLessons();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Ders oluşturulamadı');
    } finally {
      setGenerating(false);
    }
  };

  const renderLesson = ({ item }: { item: Lesson }) => (
    <TouchableOpacity
      style={[
        styles.lessonCard,
        item.completed && styles.completedCard,
      ]}
      onPress={() => router.push(`/lesson/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.lessonHeader}>
        <View style={styles.lessonIconContainer}>
          <MaterialCommunityIcons
            name={item.completed ? 'check-circle' : 'book-open-variant'}
            size={32}
            color={item.completed ? '#58CC02' : '#1CB0F6'}
          />
        </View>
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonLevel}>Level {item.level}</Text>
          <Text style={styles.lessonTitle}>{item.title}</Text>
          <Text style={styles.lessonTopic} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>

      {item.completed && (
        <View style={styles.scoreContainer}>
          <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
          <Text style={styles.scoreText}>Skor: {item.score}%</Text>
        </View>
      )}

      {!item.completed && (
        <View style={styles.startButton}>
          <Text style={styles.startButtonText}>Başla</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Öğren</Text>
        <Text style={styles.headerSubtitle}>Romence derslerine göz at</Text>
      </View>

      {lessons.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="book-open-variant" size={80} color="#AFAFAF" />
          <Text style={styles.emptyText}>Henüz ders yok</Text>
          <Text style={styles.emptySubtext}>Yeni bir ders oluşturmak için butona bas</Text>
        </View>
      )}

      <FlatList
        data={lessons}
        renderItem={renderLesson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <View style={styles.footer}>
        <Button
          title="Yeni Ders Oluştur (AI)"
          onPress={generateNewLesson}
          loading={generating}
          variant="success"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  lessonCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    borderWidth: 2,
    borderColor: '#58CC02',
  },
  lessonHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  lessonIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonLevel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  lessonTopic: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1CB0F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
