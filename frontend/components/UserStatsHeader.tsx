import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useRouter } from 'expo-router';

interface UserStatsHeaderProps {
  hearts: number;
  maxHearts: number;
  gems: number;
  streak: number;
  onPressHearts?: () => void;
  onPressGems?: () => void;
}

export const UserStatsHeader: React.FC<UserStatsHeaderProps> = ({
  hearts,
  maxHearts,
  gems,
  streak,
  onPressHearts,
  onPressGems,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Hearts */}
      <TouchableOpacity 
        style={styles.stat} 
        onPress={onPressHearts || (() => router.push('/(tabs)/shop'))}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="cards-heart" size={24} color="#FF4458" />
        <Text style={styles.statText}>{hearts}/{maxHearts}</Text>
      </TouchableOpacity>

      {/* Streak */}
      <View style={styles.stat}>
        <MaterialCommunityIcons name="fire" size={24} color={Colors.streak} />
        <Text style={styles.statText}>{streak}</Text>
      </View>

      {/* Gems */}
      <TouchableOpacity 
        style={styles.stat}
        onPress={onPressGems || (() => router.push('/(tabs)/shop'))}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="diamond-stone" size={24} color={Colors.secondary} />
        <Text style={styles.statText}>{gems}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
});
