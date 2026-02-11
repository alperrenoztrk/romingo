import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Progress from 'react-native-progress';
import { Colors } from '../constants/Colors';

interface XPBarProps {
  currentXP: number;
  level: number;
  animated?: boolean;
}

export const XPBar: React.FC<XPBarProps> = ({ currentXP, level, animated = true }) => {
  const xpForNextLevel = level * 100;
  const xpInCurrentLevel = currentXP % xpForNextLevel;
  const progress = xpInCurrentLevel / xpForNextLevel;
  
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      // Animate progress bar
      Animated.parallel([
        Animated.timing(animatedProgress, {
          toValue: progress,
          duration: 800,
          useNativeDriver: false,
        }),
        // Pulse animation on XP gain
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      animatedProgress.setValue(progress);
    }
  }, [currentXP, level]);

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.levelText}>Level {level}</Text>
        <Text style={styles.xpText}>{xpInCurrentLevel}/{xpForNextLevel} XP</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: animatedProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  xpText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: Colors.gray200,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
});
