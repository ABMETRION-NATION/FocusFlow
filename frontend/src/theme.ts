export const theme = {
  colors: {
    bg: '#0A0A0A',
    bgSecondary: '#171717',
    bgTertiary: '#262626',
    accent: '#0066FF',
    accentGlow: '#00E5FF',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textDisabled: '#525252',
    border: '#262626',
    success: '#10B981',
    error: '#EF4444',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
};

export type Theme = typeof theme;
