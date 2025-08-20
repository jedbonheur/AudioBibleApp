import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '@theme/theme';

const Header = () => {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
      }}
    >
      <Ionicons name="settings-outline" size={32} color="#bfc3c7" />
      <Text style={{ color: theme.colors.textActive, fontWeight: 'bold', fontSize: theme.fonts.size.title }}>Bible</Text>
      <Ionicons name="person-circle-outline" size={32} color={theme.colors.textActive} />
    </View>
  );
};

export default Header;