// BookListItem.js
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Paragraph } from '@typography/Typography';
import BibleIcon from "./utils/BibleIcons"; // helper function
import theme from '@theme/theme';

const BookListItem = ({ item, isSelected, onPress }) => {
  const IconComponent = BibleIcon[item.name];
  return (
    <TouchableOpacity
      onPress={() => onPress?.(item)}
      style={[styles.row, isSelected && styles.selectedRow]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
      activeOpacity={0.7}
    >
      <View style={styles.bookBox}>
        {IconComponent ? (
          <IconComponent width={60} height={60} />
        ) : (
          <View style={styles.bookIconPlaceholder} />
        )}
      </View>

      <View style={styles.textContainer}>
        <Paragraph style={isSelected && styles.selectedText}>
          {item.name}
        </Paragraph>
        <Text style={styles.subText}>{item.chapters} Chapters</Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={20}
        color={theme.colors.secondary}
      />

      <View style={styles.divider} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  selectedRow: {
    backgroundColor: theme.colors.highlight,
  },
  bookBox: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bookIconPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: "#ccc",
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
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
    left: 12, // align after bookBox
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.secondary,
  },
});

export default BookListItem;
