import React, { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Audio as AV } from 'expo-av';
import { View, TouchableOpacity, Text } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import setupPlayer from './player/setupPlayer';
import { AppState } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import ChapterScreen from './screens/ChapterScreen';
import ChapterViewScreen from './screens/ChapterViewScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

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
            // Prefer speaker, not earpiece, and force app to own audio focus
            playThroughEarpieceAndroid: false,
            // Explicitly request iOS playback category for background
            // @ts-ignore – supported by expo-av on iOS
            iosCategory: 'playback',
            iosCategoryOptions: ['allowBluetooth', 'allowAirPlay', 'defaultToSpeaker'],
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

        // Initialize Track Player and add a sample track
        try {
          await setupPlayer();
          await TrackPlayer.reset();
          await TrackPlayer.add([
            {
              id: 'sample-track',
              url: 'https://cdn.kinyabible.com/audiobible/nt/43_john/john1.mp3',
              title: 'Sample Chapter',
              artist: 'Kinya Bible',
              artwork: 'https://cdn.kinyabible.com/icon.png',
            },
          ]);
          setPlayerReady(true);
        } catch (_) {}
      } catch (err) {
        console.warn('Font loading error:', err);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  // Re-assert iOS audio session on app state changes to prevent mixing edge cases
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      try {
        if (state === 'active' || state === 'background') {
          await AV.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
            allowsRecordingIOS: false,
            interruptionModeIOS: AV.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            interruptionModeAndroid: AV.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
            playThroughEarpieceAndroid: false,
            iosCategory: 'playback',
            iosCategoryOptions: ['allowBluetooth', 'allowAirPlay', 'defaultToSpeaker'],
          });
          try {
            await AV.setIsEnabledAsync(true);
          } catch (_) {}
        }
      } catch (_) {}
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || !playerReady) {
    return null; // Keep splash visible until fonts load
  }

  const Transport = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', padding: 8 }}>
      <TouchableOpacity
        onPress={() => TrackPlayer.skipToPrevious()}
        style={{ marginHorizontal: 8 }}
      >
        <Text>{'<<'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => TrackPlayer.play()} style={{ marginHorizontal: 8 }}>
        <Text>{'Play'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => TrackPlayer.pause()} style={{ marginHorizontal: 8 }}>
        <Text>{'Pause'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => TrackPlayer.skipToNext()} style={{ marginHorizontal: 8 }}>
        <Text>{'>>'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {() => (
            <>
              <Transport />
              <HomeScreen />
            </>
          )}
        </Stack.Screen>
        <Stack.Screen name="ChapterScreen" component={ChapterScreen} />
        <Stack.Screen name="ChapterView" component={ChapterViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
