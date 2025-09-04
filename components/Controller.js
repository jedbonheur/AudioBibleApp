import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '@theme/theme';
import Slider from '@react-native-community/slider';
import { getBackgroundMusicItems } from '@data/backgroundMusic';
const DEFAULT_MUSIC = [{ id: 'none', name: 'None', url: null }];

export default function Controller({
  visible,
  onClose,
  fontSize,
  onIncreaseFont,
  onDecreaseFont,
  selectedMusic,
  onSelectMusic,
  bgVolume = 0.3,
  onBgVolumeChange,
  bibleVolume = 1.0,
  onBibleVolumeChange,
  masterVolume = 1.0,
  onMasterVolumeChange,
  bibleRate = 1.0,
  onBibleRateChange,
  bookLabel,
  versesCount,
}) {
  const [musicOptions, setMusicOptions] = useState(DEFAULT_MUSIC);

  useEffect(() => {
    if (!visible) return;
    const items = getBackgroundMusicItems();
    setMusicOptions([...DEFAULT_MUSIC, ...items]);
  }, [visible]);

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
          <ScrollView
            style={{ maxHeight: '100%' }}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
              <Text style={styles.sectionTitle}>Background Music (hidden)</Text>
              <FlatList
                data={musicOptions}
                keyExtractor={(i) => i.id}
                scrollEnabled={false}
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
              {/* static list */}
            </View>
            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mix Volumes</Text>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.mixLabel}>Background music: {(bgVolume * 100) | 0}%</Text>
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={bgVolume}
                  onValueChange={onBgVolumeChange}
                  minimumTrackTintColor={theme.colors.primaryTextGrey}
                  maximumTrackTintColor={theme.colors.primaryTextWhite}
                />
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.mixLabel}>Bible voice: {(bibleVolume * 100) | 0}%</Text>
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={bibleVolume}
                  onValueChange={onBibleVolumeChange}
                  minimumTrackTintColor={theme.colors.primaryTextGrey}
                  maximumTrackTintColor={theme.colors.primaryTextWhite}
                />
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.mixLabel}>Bible speed: {bibleRate.toFixed(2)}x</Text>
                <Slider
                  minimumValue={0.75}
                  maximumValue={2.0}
                  step={0.05}
                  value={bibleRate}
                  onValueChange={onBibleRateChange}
                  minimumTrackTintColor={theme.colors.primaryTextGrey}
                  maximumTrackTintColor={theme.colors.primaryTextWhite}
                />
              </View>
              <View>
                <Text style={styles.mixLabel}>Master: {(masterVolume * 100) | 0}%</Text>
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={masterVolume}
                  onValueChange={onMasterVolumeChange}
                  minimumTrackTintColor={theme.colors.primaryTextGrey}
                  maximumTrackTintColor={theme.colors.primaryTextWhite}
                />
              </View>
            </View>
          </ScrollView>
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
    paddingBottom: 60,
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
