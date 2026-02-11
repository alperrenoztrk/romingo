import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../utils/api';
import { LeaderboardEntry } from '../../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700';
      case 2:
        return '#C0C0C0';
      case 3:
        return '#CD7F32';
      default:
        return '#AFAFAF';
    }
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = user?.username === item.username;
    
    return (
      <View
        style={[
          styles.itemCard,
          isCurrentUser && styles.currentUserCard,
        ]}
      >
        <View style={styles.rankContainer}>
          {item.rank <= 3 ? (
            <MaterialCommunityIcons
              name="medal"
              size={32}
              color={getMedalColor(item.rank)}
            />
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.username, isCurrentUser && styles.currentUsername]}>
            {item.username}
            {isCurrentUser && ' (Sen)'}
          </Text>
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.statText}>Level {item.level}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="fire" size={16} color="#FF9500" />
              <Text style={styles.statText}>{item.streak} seri</Text>
            </View>
          </View>
        </View>

        <View style={styles.xpContainer}>
          <Text style={styles.xpValue}>{item.xp}</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="trophy" size={40} color="#FFD700" />
        <Text style={styles.headerTitle}>Sıralama</Text>
        <Text style={styles.headerSubtitle}>En iyi öğrenciler</Text>
      </View>

      {leaderboard.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="trophy-outline" size={80} color="#AFAFAF" />
          <Text style={styles.emptyText}>Henüz sıralama yok</Text>
          <Text style={styles.emptySubtext}>Ders tamamlayarak sıralamaya gir!</Text>
        </View>
      )}

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item, index) => `${item.username}-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: '#1CB0F6',
    backgroundColor: '#F0F9FF',
  },
  rankContainer: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  currentUsername: {
    color: '#1CB0F6',
  },
  stats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  xpValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1CB0F6',
  },
  xpLabel: {
    fontSize: 12,
    color: '#666',
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
