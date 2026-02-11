import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../utils/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { UserStatsHeader } from '../../components/UserStatsHeader';
import { Colors } from '../../constants/Colors';

interface LeagueEntry {
  user_id: string;
  username: string;
  xp_this_week: number;
  rank: number;
  is_current_user: boolean;
}

export default function League() {
  const { user } = useAuth();
  const [standings, setStandings] = useState<LeagueEntry[]>([]);
  const [league, setLeague] = useState('bronze');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeague();
  }, []);

  const loadLeague = async () => {
    try {
      const data = await api.getLeagueStandings();
      setStandings(data.standings || []);
      setLeague(data.league || 'bronze');
    } catch (error) {
      console.error('Failed to load league:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeague();
    setRefreshing(false);
  };

  const getLeagueColor = (leagueName: string): string[] => {
    const colors: { [key: string]: string[] } = {
      bronze: ['#CD7F32', '#8B4513'],
      silver: ['#C0C0C0', '#808080'],
      gold: ['#FFD700', '#FFA500'],
      sapphire: ['#0F52BA', '#082567'],
      ruby: ['#E0115F', '#9B111E'],
      emerald: ['#50C878', '#046307'],
      diamond: ['#B9F2FF', '#4A90E2'],
    };
    return colors[leagueName] || colors.bronze;
  };

  const getLeagueIcon = (leagueName: string): string => {
    const icons: { [key: string]: string } = {
      bronze: 'medal',
      silver: 'medal',
      gold: 'trophy',
      sapphire: 'trophy-variant',
      ruby: 'trophy-award',
      emerald: 'trophy-award',
      diamond: 'crown',
    };
    return icons[leagueName] || 'medal';
  };

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const renderLeagueHeader = () => (
    <View style={styles.leagueHeader}>
      <LinearGradient
        colors={getLeagueColor(league)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.leagueHeaderGradient}
      >
        <MaterialCommunityIcons 
          name={getLeagueIcon(league)} 
          size={60} 
          color="white" 
        />
        <Text style={styles.leagueName}>
          {league.charAt(0).toUpperCase() + league.slice(1)} Ligi
        </Text>
        <Text style={styles.leagueSubtext}>
          Haftalık Sıralama
        </Text>
      </LinearGradient>
    </View>
  );

  const renderLeaderboardItem = ({ item }: { item: LeagueEntry }) => {
    const isTop3 = item.rank <= 3;
    
    return (
      <View
        style={[
          styles.itemCard,
          item.is_current_user && styles.currentUserCard,
          isTop3 && styles.top3Card,
        ]}
      >
        <View style={styles.rankContainer}>
          {isTop3 ? (
            <Text style={styles.medalEmoji}>{getMedalEmoji(item.rank)}</Text>
          ) : (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{item.rank}</Text>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={[
            styles.username, 
            item.is_current_user && styles.currentUsername,
            isTop3 && styles.top3Username
          ]}>
            {item.username}
            {item.is_current_user && ' (Sen)'}
          </Text>
          <View style={styles.stats}>
            <MaterialCommunityIcons name="star" size={16} color={Colors.xp} />
            <Text style={styles.statText}>{item.xp_this_week} XP bu hafta</Text>
          </View>
        </View>

        {isTop3 && (
          <MaterialCommunityIcons 
            name="trophy" 
            size={24} 
            color={getLeagueColor(league)[0]} 
          />
        )}
      </View>
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Lig</Text>
        <UserStatsHeader
          hearts={user.hearts}
          maxHearts={user.max_hearts}
          gems={user.gems}
          streak={user.streak}
        />
      </View>

      {renderLeagueHeader()}

      {standings.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="trophy-outline" size={80} color={Colors.textLight} />
          <Text style={styles.emptyText}>Henüz lige katılım yok</Text>
          <Text style={styles.emptySubtext}>Ders tamamlayarak sıralamaya gir!</Text>
        </View>
      ) : (
        <FlatList
          data={standings}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item, index) => `${item.user_id}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  leagueHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  leagueHeaderGradient: {
    padding: 32,
    alignItems: 'center',
  },
  leagueName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
  },
  leagueSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
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
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: '#F0FFF4',
  },
  top3Card: {
    borderWidth: 2,
    borderColor: Colors.xp,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medalEmoji: {
    fontSize: 32,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  currentUsername: {
    color: Colors.primary,
  },
  top3Username: {
    fontSize: 19,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
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
