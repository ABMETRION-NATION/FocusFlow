import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../src/theme';
import { getAuthed, setAuthed } from '../src/lib/storage';

const BG_IMAGE =
  'https://static.prod-images.emergentagent.com/jobs/392f8cce-4ef5-416a-8416-4d2f52b06b76/images/3821690704ff98378afc30e27814e824655e28f45c96bed949be2ec9c43547ef.png';

export default function AuthScreen() {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);
  const [busy, setBusy] = React.useState<'google' | 'facebook' | null>(null);

  React.useEffect(() => {
    (async () => {
      const authed = await getAuthed();
      setChecking(false);
      if (authed) {
        router.replace('/(tabs)/timer');
      }
    })();
  }, [router]);

  const handleLogin = async (provider: 'google' | 'facebook') => {
    setBusy(provider);
    // Placeholder auth - real OAuth can be wired here later.
    setTimeout(async () => {
      await setAuthed(true);
      setBusy(null);
      router.replace('/(tabs)/timer');
    }, 450);
  };

  const continueAsGuest = async () => {
    await setAuthed(true);
    router.replace('/(tabs)/timer');
  };

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <ImageBackground
      source={{ uri: BG_IMAGE }}
      style={styles.bg}
      imageStyle={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>FocusFlow</Text>
        </View>

        <View style={styles.heroWrap}>
          <Text style={styles.heroTitle}>Deep{'\n'}Focus.</Text>
          <Text style={styles.heroSubtitle}>
            Master your time. Build unstoppable momentum.
          </Text>
        </View>

        <View style={styles.authBlock}>
          <TouchableOpacity
            style={styles.socialBtn}
            activeOpacity={0.85}
            onPress={() => handleLogin('google')}
            disabled={busy !== null}
            testID="auth-google-button"
          >
            {busy === 'google' ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <>
                <AntDesign
                  name="google"
                  size={20}
                  color={theme.colors.textPrimary}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.socialBtnSpacing]}
            activeOpacity={0.85}
            onPress={() => handleLogin('facebook')}
            disabled={busy !== null}
            testID="auth-facebook-button"
          >
            {busy === 'facebook' ? (
              <ActivityIndicator color={theme.colors.textPrimary} />
            ) : (
              <>
                <AntDesign
                  name="facebook"
                  size={20}
                  color={theme.colors.textPrimary}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialText}>Continue with Facebook</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestBtn}
            activeOpacity={0.7}
            onPress={continueAsGuest}
            testID="auth-guest-button"
          >
            <Feather name="arrow-right" size={16} color={theme.colors.accent} />
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Social login is a UI placeholder for demo purposes.
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: theme.colors.bg },
  bgImage: { opacity: 0.55 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  loading: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: theme.spacing.sm,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  logoText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroWrap: {
    marginTop: 'auto',
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    maxWidth: 320,
  },
  authBlock: {
    marginTop: theme.spacing.sm,
  },
  socialBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  socialBtnSpacing: {
    marginTop: theme.spacing.md,
  },
  socialIcon: { marginRight: 10 },
  socialText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  guestBtn: {
    marginTop: theme.spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  guestText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: theme.spacing.md,
    color: theme.colors.textDisabled,
    fontSize: 12,
    textAlign: 'center',
  },
});
