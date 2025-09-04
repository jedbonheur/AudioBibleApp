import React, { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens, enableFreeze } from 'react-native-screens';
// Background music and audio playback are managed within ChapterViewScreen.
import setupPlayer from './player/setupPlayer';
import HomeScreen from './screens/HomeScreen';
import ChapterScreen from './screens/ChapterScreen';
import ChapterViewScreen from './screens/ChapterViewScreen';

const Stack = createNativeStackNavigator();

// Optimize navigation/screen handling
enableScreens(true);
enableFreeze(true);

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  // Track Player is set up on launch; screens will add tracks as needed.

  useEffect(() => {
    async function prepare() {
      let cancelled = false;
      try {
        await SplashScreen.preventAutoHideAsync();
        // Kick off TrackPlayer setup without blocking the splash
        // (screens manage queue; setup is idempotent)
        setupPlayer().catch(() => {});

        // Block the splash only on fonts so first render is fast
        await Font.loadAsync({
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'VastShadow-Regular': require('./assets/fonts/VastShadow-Regular.ttf'),
          'Radley-Regular': require('./assets/fonts/Radley-Regular.ttf'),
        });
      } catch (err) {
        console.warn('Font loading error:', err);
      } finally {
        if (!cancelled) setFontsLoaded(true);
        try {
          await SplashScreen.hideAsync();
        } catch {}
      }
    }
    prepare();
    // no subscriptions needed here
    return () => {
      // prevent state updates after unmount
    };
  }, []);

  if (!fontsLoaded) {
    return null; // Keep splash visible until fonts load
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chapter" component={ChapterScreen} />
        <Stack.Screen name="ChapterView" component={ChapterViewScreen} />
      </Stack.Navigator>
      {/* BG debug logs removed */}
    </NavigationContainer>
  );
}
