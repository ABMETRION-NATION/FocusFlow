import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { api, StatsData } from '../../src/lib/api';

function formatHoursMinutes(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatsScreen() {
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      const s = await api.getStats();
      setStats(s);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        <Text style={styles.eyebrow}>Performance</Text>
        <Text style={styles.header}>Your Stats</Text>

        {loading ? (
          <ActivityIndicator
            color={theme.colors.accent}
            style={{ marginTop: 40 }}
          />
        ) : error ? (
          <View style={styles.errorCard}>
            <Feather name="alert-triangle" size={20} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              <View style={[styles.card, styles.cardHalf]} testID="stats-today-card">
                <View style={styles.cardHead}>
                  <Feather name="zap" size={16} color={theme.colors.accent} />
                  <Text style={styles.cardTitle}>Today</Text>
                </View>
                <Text style={styles.cardValue} testID="stats-today-value">
                  {stats?.sessions_today ?? 0}
                </Text>
                <Text style={styles.cardUnit}>sessions</Text>
              </View>

              <View style={[styles.card, styles.cardHalf]} testID="stats-streak-card">
                <View style={styles.cardHead}>
                  <Feather name="trending-up" size={16} color={theme.colors.accent} />
                  <Text style={styles.cardTitle}>Streak</Text>
                </View>
                <Text style={styles.cardValue} testID="stats-streak-value">
                  {stats?.streak_days ?? 0}
                </Text>
                <Text style={styles.cardUnit}>days</Text>
              </View>
            </View>

            <View style={[styles.card, styles.cardFull]} testID="stats-focus-today-card">
              <View style={styles.cardHead}>
                <Feather name="clock" size={16} color={theme.colors.accent} />
                <Text style={styles.cardTitle}>Focus time today</Text>
              </View>
              <Text style={styles.cardValueLarge} testID="stats-focus-today-value">
                {formatHoursMinutes(stats?.total_focus_seconds_today ?? 0)}
              </Text>
            </View>

            <View style={[styles.card, styles.cardFull]} testID="stats-total-card">
              <View style={styles.cardHead}>
                <Feather name="award" size={16} color={theme.colors.accent} />
                <Text style={styles.cardTitle}>Total focus time</Text>
              </View>
              <Text style={styles.cardValueLarge} testID="stats-total-value">
                {formatHoursMinutes(stats?.total_focus_seconds_all_time ?? 0)}
              </Text>
              <Text style={styles.cardFoot}>All sessions combined</Text>
            </View>
          </>
        )}
      </ScrollView>
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
  header: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHalf: { flex: 1 },
  cardFull: { marginBottom: 12 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cardTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardValue: {
    color: theme.colors.textPrimary,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  cardValueLarge: {
    color: theme.colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  cardUnit: { color: theme.colors.textSecondary, marginTop: 4, fontSize: 13 },
  cardFoot: {
    color: theme.colors.textDisabled,
    fontSize: 12,
    marginTop: 6,
  },
  errorCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  errorText: { color: theme.colors.textSecondary, fontSize: 14, flex: 1 },
});
