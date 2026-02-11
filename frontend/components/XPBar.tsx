import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress';

interface XPBarProps {
  currentXP: number;
  level: number;
}

export const XPBar: React.FC<XPBarProps> = ({ currentXP, level }) => {
  const xpForNextLevel = level * 100;
  const progress = (currentXP % xpForNextLevel) / xpForNextLevel;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelText}>Level {level}</Text>
        <Text style={styles.xpText}>{currentXP % xpForNextLevel}/{xpForNextLevel} XP</Text>
      </View>
      <Progress.Bar 
        progress={progress} 
        width={null} 
        height={12}
        color="#58CC02"
        unfilledColor="#E5E5E5"
        borderWidth={0}
        borderRadius={6}
      />
    </View>
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
    color: '#333',
  },
  xpText: {
    fontSize: 14,
    color: '#666',
  },
});
