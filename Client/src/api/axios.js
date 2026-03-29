import axios from 'axios';
import toast from 'react-hot-toast';

// In production (Vercel): VITE_API_URL = https://drip-backend-3alw.onrender.com/api
// In development (local): falls back to /api which Vite proxies to localhost:5000
var BASE_URL = import.meta.env.VITE_API_URL || '/api';

var api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,   // using Bearer tokens, not cookies — keep false always
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach Bearer token to every request
api.interceptors.request.use(function(config) {
  var token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

// Auto-refresh on 401
var isRefreshing = false;
var queue = [];

function processQueue(error, token) {
  queue.forEach(function(p) { error ? p.reject(error) : p.resolve(token); });
  queue = [];
}

api.interceptors.response.use(
  function(res) { return res; },
  async function(error) {
    var original = error.config;
    var status   = error.response ? error.response.status : null;
    var url      = original ? original.url : '';

    // Auto-refresh on 401 (except on auth endpoints themselves)
    if (
      status === 401 &&
      !original._retry &&
      url &&
      !url.includes('/auth/refresh') &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register')
    ) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          queue.push({ resolve: resolve, reject: reject });
        }).then(function(token) {
          original.headers.Authorization = 'Bearer ' + token;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      var storedRefresh = localStorage.getItem('refreshToken');

      try {
        var r = await axios.post(BASE_URL + '/auth/refresh', { refreshToken: storedRefresh }, {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: false,
        });
        var newToken = r.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        if (r.data.refreshToken) localStorage.setItem('refreshToken', r.data.refreshToken);
        api.defaults.headers.common.Authorization = 'Bearer ' + newToken;
        processQueue(null, newToken);
        original.headers.Authorization = 'Bearer ' + newToken;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Don't show toast for auth endpoint errors (handled by each page)
    var silentUrls = ['/auth/login', '/auth/register', '/auth/refresh'];
    var isSilent   = silentUrls.some(function(u) { return url && url.includes(u); });

    if (!isSilent && status && status !== 401) {
      var msg = error.response && error.response.data && error.response.data.message
        ? error.response.data.message
        : 'Something went wrong';
      toast.error(msg);
    }

    return Promise.reject(error);
  }
);

export default api;