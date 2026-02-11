import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { FoxMascot } from '../components/FoxMascot';
import { Button } from '../components/Button';
import { StatusBar } from 'expo-status-bar';

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
        <ActivityIndicator size="large" color="#1CB0F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <FoxMascot 
          expression="happy" 
          size={180} 
          showMessage="Merhaba! Ben Romingo tilkisi. Seninle Romence öğrenmeye hazırım!"
        />
        
        <Text style={styles.title}>Romingo</Text>
        <Text style={styles.subtitle}>Romenceyi eğlenceli şekilde öğren</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Başla"
            onPress={() => router.push('/auth/register')}
            style={styles.button}
          />
          
          <Button
            title="Zaten hesabım var"
            onPress={() => router.push('/auth/login')}
            variant="secondary"
            style={styles.button}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 48,
    gap: 16,
  },
  button: {
    width: '100%',
  },
});
