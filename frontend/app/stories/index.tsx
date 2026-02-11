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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { Button } from '../../components/Button';
import { UserStatsHeader } from '../../components/UserStatsHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

interface Story {
  id: string;
  title: string;
  level: number;
  topic: string;
  completed: boolean;
  parts: any[];
}

export default function Stories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const data = await api.getStories();
      setStories(data.stories || []);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStories();
    setRefreshing(false);
  };

  const generateStory = async () => {
    setGenerating(true);
    try {
      const level = stories.length + 1;
      await api.generateStory(level);
      Alert.alert('Başarılı!', 'Yeni hikaye oluşturuldu!');
      await loadStories();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Hikaye oluşturulamadı');
    } finally {
      setGenerating(false);
    }
  };

  const renderStory = ({ item }: { item: Story }) => (
    <TouchableOpacity
      style={[styles.storyCard, item.completed && styles.completedStory]}
      onPress={() => router.push(`/stories/${item.id}`)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={item.completed ? ['#58CC02', '#4CAF00'] : ['#FF6B35', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.storyHeader}
      >
        <MaterialCommunityIcons
          name={item.completed ? 'book-check' : 'book-open-page-variant'}
          size={48}
          color="white"
        />
      </LinearGradient>

      <View style={styles.storyContent}>
        <Text style={styles.storyLevel}>Level {item.level}</Text>
        <Text style={styles.storyTitle}>{item.title}</Text>
        <Text style={styles.storyTopic}>📖 {item.topic}</Text>

        <View style={styles.storyFooter}>
          <Text style={styles.partsCount}>{item.parts?.length || 0} bölüm</Text>
          {item.completed && (
            <View style={styles.completedBadge}>
              <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
              <Text style={styles.completedText}>Tamamlandı</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📚 Hikayeler</Text>
        <UserStatsHeader
          hearts={user.hearts}
          maxHearts={user.max_hearts}
          gems={user.gems}
          streak={user.streak}
        />
      </View>

      <FlatList
        data={stories}
        renderItem={renderStory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-open-variant" size={80} color={Colors.textLight} />
            <Text style={styles.emptyText}>Henüz hikaye yok</Text>
            <Text style={styles.emptySubtext}>İlk hikayeyi oluşturmak için butona bas</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Button
          title="Yeni Hikaye Oluştur (AI)"
          onPress={generateStory}
          loading={generating}
          variant="primary"
          fullWidth
        />
      </View>
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
  listContent: {
    padding: 16,
  },
  storyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  completedStory: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  storyHeader: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyContent: {
    padding: 20,
  },
  storyLevel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  storyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
  },
  storyTopic: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  storyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  partsCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
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
