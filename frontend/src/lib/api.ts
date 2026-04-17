const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export type SessionRecord = {
  id: string;
  duration_seconds: number;
  label?: string | null;
  mode: string;
  user_id: string;
  completed_at: string;
};

export type StatsData = {
  sessions_today: number;
  total_focus_seconds_today: number;
  total_focus_seconds_all_time: number;
  streak_days: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  createSession: (body: {
    duration_seconds: number;
    label?: string | null;
    mode: string;
    user_id?: string;
  }) =>
    request<SessionRecord>('/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listSessions: (user_id = 'local', limit = 100) =>
    request<SessionRecord[]>(`/sessions?user_id=${encodeURIComponent(user_id)}&limit=${limit}`),
  deleteSession: (id: string, user_id = 'local') =>
    request<{ deleted: boolean }>(`/sessions/${id}?user_id=${encodeURIComponent(user_id)}`, {
      method: 'DELETE',
    }),
  getStats: (user_id = 'local') =>
    request<StatsData>(`/sessions/stats?user_id=${encodeURIComponent(user_id)}`),
};
