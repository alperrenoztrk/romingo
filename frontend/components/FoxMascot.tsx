import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface FoxMascotProps {
  expression?: 'happy' | 'excited' | 'thinking' | 'sad' | 'neutral';
  size?: number;
  showMessage?: string;
  animated?: boolean;
}

export const FoxMascot: React.FC<FoxMascotProps> = ({ 
  expression = 'neutral', 
  size = 120,
  showMessage,
  animated = true
}) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated]);

  const getFoxColor = () => {
    switch (expression) {
      case 'happy': return '#FF6B35';
      case 'excited': return '#FF9600';
      case 'thinking': return '#FFA726';
      case 'sad': return '#999';
      default: return '#FF6B35';
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.foxContainer, 
          { 
            width: size, 
            height: size,
            transform: [{ translateY: bounceAnim }]
          }
        ]}
      >
        <View style={[styles.foxCircle, { width: size, height: size }]}>
          <MaterialCommunityIcons 
            name="fox" 
            size={size * 0.7} 
            color={getFoxColor()} 
          />
        </View>
      </Animated.View>
      
      {showMessage && (
        <View style={styles.messageBubble}>
          <View style={styles.messageArrow} />
          <Text style={styles.messageText}>{showMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  foxContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foxCircle: {
    backgroundColor: '#FFF3E0',
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  messageBubble: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageArrow: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});
