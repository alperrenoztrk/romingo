import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Button } from './Button';
import ConfettiCannon from 'react-native-confetti-cannon';

interface LessonCompletionScreenProps {
  totalQuestions: number;
  correctAnswers: number;
  totalXP: number;
  lessonXP: number;
  accuracyBonus: number;
  didLevelUp: boolean;
  newLevel?: number;
  onContinue: () => void;
  onReview?: () => void;
}

export const LessonCompletionScreen: React.FC<LessonCompletionScreenProps> = ({
  totalQuestions,
  correctAnswers,
  totalXP,
  lessonXP,
  accuracyBonus,
  didLevelUp,
  newLevel,
  onContinue,
  onReview,
}) => {
  const confettiRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  const isPerfect = accuracy === 100;

  useEffect(() => {
    // Trigger confetti
    if (confettiRef.current) {
      confettiRef.current.start();
    }

    // Animate elements
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getMessage = () => {
    if (isPerfect) return 'Mükemmel! 🎉';
    if (accuracy >= 80) return 'Harika İş! 👏';
    if (accuracy >= 60) return 'İyi Gidiyor! 👍';
    return 'Tekrar Deneyelim! 💪';
  };

  return (
    <View style={styles.container}>
      <ConfettiCannon
        ref={confettiRef}
        count={isPerfect ? 200 : 100}
        origin={{ x: 0, y: 0 }}
        autoStart={false}
        fadeOut={true}
      />

      <LinearGradient
        colors={isPerfect ? ['#58CC02', '#4CAF00'] : ['#1CB0F6', '#1899D6']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name={isPerfect ? 'trophy-award' : 'check-circle'}
                size={80}
                color="white"
              />
            </View>
          </Animated.View>

          <Animated.Text
            style={[
              styles.title,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {getMessage()}
          </Animated.Text>

          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            Ders Tamamlandı!
          </Animated.Text>
        </View>

        {/* Stats Cards */}
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Accuracy */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="target" size={32} color={Colors.primary} />
              <Text style={styles.statLabel}>Doğruluk</Text>
            </View>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statDetail}>
              {correctAnswers}/{totalQuestions} doğru
            </Text>
          </View>

          {/* XP Breakdown */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons name="star-circle" size={32} color="#FFD700" />
              <Text style={styles.statLabel}>Kazanılan XP</Text>
            </View>
            <Text style={styles.statValue}>+{totalXP}</Text>
            <View style={styles.xpBreakdown}>
              <Text style={styles.xpDetail}>Ders: +{lessonXP}</Text>
              {accuracyBonus > 0 && (
                <Text style={styles.xpDetail}>Bonus: +{accuracyBonus}</Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Level Up Banner */}
        {didLevelUp && newLevel && (
          <Animated.View
            style={[
              styles.levelUpBanner,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.levelUpGradient}
            >
              <MaterialCommunityIcons name="arrow-up-bold" size={32} color="white" />
              <View>
                <Text style={styles.levelUpTitle}>Seviye Atladın!</Text>
                <Text style={styles.levelUpText}>Artık Level {newLevel}!</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Perfect Score Message */}
        {isPerfect && (
          <Animated.View
            style={[
              styles.perfectBanner,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.perfectText}>
              🎯 Hiç hata yapmadın! Mükemmel performans!
            </Text>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Devam Et"
            onPress={onContinue}
            variant="success"
            fullWidth
            style={styles.button}
          />
          
          {onReview && accuracy < 100 && (
            <TouchableOpacity style={styles.reviewButton} onPress={onReview}>
              <MaterialCommunityIcons name="replay" size={20} color={Colors.secondary} />
              <Text style={styles.reviewText}>Hataları Gözden Geçir</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  statDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  xpBreakdown: {
    alignItems: 'center',
  },
  xpDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  levelUpBanner: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  levelUpGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  levelUpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  levelUpText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  perfectBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  perfectText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  actions: {
    marginTop: 'auto',
  },
  button: {
    marginBottom: 12,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  reviewText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
});
