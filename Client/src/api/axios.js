import axios from 'axios';
import toast from 'react-hot-toast';

// ── IMPORTANT: Use /api (no host) so Vite proxy forwards to backend ────────────
// Never use http://localhost:5000 directly — that causes CORS errors
const BASE_URL = 'https://drip-backend-3alw.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach access token ───────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Track refresh state to prevent infinite loops ──────────────────────────────
let isRefreshing = false;
let pendingRequests = [];

const processPending = (error, token = null) => {
  pendingRequests.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  pendingRequests = [];
};

// ── Response interceptor: auto-refresh on 401 ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url.includes('/auth/refresh') &&
      !original.url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.accessToken;
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processPending(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processPending(refreshError, null);
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const silent = ['/auth/login', '/auth/register', '/auth/refresh'];
    const isSilent = silent.some((u) => original.url?.includes(u));

    if (!isSilent && error.response?.status !== 401) {
      const message = error.response?.data?.message || 'Something went wrong';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;