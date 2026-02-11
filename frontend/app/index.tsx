import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { FoxMascot } from '../components/FoxMascot';
import { Button } from '../components/Button';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)/home');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F0F9FF', '#E8F5E9']}
      style={styles.container}
    >
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <View style={styles.mascotContainer}>
          <FoxMascot 
            expression="happy" 
            size={160} 
            showMessage="Merhaba! Romence öğrenmeye hazır mısın?"
          />
        </View>
        
        <View style={styles.brandContainer}>
          <Text style={styles.title}>Romingo</Text>
          <Text style={styles.subtitle}>Romenceyi eğlenceli şekilde öğren</Text>
          <View style={styles.featureContainer}>
            <Text style={styles.feature}>🎯 AI destekli dersler</Text>
            <Text style={styles.feature}>🏆 Eğlenceli yarışmalar</Text>
            <Text style={styles.feature}>🔥 Günlük seri sistemi</Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Hemen Başla"
            onPress={() => router.push('/auth/register')}
            variant="primary"
            fullWidth
          />
          
          <Button
            title="Zaten hesabım var"
            onPress={() => router.push('/auth/login')}
            variant="outline"
            fullWidth
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 48,
  },
  mascotContainer: {
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  featureContainer: {
    gap: 12,
  },
  feature: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  secondaryButton: {
    marginTop: 0,
  },
});
