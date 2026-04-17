import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import {
  AppSettings,
  defaultSettings,
  loadSettings,
  saveSettings,
  setAuthed,
} from '../../src/lib/storage';
import { BUILT_IN_SOUNDS, playSound } from '../../src/lib/sound';
import { ensureNotificationSetup } from '../../src/lib/notifications';

const SOUND_OPTIONS: { key: string; label: string }[] = [
  { key: 'chime', label: 'Chime' },
  { key: 'bell', label: 'Bell' },
  { key: 'digital', label: 'Digital' },
  { key: 'none', label: 'Silent' },
  { key: 'custom', label: 'Custom Upload' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = React.useState<AppSettings>(defaultSettings);
  const [showSoundPicker, setShowSoundPicker] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
    })();
  }, []);

  const update = async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  };

  const toggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await ensureNotificationSetup();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Notifications permission is required. Enable it from your device settings.',
        );
        // Still keep toggle flipped on so user knows intent; but reflect reality.
        return update({ notificationsEnabled: false });
      }
    }
    update({ notificationsEnabled: val });
  };

  const pickCustomSound = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const uri = res.assets[0].uri;
      await update({ selectedSound: 'custom', customSoundUri: uri });
      setShowSoundPicker(false);
      playSound('custom', uri);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not pick file');
    }
  };

  const chooseSound = async (key: string) => {
    if (key === 'custom') {
      await pickCustomSound();
      return;
    }
    await update({ selectedSound: key });
    if (settings.soundEnabled && key !== 'none') {
      playSound(key);
    }
    setShowSoundPicker(false);
  };

  const signOut = async () => {
    await setAuthed(false);
    router.replace('/');
  };

  const selectedLabel =
    settings.selectedSound === 'custom'
      ? 'Custom file'
      : SOUND_OPTIONS.find((o) => o.key === settings.selectedSound)?.label ?? 'Chime';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Configuration</Text>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.section}>Audio</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween} testID="settings-sound-toggle-row">
            <View style={styles.rowLeft}>
              <Feather name="volume-2" size={18} color={theme.colors.accent} />
              <View>
                <Text style={styles.rowTitle}>Sound on complete</Text>
                <Text style={styles.rowSub}>Play a chime when timer ends</Text>
              </View>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => update({ soundEnabled: v })}
              trackColor={{ true: theme.colors.accent, false: theme.colors.bgTertiary }}
              thumbColor="#FFFFFF"
              testID="settings-sound-switch"
            />
          </View>
          <View style={styles.sep} />
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={() => setShowSoundPicker(true)}
            disabled={!settings.soundEnabled}
            testID="settings-sound-picker-row"
          >
            <View style={styles.rowLeft}>
              <Feather name="music" size={18} color={theme.colors.accent} />
              <View>
                <Text
                  style={[
                    styles.rowTitle,
                    !settings.soundEnabled && { color: theme.colors.textDisabled },
                  ]}
                >
                  Sound
                </Text>
                <Text style={styles.rowSub}>Pick from presets or upload</Text>
              </View>
            </View>
            <View style={styles.valuePill}>
              <Text style={styles.valuePillText}>{selectedLabel}</Text>
              <Feather name="chevron-right" size={16} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween} testID="settings-notifications-row">
            <View style={styles.rowLeft}>
              <Feather name="bell" size={18} color={theme.colors.accent} />
              <View>
                <Text style={styles.rowTitle}>Local notifications</Text>
                <Text style={styles.rowSub}>Alert when a session ends</Text>
              </View>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ true: theme.colors.accent, false: theme.colors.bgTertiary }}
              thumbColor="#FFFFFF"
              testID="settings-notification-switch"
            />
          </View>
        </View>

        <Text style={styles.section}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween} testID="settings-theme-row">
            <View style={styles.rowLeft}>
              <Feather name="moon" size={18} color={theme.colors.accent} />
              <View>
                <Text style={styles.rowTitle}>Dark theme</Text>
                <Text style={styles.rowSub}>Recommended for focus</Text>
              </View>
            </View>
            <Switch
              value={settings.darkTheme}
              onValueChange={(v) => update({ darkTheme: v })}
              trackColor={{ true: theme.colors.accent, false: theme.colors.bgTertiary }}
              thumbColor="#FFFFFF"
              testID="settings-theme-switch"
            />
          </View>
        </View>

        <Text style={styles.section}>Timer</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowLeft}>
              <Feather name="clock" size={18} color={theme.colors.accent} />
              <View>
                <Text style={styles.rowTitle}>Focus length</Text>
                <Text style={styles.rowSub}>Minutes per focus session</Text>
              </View>
            </View>
            <Text style={styles.valueText}>{settings.focusMinutes}m</Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.rowBetween}>
            <View style={styles.rowLeft}>
              <Feather name="coffee" size={18} color={theme.colors.accent} />
              <View>
                <Text style={styles.rowTitle}>Break length</Text>
                <Text style={styles.rowSub}>Minutes per break</Text>
              </View>
            </View>
            <Text style={styles.valueText}>{settings.breakMinutes}m</Text>
          </View>
        </View>

        <Text style={styles.section}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={signOut}
            testID="settings-signout-button"
          >
            <View style={styles.rowLeft}>
              <Feather name="log-out" size={18} color={theme.colors.error} />
              <Text style={[styles.rowTitle, { color: theme.colors.error }]}>
                Sign out
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>FocusFlow · v1.0</Text>
      </ScrollView>

      <Modal
        visible={showSoundPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSoundPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSoundPicker(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose sound</Text>
            {SOUND_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.sheetRow}
                onPress={() => chooseSound(opt.key)}
                testID={`sound-option-${opt.key}`}
              >
                <Feather
                  name={opt.key === 'custom' ? 'upload' : 'play-circle'}
                  size={18}
                  color={theme.colors.accent}
                />
                <Text style={styles.sheetRowText}>{opt.label}</Text>
                {settings.selectedSound === opt.key ? (
                  <Feather
                    name="check"
                    size={18}
                    color={theme.colors.accent}
                    style={{ marginLeft: 'auto' }}
                  />
                ) : null}
              </TouchableOpacity>
            ))}
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
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  section: {
    color: theme.colors.textDisabled,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 10,
    marginTop: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  sep: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.bgTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  valuePillText: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' },
  valueText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xl,
    fontSize: 12,
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.bgSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.bgTertiary,
    marginBottom: 14,
  },
  sheetTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  sheetRowText: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
