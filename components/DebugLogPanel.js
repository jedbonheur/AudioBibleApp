import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import theme from '@theme/theme';
import {
  subscribeBgLogs,
  getBgLogs,
  clearBgLogs,
  isBgAppListenerAttached,
} from '../utils/LogBuffer';

const MAX_LOGS = 200;

export default function DebugLogPanel({ visible, onClose }) {
  const [logs, setLogs] = useState(getBgLogs());
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Sync with global buffer and live updates
    const unsub = subscribeBgLogs((all) => {
      if (paused) return;
      setLogs(all);
      try {
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
        });
      } catch {}
    });
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [paused]);

  useEffect(() => {
    // If app-level listener didn't attach, try attaching here as a fallback (iOS only)
    if (Platform.OS !== 'ios') return;
    if (isBgAppListenerAttached()) return;
    let sub = null;
    try {
      const { BackgroundMusicManager } = NativeModules;
      if (!BackgroundMusicManager) return;
      const emitter = new NativeEventEmitter(BackgroundMusicManager);
      sub = emitter.addListener('BackgroundMusicEvent', () => {});
    } catch {}
    return () => {
      try {
        sub && sub.remove && sub.remove();
      } catch {}
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Background Music Logs</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => setPaused((p) => !p)} style={styles.btn}>
                <Text style={styles.btnText}>{paused ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  clearBgLogs();
                  setLogs([]);
                }}
                style={styles.btn}
              >
                <Text style={styles.btnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.btn}>
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {logs.length === 0 ? (
              <Text style={styles.empty}>No logs yet… start playback to see events.</Text>
            ) : (
              logs.map((l, idx) => (
                <Text key={idx} style={styles.line}>
                  {l.line}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: theme.colors?.backgroundBlueNavy || '#0d1520',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 12,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: theme.colors?.primaryTextWhite || '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    marginLeft: 8,
  },
  btnText: {
    color: theme.colors?.primaryTextWhite || '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    maxHeight: '80%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  line: {
    color: theme.colors?.primaryTextGrey || '#ddd',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    marginVertical: 2,
  },
  empty: {
    color: theme.colors?.primaryTextGrey || '#bbb',
    fontSize: 13,
  },
});
