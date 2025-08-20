// ...existing code...
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '@theme/theme';
import { Paragraph } from '@typography/Typography';

// ...existing code...
const getFirstLetterUppercase = (name) => {
  if (!name || typeof name !== 'string') return '';
  const match = name.match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : '';
};

const BookListItem = ({ item, isSelected, onPress }) => {
  const categoryColor = theme.bibleCategory[item.category] || theme.colors.secondaryOrange;

  // SVG-only dynamic require (expects react-native-svg-transformer / metro configured)
  const getBookIconComponent = (bookName) => {
    if (!bookName || typeof bookName !== 'string') return null;
    // sanitize filename: remove spaces and unsafe chars
    const fileName = bookName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
    try {
      const mod = require(`../assets/bible_icons/${fileName}.svg`);
      return mod?.default || mod;
    } catch (err) {
      try {
        const fallback = require('../assets/bible_icons/default.svg');
        return fallback?.default || fallback;
      } catch (e) {
        return null;
      }
    }
  };

  const IconComponent = getBookIconComponent(item.name);

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(item)}
      style={[styles.row, isSelected && styles.selectedRow]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
      activeOpacity={0.7}
    >
      {/* Left box */}
      <View style={styles.bookBox}>
        {IconComponent ? (
          // SVG component returned by require; adjust width/height as needed
          <IconComponent width={44} height={44} />
        ) : (
          <View style={styles.bookIconPlaceholder} />
        )}
      </View>

      {/* Middle content */}
      <View style={styles.textContainer}>
        <Paragraph style={isSelected && styles.selectedText}>{item.name}</Paragraph>
        <Text style={styles.subText}>{item.chapters} Chapters</Text>
      </View>

      {/* Right arrow */}
      <Ionicons name="chevron-forward-outline" size={20} color={theme.colors.secondary} />

      {/* Divider */}
      <View style={styles.divider} />
    </TouchableOpacity>
  );
};

export default BookListItem;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    position: 'relative',
    paddingBottom: 16,
  },
  bookBox: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bookIconPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.secondary,
    borderRadius: 4,
  },
  bookHinge: {
    width: 2,
    height: 60,
    backgroundColor: theme.colors.secondary,
    left: '0%',
    position: 'absolute',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  bookLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    position: 'absolute',
    bottom: '10%',
    right: '2%',
  },
  bookName: {
    fontSize: 4,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
    position: 'absolute',
    top: '10%',
    left: '6%',
    textTransform: 'uppercase',
  },
  textContainer: {
    flex: 1, // push arrow to right
  },
  selectedRow: {
    backgroundColor: theme.colors.highlight,
  },
  subText: {
    color: theme.colors.primaryTextGrey,
    fontSize: 12,
  },
  selectedText: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 0, // align after bookBox
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.secondary,
  },
});