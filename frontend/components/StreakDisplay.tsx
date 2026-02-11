import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StreakDisplayProps {
  streak: number;
  size?: 'small' | 'large';
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ streak, size = 'small' }) => {
  const isSmall = size === 'small';
  
  return (
    <View style={[styles.container, isSmall ? styles.smallContainer : styles.largeContainer]}>
      <MaterialCommunityIcons 
        name="fire" 
        size={isSmall ? 20 : 32} 
        color="#FF9500" 
      />
      <Text style={[styles.streakText, isSmall ? styles.smallText : styles.largeText]}>
        {streak}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  largeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  streakText: {
    fontWeight: 'bold',
    color: '#FF9500',
    marginLeft: 4,
  },
  smallText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 20,
  },
});
