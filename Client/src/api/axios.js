import axios from 'axios';
import toast from 'react-hot-toast';

var BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ── Decode JWT payload without a library ──────────────────────────────────────
function decodeToken(token) {
  try {
    var payload = token.split('.')[1];
    var decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

// ── Check if token expires within the next N seconds ─────────────────────────
function isTokenExpiringSoon(token, withinSeconds) {
  var decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  var now     = Math.floor(Date.now() / 1000);
  return decoded.exp - now < withinSeconds;
}

var api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Request interceptor: attach token + proactive refresh ─────────────────────
api.interceptors.request.use(async function(config) {
  var token        = localStorage.getItem('accessToken');
  var refreshToken = localStorage.getItem('refreshToken');

  // Proactively refresh if token expires within 2 minutes
  // This prevents mid-request 401s for users actively using the app
  if (
    token &&
    refreshToken &&
    isTokenExpiringSoon(token, 120) &&           // expires in < 2 min
    !config.url.includes('/auth/refresh') &&
    !config.url.includes('/auth/login')
  ) {
    try {
      var r = await axios.post(BASE_URL + '/auth/refresh',
        { refreshToken: refreshToken },
        { headers: { 'Content-Type': 'application/json' }, withCredentials: false }
      );
      token = r.data.accessToken;
      localStorage.setItem('accessToken', token);
      if (r.data.refreshToken) localStorage.setItem('refreshToken', r.data.refreshToken);
    } catch {
      // Refresh failed — clear tokens and force logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(new Error('Session expired'));
    }
  }

  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

// ── Response interceptor: reactive refresh on 401 ────────────────────────────
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
    var url      = original ? (original.url || '') : '';

    if (
      status === 401 &&
      !original._retry &&
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

      if (!storedRefresh) {
        // No refresh token — just logout
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new Event('auth:logout'));
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        var r = await axios.post(BASE_URL + '/auth/refresh',
          { refreshToken: storedRefresh },
          { headers: { 'Content-Type': 'application/json' }, withCredentials: false }
        );
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

    var silentUrls = ['/auth/login', '/auth/register', '/auth/refresh'];
    var isSilent   = silentUrls.some(function(u) { return url.includes(u); });

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