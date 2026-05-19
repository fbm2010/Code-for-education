import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { usePrefsStore } from '../stores/prefsStore';
import { detectBandwidth } from './connectivity';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/v1`,
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const bw = detectBandwidth();
  config.headers['X-ZeroLink-Bandwidth'] = bw === 'low' ? 'low' : 'normal';
  const lang = usePrefsStore.getState().prefs?.primaryLanguage ?? 'en';
  config.headers['X-ZeroLink-Language'] = lang;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearUser();
    }
    return Promise.reject(err);
  },
);
