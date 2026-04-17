# FocusFlow — PRD

## Overview
FocusFlow is a dark-themed Pomodoro/focus timer Expo React Native app with a minimal FastAPI backend backed by MongoDB. Tracks focus sessions with stats, streaks, history, and customisable sounds.

## Stack
- **Frontend**: Expo SDK 54, expo-router, react-native-svg, react-native-reanimated, expo-audio, expo-notifications, AsyncStorage, expo-document-picker
- **Backend**: FastAPI + Motor (MongoDB)
- **Theme**: Charcoal/black (#0A0A0A) with Electric Blue (#0066FF) accent

## Features implemented
1. **Auth (UI placeholder)** — Google / Facebook / Continue as Guest buttons on immersive dark background
2. **Circular Focus Timer** — 25/5 presets, custom modal, animated SVG progress arc (reanimated)
3. **Session tracking** — Labels (Study, Work, Read, Code, custom), auto-save to MongoDB
4. **Stats screen** — Sessions today, streak, focus time today, total focus time
5. **History screen** — FlatList of past sessions with date/label/duration, long-press to delete
6. **Settings** — Sound toggle + picker (chime / bell / digital / silent / custom upload), local notifications toggle with permission flow, dark-theme toggle, sign-out
7. **Local notifications** on session complete (real, via expo-notifications)
8. **Sound on complete** with 3 presets + upload own audio file via DocumentPicker

## Backend API (`/api`)
- `GET /health`
- `POST /sessions` — create
- `GET /sessions?user_id=&limit=` — list
- `DELETE /sessions/{id}` — delete
- `GET /sessions/stats?user_id=` — today count, today seconds, all-time seconds, streak

## Data model
MongoDB `sessions` collection: `{ id, duration_seconds, label, mode, user_id, completed_at }` (no `_id` returned).

## Notes
- Auth persisted in AsyncStorage (`focusflow:auth`).
- Fallback to local AsyncStorage if backend unreachable when persisting sessions.
- No real OAuth wired — placeholder taps set authed=true for demo flow.
