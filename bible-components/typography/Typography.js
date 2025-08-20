import React from 'react';
import { Text } from 'react-native';
import theme from '@theme/theme';
import { StyleSheet } from 'react-native';

export const Title = ({ children, style, ...props }) => (
  <Text
    style={[styles.title, style]}
    {...props}
  >
    {children}
  </Text>
);

export const Paragraph = ({ children, style, ...props }) => (
  <Text
    style={styles.paragraph}
    {...props}
  >
    {children}
  </Text>
);

export const Small = ({ children, style, ...props }) => (
  <Text
    style={styles.small}
    {...props}
  >
    {children}
  </Text>
);

export const Tab = ({ children, style, ...props }) => (
  <Text
    style={styles.tab}
    {...props}
  >
    {children}
  </Text>
);

const styles = StyleSheet.create({
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fonts.size.title,
    color: theme.colors.primaryTextWhite,
    marginBottom: 12,
  },
  paragraph: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fonts.size.body,
    color: theme.colors.primaryTextWhite,
    marginBottom: 4,
  },
  small: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fonts.size.small,
    color: theme.colors.primaryTextWhite,
  },
  tab: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fonts.size.tab,
    color: theme.colors.primaryTextWhite,
  },
});