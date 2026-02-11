import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { FoxMascot } from '../components/FoxMascot';
import { XPBar } from '../components/XPBar';
import { StreakDisplay } from '../components/StreakDisplay';
import { api } from '../utils/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Home() {
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Günaydın');
    else if (hour < 18) setGreeting('İyi günler');
    else setGreeting('İyi akşamlar');

    // Check for new achievements
    checkAchievements();
  }, []);

  const checkAchievements = async () => {
    try {
      const result = await api.checkAchievements();
      if (result.new_achievements && result.new_achievements.length > 0) {
        Alert.alert(
          '🏆 Yeni Rozet!',
          result.new_achievements.map((a: any) => `${a.icon} ${a.name}`).join('\n')
        );
      }
    } catch (error) {
      console.error('Achievement check failed:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    await checkAchievements();
    setRefreshing(false);
  };

  const getMotivationalMessage = () => {
    const messages = [
      'Bugün harika bir gün!',
      'Romence öğrenmeye hazır mısın?',
      'Her ders seni hedefe yakınlaştırıyor!',
      'Harika gidiyorsun!',
      'Hadi yeni kelimeler öğrenelim!',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.username}>{user.username}!</Text>
          </View>
          <StreakDisplay streak={user.streak} size="large" />
        </View>

        {/* XP Bar */}
        <XPBar currentXP={user.xp} level={user.level} />

        {/* Fox Mascot */}
        <View style={styles.mascotSection}>
          <FoxMascot
            expression="happy"
            size={140}
            showMessage={getMotivationalMessage()}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="trophy" size={32} color="#FFD700" />
            <Text style={styles.statValue}>{user.xp}</Text>
            <Text style={styles.statLabel}>Toplam XP</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star" size={32} color="#1CB0F6" />
            <Text style={styles.statValue}>{user.level}</Text>
            <Text style={styles.statLabel}>Seviye</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialCommunityIcons name="fire" size={32} color="#FF9500" />
            <Text style={styles.statValue}>{user.streak}</Text>
            <Text style={styles.statLabel}>Seri</Text>
          </View>
        </View>

        {/* Daily Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <MaterialCommunityIcons name="target" size={24} color="#58CC02" />
            <Text style={styles.goalTitle}>Günlük Hedef</Text>
          </View>
          <Text style={styles.goalDescription}>
            Bugün 50 XP kazanarak hedefini tamamla!
          </Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 İpuçları</Text>
          <Text style={styles.tipsText}>
            • Her gün pratik yaparak serini devam ettir{('\n')}
            • Yeni kelimeler öğrenmek için "Öğren" sekmesine git{('\n')}
            • Sıralamada üst sıralara çıkmak için daha fazla ders tamamla
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 18,
    color: '#666',
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  mascotSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
    marginTop: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
    marginTop: 1,
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    minWidth: 100,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  goalCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#58CC02',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
  },
  tipsCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
