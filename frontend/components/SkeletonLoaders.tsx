import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

export const SkeletonLessonCard: React.FC = () => (
  <View style={styles.lessonCard}>
    <View style={styles.lessonHeader}>
      <Skeleton width={56} height={56} borderRadius={12} />
      <View style={styles.lessonInfo}>
        <Skeleton width={80} height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={18} style={{ marginBottom: 4 }} />
        <Skeleton width="80%" height={14} />
      </View>
    </View>
  </View>
);

export const SkeletonShopCard: React.FC = () => (
  <View style={styles.shopCard}>
    <Skeleton width="100%" height={120} borderRadius={0} />
    <View style={styles.shopContent}>
      <Skeleton width="70%" height={22} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={16} style={{ marginBottom: 4 }} />
      <Skeleton width="90%" height={16} style={{ marginBottom: 16 }} />
      <View style={styles.shopFooter}>
        <Skeleton width={100} height={40} borderRadius={12} />
        <Skeleton width={100} height={40} borderRadius={12} />
      </View>
    </View>
  </View>
);

export const SkeletonLeagueCard: React.FC = () => (
  <View style={styles.leagueCard}>
    <Skeleton width={48} height={48} borderRadius={24} />
    <View style={styles.leagueInfo}>
      <Skeleton width="60%" height={18} style={{ marginBottom: 6 }} />
      <Skeleton width="40%" height={14} />
    </View>
    <Skeleton width={60} height={32} borderRadius={8} />
  </View>
);

export const SkeletonStoryCard: React.FC = () => (
  <View style={styles.storyCard}>
    <Skeleton width="100%" height={120} borderRadius={0} />
    <View style={styles.storyContent}>
      <Skeleton width={80} height={12} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={22} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={15} style={{ marginBottom: 16 }} />
      <Skeleton width="40%" height={14} />
    </View>
  </View>
);

export const SkeletonProfileCard: React.FC = () => (
  <View style={styles.profileCard}>
    <Skeleton width={100} height={100} borderRadius={50} style={{ marginBottom: 16 }} />
    <Skeleton width={150} height={28} style={{ marginBottom: 8 }} />
    <Skeleton width={120} height={16} />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.gray200,
    overflow: 'hidden',
  },
  shimmer: {
    width: 300,
    height: '100%',
  },
  shimmerGradient: {
    width: '100%',
    height: '100%',
  },
  lessonCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonHeader: {
    flexDirection: 'row',
  },
  lessonInfo: {
    flex: 1,
    marginLeft: 12,
  },
  shopCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  shopContent: {
    padding: 20,
  },
  shopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leagueCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leagueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  storyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  storyContent: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
});
