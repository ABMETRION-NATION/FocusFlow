import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../src/theme';
import CircularTimer from '../../src/components/CircularTimer';
import { api } from '../../src/lib/api';
import {
  AppSettings,
  appendLocalSession,
  defaultSettings,
  loadSettings,
  saveSettings,
} from '../../src/lib/storage';
import { playSound } from '../../src/lib/sound';
import { ensureNotificationSetup, notifySessionComplete } from '../../src/lib/notifications';

type Mode = 'focus' | 'break';

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TimerScreen() {
  const [settings, setSettings] = React.useState<AppSettings>(defaultSettings);
  const [mode, setMode] = React.useState<Mode>('focus');
  const [targetSeconds, setTargetSeconds] = React.useState(25 * 60);
  const [remaining, setRemaining] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [label, setLabel] = React.useState<string>('Focus');
  const [showLabelModal, setShowLabelModal] = React.useState(false);
  const [showCustomModal, setShowCustomModal] = React.useState(false);
  const [customFocus, setCustomFocus] = React.useState('25');
  const [customBreak, setCustomBreak] = React.useState('5');
  const [tempLabel, setTempLabel] = React.useState('Focus');

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionCompleteRef = React.useRef(false);

  // Load settings on mount
  React.useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      const seconds = s.focusMinutes * 60;
      setTargetSeconds(seconds);
      setRemaining(seconds);
    })();
  }, []);

  // Swap target seconds when mode switches
  React.useEffect(() => {
    const secs = mode === 'focus' ? settings.focusMinutes * 60 : settings.breakMinutes * 60;
    setTargetSeconds(secs);
    setRemaining(secs);
    setRunning(false);
  }, [mode, settings.focusMinutes, settings.breakMinutes]);

  // Countdown
  React.useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => (r > 0 ? r - 1 : 0));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Handle completion
  React.useEffect(() => {
    if (remaining === 0 && running && !sessionCompleteRef.current) {
      sessionCompleteRef.current = true;
      setRunning(false);
      (async () => {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            // ignore
          }
        }
        if (settings.soundEnabled) {
          await playSound(settings.selectedSound, settings.customSoundUri);
        }
        if (settings.notificationsEnabled) {
          await notifySessionComplete(
            mode === 'focus' ? 'Focus session complete' : 'Break over',
            mode === 'focus' ? 'Great work! Time for a break.' : 'Back to focus mode.',
          );
        }
        // persist focus sessions only
        if (mode === 'focus') {
          const payload = {
            duration_seconds: targetSeconds,
            label: label || null,
            mode: 'focus',
          };
          try {
            await api.createSession(payload);
          } catch {
            await appendLocalSession({
              id: `local-${Date.now()}`,
              duration_seconds: targetSeconds,
              label,
              mode: 'focus',
              completed_at: new Date().toISOString(),
            });
          }
        }
      })();
    }
    if (remaining > 0) {
      sessionCompleteRef.current = false;
    }
  }, [
    remaining,
    running,
    mode,
    targetSeconds,
    label,
    settings.soundEnabled,
    settings.selectedSound,
    settings.customSoundUri,
    settings.notificationsEnabled,
  ]);

  const progress = targetSeconds > 0 ? 1 - remaining / targetSeconds : 0;

  const toggleRun = async () => {
    if (!running) {
      if (settings.notificationsEnabled) {
        await ensureNotificationSetup();
      }
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
          // ignore
        }
      }
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(targetSeconds);
  };

  const applyCustom = async () => {
    const f = Math.max(1, Math.min(180, parseInt(customFocus, 10) || 25));
    const b = Math.max(1, Math.min(60, parseInt(customBreak, 10) || 5));
    const next = { ...settings, focusMinutes: f, breakMinutes: b };
    setSettings(next);
    await saveSettings(next);
    setMode('focus');
    setShowCustomModal(false);
  };

  const saveLabel = () => {
    setLabel(tempLabel.trim() || 'Focus');
    setShowLabelModal(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Stay in flow</Text>
            <Text style={styles.title}>FocusFlow</Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowCustomModal(true)}
            testID="custom-timer-open-button"
          >
            <Feather name="sliders" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Mode switcher */}
        <View style={styles.modeSwitch} testID="mode-switcher">
          <Pressable
            onPress={() => setMode('focus')}
            style={[styles.modeBtn, mode === 'focus' && styles.modeBtnActive]}
            testID="mode-focus-button"
          >
            <Text
              style={[styles.modeText, mode === 'focus' && styles.modeTextActive]}
            >
              Focus · {settings.focusMinutes}m
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('break')}
            style={[styles.modeBtn, mode === 'break' && styles.modeBtnActive]}
            testID="mode-break-button"
          >
            <Text
              style={[styles.modeText, mode === 'break' && styles.modeTextActive]}
            >
              Break · {settings.breakMinutes}m
            </Text>
          </Pressable>
        </View>

        {/* Label chip */}
        <TouchableOpacity
          style={styles.labelChip}
          onPress={() => {
            setTempLabel(label);
            setShowLabelModal(true);
          }}
          activeOpacity={0.75}
          testID="timer-task-chip"
        >
          <Feather name="tag" size={14} color={theme.colors.accent} />
          <Text style={styles.labelChipText} numberOfLines={1}>
            {label}
          </Text>
          <Feather name="edit-2" size={12} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Circular Timer */}
        <View style={styles.timerWrap}>
          <CircularTimer
            progress={progress}
            timeLabel={formatTime(remaining)}
            subLabel={mode === 'focus' ? 'FOCUS' : 'BREAK'}
          />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={reset}
            testID="timer-reset-button"
          >
            <Feather name="rotate-ccw" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={toggleRun}
            activeOpacity={0.85}
            testID="timer-play-button"
          >
            <Feather
              name={running ? 'pause' : 'play'}
              size={30}
              color="#FFFFFF"
              style={{ marginLeft: running ? 0 : 3 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setMode(mode === 'focus' ? 'break' : 'focus');
            }}
            testID="timer-swap-button"
          >
            <Feather name="repeat" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          {running
            ? 'Locked in. Distractions off.'
            : mode === 'focus'
              ? 'Press play to start a focus session.'
              : 'Take a breather. You earned it.'}
        </Text>
      </ScrollView>

      {/* Label Modal */}
      <Modal
        visible={showLabelModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLabelModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLabelModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Session Label</Text>
            <Text style={styles.modalSub}>Tag your focus session for history.</Text>
            <TextInput
              style={styles.input}
              value={tempLabel}
              onChangeText={setTempLabel}
              placeholder="e.g. Study, Deep Work"
              placeholderTextColor={theme.colors.textDisabled}
              testID="label-input"
            />
            <View style={styles.quickTags}>
              {['Focus', 'Study', 'Work', 'Read', 'Code'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.quickTag}
                  onPress={() => setTempLabel(t)}
                >
                  <Text style={styles.quickTagText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={saveLabel}
              testID="label-save-button"
            >
              <Text style={styles.primaryBtnText}>Save Label</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom timer modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCustomModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Custom Timer</Text>
            <Text style={styles.modalSub}>Set your focus and break lengths (minutes).</Text>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Focus</Text>
                <TextInput
                  style={styles.input}
                  value={customFocus}
                  onChangeText={setCustomFocus}
                  keyboardType="number-pad"
                  maxLength={3}
                  testID="custom-timer-focus-input"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Break</Text>
                <TextInput
                  style={styles.input}
                  value={customBreak}
                  onChangeText={setCustomBreak}
                  keyboardType="number-pad"
                  maxLength={3}
                  testID="custom-timer-break-input"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (!customFocus || !customBreak) {
                  Alert.alert('Please enter both values');
                  return;
                }
                applyCustom();
              }}
              testID="custom-timer-start-button"
            >
              <Text style={styles.primaryBtnText}>Apply & Start Focus</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: theme.colors.bgTertiary,
  },
  modeText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modeTextActive: {
    color: theme.colors.textPrimary,
  },
  labelChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    maxWidth: 260,
  },
  labelChipText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  timerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.md,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    marginTop: theme.spacing.xl,
  },
  playBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  secondaryBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    fontSize: 14,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  modalSub: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  input: {
    height: 56,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  quickTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTag: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickTagText: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    marginTop: 6,
    height: 56,
    backgroundColor: theme.colors.accent,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 8 },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
});
