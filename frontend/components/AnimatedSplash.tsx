import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const foxBounce = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Sequential animations
    Animated.sequence([
      // 1. Fox appears and scales in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      
      // 2. Fox bounces
      Animated.sequence([
        Animated.timing(foxBounce, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(foxBounce, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),

      // 3. Text slides in
      Animated.parallel([
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 4. Wait a bit
      Animated.delay(800),

      // 5. Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F0F9FF', '#E8F5E9']}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: foxBounce },
              ],
            },
          ]}
        >
          {/* Fox in circle */}
          <View style={styles.foxCircle}>
            <LinearGradient
              colors={['#FF6B35', '#FF8C42']}
              style={styles.foxGradient}
            >
              <MaterialCommunityIcons name="fox" size={100} color="white" />
            </LinearGradient>
          </View>

          {/* Brand name */}
          <Animated.View
            style={{
              transform: [{ translateY: textSlide }],
            }}
          >
            <Text style={styles.brandName}>Romingo</Text>
            <Text style={styles.tagline}>Romence'yi Eğlenceli Öğren</Text>
          </Animated.View>

          {/* Loading indicator */}
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBar}>
              <Animated.View
                style={[
                  styles.loadingProgress,
                  {
                    width: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  foxCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 40,
  },
  foxGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 56,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: -1,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 60,
    width: 200,
  },
  loadingBar: {
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
