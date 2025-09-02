import React, { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
// Background music is managed within ChapterViewScreen.
import setupPlayer from './player/setupPlayer';
import HomeScreen from './screens/HomeScreen';
import ChapterScreen from './screens/ChapterScreen';
import ChapterViewScreen from './screens/ChapterViewScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [tpSub, setTpSub] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        await Font.loadAsync({
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'VastShadow-Regular': require('./assets/fonts/VastShadow-Regular.ttf'),
          'Radley-Regular': require('./assets/fonts/Radley-Regular.ttf'),
        });

        // No BG debug logs in app

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

    // No global BG music sync; avoid double-control
    const sub = null;
    setTpSub(sub);

    return () => {
      try {
        tpSub && tpSub.remove && tpSub.remove();
      } catch {}
      // no-op
    };
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
      {/* BG debug logs removed */}
    </NavigationContainer>
  );
}
