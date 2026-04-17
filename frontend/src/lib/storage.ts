import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  settings: 'focusflow:settings',
  auth: 'focusflow:auth',
  sessionsFallback: 'focusflow:sessions',
};

export type AppSettings = {
  soundEnabled: boolean;
  selectedSound: string; // 'chime' | 'bell' | 'none' | custom uri
  customSoundUri?: string | null;
  notificationsEnabled: boolean;
  darkTheme: boolean;
  focusMinutes: number;
  breakMinutes: number;
};

export const defaultSettings: AppSettings = {
  soundEnabled: true,
  selectedSound: 'chime',
  customSoundUri: null,
  notificationsEnabled: false,
  darkTheme: true,
  focusMinutes: 25,
  breakMinutes: 5,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(s));
}

export async function setAuthed(v: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.auth, v ? '1' : '0');
}

export async function getAuthed(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEYS.auth);
  return v === '1';
}

export type LocalSession = {
  id: string;
  duration_seconds: number;
  label?: string | null;
  mode: string;
  completed_at: string;
};

export async function appendLocalSession(s: LocalSession): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.sessionsFallback);
  const arr: LocalSession[] = raw ? JSON.parse(raw) : [];
  arr.unshift(s);
  await AsyncStorage.setItem(KEYS.sessionsFallback, JSON.stringify(arr.slice(0, 500)));
}

export async function getLocalSessions(): Promise<LocalSession[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessionsFallback);
  return raw ? JSON.parse(raw) : [];
}
