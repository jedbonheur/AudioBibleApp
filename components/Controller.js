import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '@theme/theme';

const musicOptions = [
  { id: 'none', name: 'None' },
  { id: 'soft', name: 'Soft' },
  { id: 'ambience', name: 'Ambience' },
];

export default function Controller({
  visible,
  onClose,
  fontSize,
  onIncreaseFont,
  onDecreaseFont,
  selectedMusic,
  onSelectMusic,
  bookLabel,
  versesCount,
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.boxHeader}>
            <Text style={styles.boxTitle}>Controls</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={26} color={theme.colors.primaryTextWhite} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoTitle}>{bookLabel}</Text>
            <Text style={styles.infoSub}>{versesCount} verses</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resize Text</Text>
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={onDecreaseFont}>
                <Ionicons
                  name="remove-circle-outline"
                  size={28}
                  color={theme.colors.primaryTextGrey}
                />
              </TouchableOpacity>
              <Text style={styles.fontSizeLabel}>{fontSize}px</Text>
              <TouchableOpacity style={styles.iconBtn} onPress={onIncreaseFont}>
                <Ionicons
                  name="add-circle-outline"
                  size={28}
                  color={theme.colors.primaryTextGrey}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Music Background</Text>
            <FlatList
              data={musicOptions}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.musicItem} onPress={() => onSelectMusic(item.id)}>
                  <Text
                    style={[styles.musicName, item.id === selectedMusic && styles.musicSelected]}
                  >
                    {item.name}
                  </Text>
                  {item.id === selectedMusic && (
                    <Ionicons name="checkmark" size={18} color={theme.colors.primaryTextGrey} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
          <View style={styles.divider} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(34, 8, 8, 0.45)',
    justifyContent: 'flex-end',
  },
  box: {
    backgroundColor: theme.colors.background || '#fff',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '70%',
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boxTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryTextWhite,
  },
  infoRow: { marginVertical: 8 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.primaryTextWhite },
  infoSub: { color: theme.colors.primaryTextGrey || '#666', marginTop: 4 },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.primaryTextWhite,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { paddingHorizontal: 8 },
  fontSizeLabel: { marginHorizontal: 12, fontSize: 16, color: theme.colors.primaryTextWhite },
  musicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  musicName: { fontSize: 15, color: theme.colors.primaryTextWhite },
  musicSelected: { color: theme.colors.primaryTextGrey },
  divider: {
    height: 1,
    backgroundColor: theme.colors.primaryTextGrey || '#e0e0e0',
    marginVertical: 8,
    alignSelf: 'stretch',
    marginHorizontal: -16,
  },
});
