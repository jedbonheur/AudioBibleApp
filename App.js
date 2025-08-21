import React, { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ChapterScreen from './screens/ChapterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
