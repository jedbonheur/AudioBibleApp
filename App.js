import React, { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Audio as AV } from 'expo-av';
import HomeScreen from './screens/HomeScreen';
import ChapterScreen from './screens/ChapterScreen';
import ChapterViewScreen from './screens/ChapterViewScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        // Ensure iOS plays audio even when the hardware mute switch is ON
        // Call before any audio playback starts
        try {
          await AV.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
            allowsRecordingIOS: false,
            interruptionModeIOS: AV.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            interruptionModeAndroid: AV.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          });
          try {
            await AV.setIsEnabledAsync(true);
          } catch (_) {}
        } catch (e) {
          // non-fatal
        }
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
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!fontsLoaded) {
    return null; // Keep splash visible until fonts load
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ChapterScreen" component={ChapterScreen} />
        <Stack.Screen name="ChapterView" component={ChapterViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
