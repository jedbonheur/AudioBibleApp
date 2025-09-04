import React from 'react';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import Header from '@header/Header';
import BookSelect from '@bookselect/BookSelect';
import theme from '@theme/theme';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} backgroundColor={theme.colors.backgroundBlueNavy}>
      <StatusBar barStyle="light-content" />
      <Header />
      <BookSelect />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundBlueNavy,
    height: '100%'
  }
});