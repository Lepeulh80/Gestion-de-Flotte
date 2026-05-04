// ============================================================
// API.JS - HTTP client + Auth state
// ============================================================

// URL dynamique : même domaine en production (Render/Hostinger), localhost en dev
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `http://${window.location.hostname}:3001/api`
  : `${window.location.protocol}//${window.location.host}/api`;

// ---- Auth state ----
const Auth = {
  getToken()  { return localStorage.getItem('fleet_token'); },
  getUser()   { const u = localStorage.getItem('fleet_user'); return u ? JSON.parse(u) : null; },
  setSession(token, user) {
    localStorage.setItem('fleet_token', token);
    localStorage.setItem('fleet_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('fleet_token');
    localStorage.removeItem('fleet_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  isAdmin()    { return this.getUser()?.role === 'admin'; },
  canWrite()   { return ['admin','manager'].includes(this.getUser()?.role); }
};

// ---- HTTP helpers ----
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (res.status === 401) {
    Auth.clear();
    showLogin();
    throw new Error('Session expirée');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur API');
  return data;
}

const API = {
  // Auth
  login:          (email, password)  => apiFetch('/auth/login',    { method: 'POST', body: { email, password } }),
  register:       (nom, email, password) => apiFetch('/auth/register', { method: 'POST', body: { nom, email, password } }),
  me:             ()                 => apiFetch('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    apiFetch('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  // Users (admin)
  getUsers:   ()       => apiFetch('/users'),
  createUser: (data)   => apiFetch('/users',    { method: 'POST',   body: data }),
  deleteUser: (id)     => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  updateUser: (id, data) => apiFetch(`/users/${id}`, { method: 'PUT', body: data }),

  // Camions
  getCamions:   ()     => apiFetch('/camions'),
  createCamion: (data) => apiFetch('/camions',      { method: 'POST',   body: data }),
  updateCamion: (id, data) => apiFetch(`/camions/${id}`, { method: 'PUT', body: data }),
  deleteCamion: (id)   => apiFetch(`/camions/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions:   (camionId) => apiFetch('/transactions' + (camionId ? `?camion_id=${camionId}` : '')),
  createTransaction: (data)     => apiFetch('/transactions',      { method: 'POST',   body: data }),
  updateTransaction: (id, data) => apiFetch(`/transactions/${id}`, { method: 'PUT',   body: data }),
  deleteTransaction: (id)       => apiFetch(`/transactions/${id}`, { method: 'DELETE' }),

  // Stats
  getStats:           (camionId) => apiFetch('/stats' + (camionId ? `?camion_id=${camionId}` : '')),
  getStatsCamions:    ()         => apiFetch('/stats/camions'),          // actifs seulement
  getStatsCamionsAll: ()         => apiFetch('/stats/camions?all=1'),    // tous les camions

  // Maintenance
  getMaintenance:      (camionId) => apiFetch('/maintenance' + (camionId ? `?camion_id=${camionId}` : '')),
  createMaintenance:   (data)     => apiFetch('/maintenance',       { method: 'POST',   body: data }),
  updateMaintenance:   (id, data) => apiFetch(`/maintenance/${id}`, { method: 'PUT',    body: data }),
  deleteMaintenance:   (id)       => apiFetch(`/maintenance/${id}`, { method: 'DELETE' }),
  getMaintenanceStats: ()         => apiFetch('/maintenance/stats'),

  // Paie
  getPaie:      (camionId, periode) => apiFetch('/paie' + (camionId ? `?camion_id=${camionId}` : '') + (periode ? `${camionId?'&':'?'}periode=${periode}` : '')),
  createPaie:   (data)     => apiFetch('/paie',       { method: 'POST',   body: data }),
  updatePaie:   (id, data) => apiFetch(`/paie/${id}`, { method: 'PUT',    body: data }),
  deletePaie:   (id)       => apiFetch(`/paie/${id}`, { method: 'DELETE' }),
  getPaieStats: ()         => apiFetch('/paie/stats'),

  // Alertes
  getAlertes:    (lue)  => apiFetch('/alertes' + (lue !== undefined ? `?lue=${lue}` : '')),
  getAlertesCount: ()   => apiFetch('/alertes/count'),
  lireAlerte:    (id)   => apiFetch(`/alertes/${id}/lire`, { method: 'PUT' }),
  lireToutAlertes: ()   => apiFetch('/alertes/lire-tout',  { method: 'PUT' }),
  deleteAlerte:  (id)   => apiFetch(`/alertes/${id}`,      { method: 'DELETE' }),
};

// ---- In-memory cache (évite les re-fetches inutiles) ----
const Cache = {
  _store: {},
  set(key, val) { this._store[key] = val; },
  get(key)      { return this._store[key]; },
  clear(key)    { if (key) delete this._store[key]; else this._store = {}; }
};
