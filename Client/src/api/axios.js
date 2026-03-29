import axios from 'axios';
import toast from 'react-hot-toast';

// In production: direct backend URL (no proxy available on Vercel)
// In development: /api goes through Vite proxy to localhost:5000
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  // withCredentials only needed if using cookies — we use Bearer tokens in localStorage
  // Setting this to true in production causes CORS preflight to require exact origin match
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Attach access token to every request ───────────────────────────────────────
api.interceptors.request.use(function(config) {
  var token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

// ── Token refresh + error handling ────────────────────────────────────────────
var isRefreshing = false;
var pendingRequests = [];

var processPending = function(error, token) {
  pendingRequests.forEach(function(cb) {
    if (error) cb.reject(error);
    else cb.resolve(token);
  });
  pendingRequests = [];
};

api.interceptors.response.use(
  function(response) { return response; },
  async function(error) {
    var original = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !original._retry &&
      original.url &&
      !original.url.includes('/auth/refresh') &&
      !original.url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          pendingRequests.push({ resolve: resolve, reject: reject });
        }).then(function(token) {
          original.headers.Authorization = 'Bearer ' + token;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        var refreshToken = localStorage.getItem('refreshToken');
        var response = await api.post('/auth/refresh', { refreshToken: refreshToken });
        var newToken = response.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.common.Authorization = 'Bearer ' + newToken;
        processPending(null, newToken);
        original.headers.Authorization = 'Bearer ' + newToken;
        return api(original);
      } catch (refreshError) {
        processPending(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    var silent = ['/auth/login', '/auth/register', '/auth/refresh'];
    var isSilent = silent.some(function(u) { return original.url && original.url.includes(u); });

    if (!isSilent && error.response && error.response.status !== 401) {
      var message = (error.response.data && error.response.data.message) || 'Something went wrong';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;