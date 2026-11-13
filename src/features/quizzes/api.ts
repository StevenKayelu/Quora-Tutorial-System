import { useMemo } from 'react';
import axios from 'axios';
import useAxiosInstance from '../../utils/config/axiosInstance';
import { useAuthContext } from '../../utils/hooks/useCustomContext';

export function useQuizApi() {
  const create = useAxiosInstance();
  const { user } = useAuthContext();
  const scope = user ? `${user.role}:${user.id}` : 'anonymous';
  return useMemo(() => {
    const client = create();
    return {
      scope,
      get: async <T,>(path: string, params?: Record<string, unknown>): Promise<T> => (await client.get(`/api/quizzes${path}`, { params })).data.data,
      post: async <T,>(path: string, data?: unknown): Promise<T> => (await client.post(`/api/quizzes${path}`, data)).data.data,
      put: async <T,>(path: string, data: unknown): Promise<T> => (await client.put(`/api/quizzes${path}`, data)).data.data,
      download: async (path: string, filename: string, params?: Record<string, unknown>) => {
        let res;
        try { res = await client.get(`/api/quizzes${path}`, { responseType: 'blob', params }); }
        catch (e) {
          if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
            try {
              const body = JSON.parse(await e.response.data.text());
              if (body.message) e.response.data = body;
            } catch { /* Keep the original transport error for a non-JSON response. */ }
          }
          throw e;
        }
        const url = URL.createObjectURL(res.data);
        const link = document.createElement('a'); link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    };
  }, [create, scope]);
}
export const quizError = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : 'The request failed. Please try again.';
export const formatQuizDate = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';
export function quizAvailability(q: { status: string; eligible: boolean; settings: { starts_at: string | null; ends_at: string | null }; attempts: { status: string }[]; attempts_remaining: number }, now: number) {
  if (q.attempts.some(a => a.status === 'in_progress')) return 'In progress';
  if (q.settings.ends_at && now >= Date.parse(q.settings.ends_at)) return q.attempts.length ? 'Completed' : 'Expired';
  if (q.status !== 'published' || !q.eligible) return q.attempts.length ? 'Completed' : 'Unavailable';
  if (q.settings.starts_at && now < Date.parse(q.settings.starts_at)) return 'Upcoming';
  if (!q.attempts_remaining) return 'Completed';
  return 'Available';
}
