import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedSplash } from '../components/AnimatedSplash';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        // await Font.loadAsync(...);
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide the native splash screen
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  if (showAnimatedSplash) {
    return (
      <AnimatedSplash
        onFinish={() => {
          setShowAnimatedSplash(false);
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} onLayout={onLayoutRootView}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[id]" />
        <Stack.Screen name="stories/index" />
        <Stack.Screen name="practice/index" />
      </Stack>
    </AuthProvider>
  );
}
