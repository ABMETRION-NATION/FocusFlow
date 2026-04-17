import { createAudioPlayer, setAudioModeAsync, AudioSource } from 'expo-audio';

// Built-in chime options (use simple URLs to remote mp3 samples so bundle stays small).
// These are public sound samples that can be swapped for local assets if desired.
export const BUILT_IN_SOUNDS: Record<string, string> = {
  chime: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  bell: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg',
  digital: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
};

export async function primeAudio(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  } catch {
    // silent
  }
}

export async function playSound(selected: string, customUri?: string | null): Promise<void> {
  try {
    let source: AudioSource | null = null;
    if (selected === 'custom' && customUri) {
      source = { uri: customUri };
    } else if (BUILT_IN_SOUNDS[selected]) {
      source = { uri: BUILT_IN_SOUNDS[selected] };
    } else if (selected === 'none') {
      return;
    } else {
      source = { uri: BUILT_IN_SOUNDS.chime };
    }
    const player = createAudioPlayer(source);
    player.play();
    // auto-cleanup after 6 seconds
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // ignore
      }
    }, 6000);
  } catch {
    // ignore playback errors silently so app still works
  }
}
