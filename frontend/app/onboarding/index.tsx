import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { FoxMascot } from '../../components/FoxMascot';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const REASONS = [
  { id: 'travel', label: 'Seyahat', icon: 'airplane' },
  { id: 'work', label: 'İş', icon: 'briefcase' },
  { id: 'family', label: 'Aile', icon: 'account-group' },
  { id: 'culture', label: 'Kültür', icon: 'book-open-variant' },
  { id: 'hobby', label: 'Hobi', icon: 'star' },
  { id: 'other', label: 'Diğer', icon: 'dots-horizontal' },
];

const DAILY_GOALS = [
  { id: 'casual', xp: 20, label: 'Rahat', time: '5 dk/gün', icon: 'coffee' },
  { id: 'regular', xp: 50, label: 'Normal', time: '10 dk/gün', icon: 'walk', recommended: true },
  { id: 'serious', xp: 100, label: 'Ciddi', time: '15 dk/gün', icon: 'run-fast' },
  { id: 'intense', xp: 200, label: 'Yoğun', time: '20 dk/gün', icon: 'fire' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Yeni Başlıyorum', desc: 'Romence bilgim yok', icon: 'sprout' },
  { id: 'intermediate', label: 'Biraz Biliyorum', desc: 'Temel kelimeler bilirim', icon: 'tree' },
  { id: 'advanced', label: 'İleri Seviye', desc: 'Konuşabiliyorum', icon: 'tree-outline' },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState('');
  const [dailyGoal, setDailyGoal] = useState(50);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [saving, setSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const nextStep = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(step + 1);
      slideAnim.setValue(100);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const previousStep = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(step - 1);
      slideAnim.setValue(-100);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      // Save preferences to backend (you'd need to create this endpoint)
      // For now, we'll just update the daily goal
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/user/update-preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await require('@react-native-async-storage/async-storage').default.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          daily_goal: dailyGoal,
          experience_level: experienceLevel,
          onboarding_completed: true,
        }),
      });

      await refreshUser();
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Continue anyway
      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  };

  const canContinue = () => {
    if (step === 0) return reason !== '';
    if (step === 1) return dailyGoal > 0;
    if (step === 2) return experienceLevel !== '';
    return true;
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i <= step && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep0 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <FoxMascot expression="happy" size={120} />
      <Text style={styles.stepTitle}>Neden Romence öğrenmek istiyorsun?</Text>
      <Text style={styles.stepSubtitle}>Sana özel içerik hazırlayalım</Text>

      <View style={styles.optionsGrid}>
        {REASONS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.optionCard,
              reason === item.id && styles.optionCardSelected,
            ]}
            onPress={() => setReason(item.id)}
          >
            <MaterialCommunityIcons
              name={item.icon as any}
              size={32}
              color={reason === item.id ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.optionLabel,
                reason === item.id && styles.optionLabelSelected,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <FoxMascot expression="thinking" size={120} />
      <Text style={styles.stepTitle}>Günlük hedefinizi seçin</Text>
      <Text style={styles.stepSubtitle}>Sonra değiştirebilirsiniz</Text>

      <View style={styles.goalsList}>
        {DAILY_GOALS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.goalCard,
              dailyGoal === item.xp && styles.goalCardSelected,
            ]}
            onPress={() => setDailyGoal(item.xp)}
          >
            {item.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Önerilen</Text>
              </View>
            )}
            <MaterialCommunityIcons
              name={item.icon as any}
              size={40}
              color={dailyGoal === item.xp ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.goalLabel,
                dailyGoal === item.xp && styles.goalLabelSelected,
              ]}
            >
              {item.label}
            </Text>
            <Text style={styles.goalTime}>{item.time}</Text>
            <Text style={styles.goalXP}>{item.xp} XP/gün</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <FoxMascot expression="excited" size={120} />
      <Text style={styles.stepTitle}>Romence seviyeniz nedir?</Text>
      <Text style={styles.stepSubtitle}>Doğru yerden başlayalım</Text>

      <View style={styles.levelsList}>
        {EXPERIENCE_LEVELS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.levelCard,
              experienceLevel === item.id && styles.levelCardSelected,
            ]}
            onPress={() => setExperienceLevel(item.id)}
          >
            <MaterialCommunityIcons
              name={item.icon as any}
              size={48}
              color={experienceLevel === item.id ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.levelLabel,
                experienceLevel === item.id && styles.levelLabelSelected,
              ]}
            >
              {item.label}
            </Text>
            <Text style={styles.levelDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
      <FoxMascot expression="excited" size={140} showMessage="Hazırsın! Hadi başlayalım! 🎉" />
      <Text style={styles.stepTitle}>Harika! Her şey hazır!</Text>
      <Text style={styles.stepSubtitle}>Romence öğrenme yolculuğun başlıyor</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="target" size={24} color={Colors.primary} />
          <Text style={styles.summaryText}>
            Günlük hedef: {DAILY_GOALS.find(g => g.xp === dailyGoal)?.label}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="chart-line" size={24} color={Colors.secondary} />
          <Text style={styles.summaryText}>
            Seviye: {EXPERIENCE_LEVELS.find(l => l.id === experienceLevel)?.label}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="star-circle" size={24} color="#FFD700" />
          <Text style={styles.summaryText}>
            Hedef: {dailyGoal} XP/gün
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#FFFFFF', '#F0F9FF', '#E8F5E9']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          {step > 0 && (
            <TouchableOpacity onPress={previousStep} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
            </TouchableOpacity>
          )}
          {renderProgressBar()}
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 3 ? (
            <Button
              title="Devam"
              onPress={nextStep}
              disabled={!canContinue()}
              variant="primary"
              fullWidth
            />
          ) : (
            <Button
              title="Başla!"
              onPress={completeOnboarding}
              loading={saving}
              variant="success"
              fullWidth
            />
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  optionCard: {
    width: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FFF4',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  goalsList: {
    width: '100%',
    gap: 12,
  },
  goalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray200,
    position: 'relative',
  },
  goalCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FFF4',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  goalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  goalLabelSelected: {
    color: Colors.primary,
  },
  goalTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  goalXP: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  levelsList: {
    width: '100%',
    gap: 16,
  },
  levelCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  levelCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FFF4',
  },
  levelLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  levelLabelSelected: {
    color: Colors.primary,
  },
  levelDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginTop: 32,
    gap: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
});
