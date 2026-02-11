import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FoxMascotProps {
  expression?: 'happy' | 'excited' | 'thinking' | 'sad' | 'neutral';
  size?: number;
  showMessage?: string;
}

export const FoxMascot: React.FC<FoxMascotProps> = ({ 
  expression = 'neutral', 
  size = 120,
  showMessage 
}) => {
  const getExpressionEmoji = () => {
    switch (expression) {
      case 'happy': return '😊';
      case 'excited': return '🤩';
      case 'thinking': return '🤔';
      case 'sad': return '😢';
      default: return '😊';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.foxContainer, { width: size, height: size }]}>
        {/* Fox icon from MaterialCommunityIcons */}
        <MaterialCommunityIcons name="fox" size={size} color="#FF6B35" />
        
        {/* Expression overlay */}
        <View style={styles.expressionOverlay}>
          <Text style={[styles.expressionEmoji, { fontSize: size * 0.3 }]}>
            {getExpressionEmoji()}
          </Text>
        </View>
      </View>
      
      {showMessage && (
        <View style={styles.messageBubble}>
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
  expressionOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 2,
  },
  expressionEmoji: {
    textAlign: 'center',
  },
  messageBubble: {
    marginTop: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    maxWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});
