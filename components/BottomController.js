import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '@theme/theme';

export default function BottomController({
  book,
  versesCount = 0,
  onSettingsPress,
  onPlayPress,
  categoryColor,
}) {
  const bg = categoryColor || theme.bibleCategory[book?.category] || 'rgba(0,0,0,0.45)';

  return (
    <View style={styles.bottomControllerWrapper} pointerEvents="box-none">
      <View style={[styles.bottomController, { backgroundColor: bg }]}>
        <View style={styles.leftGroup}>
          <TouchableOpacity style={styles.playBtn} onPress={onPlayPress}>
            <Ionicons name="play" size={40} color="white" />
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.controllerTitle}>
              {book?.name} {book?.chapter}
            </Text>
            <Text style={styles.controllerSub}>{versesCount} verses</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.settingsBtn} onPress={onSettingsPress}>
          <Ionicons name="options-outline" size={40} color={theme.colors.greyverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomControllerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bottomController: {
    paddingHorizontal: 12,
    paddingVertical: 18,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor: theme.colors.primary || '#1e90ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controllerTitle: {
    color: theme.colors.primaryTextWhite,
    fontSize: 18,
    fontWeight: '600',
  },
  controllerSub: {
    color: theme.colors.primaryTextWhite,
    fontSize: 12,
  },
  settingsBtn: {
    padding: 6,
  },
});
