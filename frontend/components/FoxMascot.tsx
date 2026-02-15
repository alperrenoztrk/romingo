import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/Colors';

interface FoxMascotProps {
  expression?: 'happy' | 'excited' | 'thinking' | 'sad' | 'neutral';
  size?: number;
  showMessage?: string;
  animated?: boolean;
}

const getExpressionEmoji = (expression: string) => {
  switch (expression) {
    case 'happy': return '🦩';
    case 'excited': return '🎉';
    case 'thinking': return '🦩';
    case 'sad': return '😔';
    default: return '🦩';
  }
};

const getBgColor = (expression: string) => {
  switch (expression) {
    case 'happy': return '#FFF3E0';
    case 'excited': return '#FFF8E1';
    case 'thinking': return '#FFF3E0';
    case 'sad': return '#F5F5F5';
    default: return '#FFF3E0';
  }
};

export const FoxMascot: React.FC<FoxMascotProps> = ({ 
  expression = 'neutral', 
  size = 120,
  showMessage,
  animated = true
}) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    
    if (animated) {
      animation = Animated.loop(
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
      );
      animation.start();
    }
    
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [animated]);

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
        <View style={[styles.foxCircle, { width: size, height: size, backgroundColor: getBgColor(expression) }]}>
          <Text style={{ fontSize: size * 0.5 }}>{getExpressionEmoji(expression)}</Text>
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
