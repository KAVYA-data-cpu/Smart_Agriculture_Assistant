/* ==========================================================================
   api.js — Single Fetch API layer for the existing FastAPI backend.
   No endpoints are invented here: every method maps 1:1 to a documented route.
   ========================================================================== */

/**
 * Base URL of the FastAPI backend.
 * Order of precedence:
 *   1. localStorage key "saa.apiBase" (editable from the navbar settings button)
 *   2. window.API_BASE_URL injected before this script
 *   3. Auto-detected from window.location.origin when served by FastAPI in production
 *      (i.e. NOT localhost, NOT a file:// URL, NOT a localtunnel URL)
 *   4. http://localhost:8000 (FastAPI dev default)
 */
function _detectDefaultBase() {
  const origin = window.location.origin;
  const host   = window.location.hostname;
  // If we're being served FROM the FastAPI server itself (Render / any real host),
  // the backend IS the same origin — no need to configure anything.
  if (
    origin !== 'null' &&                       // not file://
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    !host.endsWith('.loca.lt') &&              // not a localtunnel dev URL
    !host.endsWith('.ngrok.io') &&             // not ngrok
    !host.endsWith('.ngrok-free.app')
  ) {
    return origin;   // ← production: same server serves API + frontend
  }
  return 'http://localhost:8000';              // ← local dev default
}
const DEFAULT_API_BASE = _detectDefaultBase();

const API = (() => {
  const STORE_KEY = 'saa.apiBase';

  function getBase() {
    const saved = localStorage.getItem(STORE_KEY);
    return (saved || window.API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, '');
  }

  function setBase(url) {
    localStorage.setItem(STORE_KEY, String(url || '').trim().replace(/\/+$/, ''));
  }

  /** Build a full URL, optionally with query params. */
  function url(path, params) {
    const full = getBase() + (path.startsWith('/') ? path : '/' + path);
    if (!params) return full;
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return qs ? `${full}?${qs}` : full;
  }

  /** Normalised error so every page can show a friendly message. */
  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
    }
  }

  async function parse(res) {
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) return res.json();
    if (type.startsWith('audio/') || type.includes('octet-stream')) return res.blob();
    return res.text();
  }

  /** Core request helper — all traffic goes through here. */
  async function request(path, { method = 'GET', body, params, headers = {}, signal, timeout = 60000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    if (signal) signal.addEventListener('abort', () => controller.abort());

    const opts = { method, headers: { Accept: 'application/json', ...headers }, signal: controller.signal };

    if (body instanceof FormData) {
      opts.body = body; // browser sets the multipart boundary
    } else if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url(path, params), opts);
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new ApiError('The request timed out. Please try again.', 0);
      throw new ApiError(
        `Cannot reach the backend at ${getBase()}. Check that FastAPI is running and CORS is enabled.`, 0
      );
    }
    clearTimeout(timer);

    const data = await parse(res).catch(() => null);
    if (!res.ok) {
      const detail = data && (data.detail || data.message || data.error);
      throw new ApiError(
        typeof detail === 'string' ? detail : `Request failed (${res.status} ${res.statusText})`,
        res.status,
        data
      );
    }
    return data;
  }

  return {
    ApiError, getBase, setBase, url, request,

    /* ---------------- Crop recommendation ---------------- */
    predictCrop: (payload) => request('/predict', { method: 'POST', body: payload }),
    history: (params) => request('/history', { params }),

    /* ---------------- Fertilizer ---------------- */
    predictFertilizer: (payload) => request('/fertilizer/predict', { method: 'POST', body: payload }),
    fertilizerHistory: (params) => request('/fertilizer/history', { params }),

    /* ---------------- Soil health ---------------- */
    uploadSoilReport: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return request('/soil/upload', { method: 'POST', body: fd, timeout: 120000 });
    },

    /* ---------------- Plant disease ---------------- */
    detectDisease: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return request('/disease/detect', { method: 'POST', body: fd, timeout: 120000 });
    },

    /* ---------------- Market intelligence ---------------- */
    marketPrice: (body) =>
      request('/market/price', { method: 'POST', body }),

    nearbyMarkets: (body) =>
      request('/market/nearby', { method: 'POST', body }),

    marketHistory: (body) =>
      request('/market/history', { method: 'POST', body }),

    marketTrend: (body) =>
      request('/market/trend', { method: 'POST', body }),

    marketDemand: (body) =>
      request('/market/demand', { method: 'POST', body }),

    marketRecommendation: (body) =>
      request('/market/recommendation', { method: 'POST', body }),

    marketPredict: (body) =>
      request('/market/predict', { method: 'POST', body }),

    marketFullReport: (body) =>
      request('/market/full-report', { method: 'POST', body }),

    /* ---------------- News ---------------- */
    newsLatest: () => request('/news/latest'),
    newsCategory: (category) => request(`/news/category/${encodeURIComponent(category)}`),
    newsDashboard: () => request('/news/dashboard'),

    /* ---------------- Chatbot ---------------- */
    askChatbot: (payload) => request('/chatbot/ask', { method: 'POST', body: payload }),
    chatSessions: () => request('/chatbot/sessions'),
    chatSession: (id) => request(`/chatbot/sessions/${encodeURIComponent(id)}`),

    /* ---------------- Voice ---------------- */
    transcribe: (blob, filename = 'recording.webm') => {
      const fd = new FormData();
      fd.append('file', blob, filename);
      return request('/voice/transcribe', { method: 'POST', body: fd, timeout: 120000 });
    },
    speak: (text, extra = {}) => request('/voice/speak', { method: 'POST', body: { text, ...extra } }),
  };
})();

window.API = API;