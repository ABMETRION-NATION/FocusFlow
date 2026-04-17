import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let configured = false;

export async function ensureNotificationSetup(): Promise<boolean> {
  if (!configured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('focusflow-default', {
          name: 'FocusFlow',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch {
        // ignore
      }
    }
    configured = true;
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  } catch {
    return false;
  }
}

export async function notifySessionComplete(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // silent fail - UI still works without notifications
  }
}
