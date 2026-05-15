// Genom v4 API client — connects to Cloudflare backend

const API_BASE = ''; // same origin (Cloudflare Pages same domain)

async function request(method, path, data) {
  const token = localStorage.getItem('genom_v4_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (data) opts.body = JSON.stringify(data);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export function isLoggedIn() {
  return !!localStorage.getItem('genom_v4_token');
}

export function getUser() {
  const u = localStorage.getItem('genom_v4_user');
  return u ? JSON.parse(u) : null;
}

export async function register(email, password, name) {
  const res = await request('POST', '/api/register', { email, password, name });
  localStorage.setItem('genom_v4_token', res.token);
  localStorage.setItem('genom_v4_user', JSON.stringify(res.user));
  return res.user;
}

export async function login(email, password) {
  const res = await request('POST', '/api/login', { email, password });
  localStorage.setItem('genom_v4_token', res.token);
  localStorage.setItem('genom_v4_user', JSON.stringify(res.user));
  return res.user;
}

export function logout() {
  localStorage.removeItem('genom_v4_token');
  localStorage.removeItem('genom_v4_user');
}

export async function getPersonas() {
  const res = await request('GET', '/api/personas');
  return res.personas;
}

export async function savePersona(id, name, data) {
  const res = await request('POST', '/api/personas', { id, name, data });
  return res.persona;
}

export async function deletePersona(id) {
  await request('DELETE', `/api/personas/${id}`);
}

export async function analyzeText(text) {
  const res = await request('POST', '/api/analyze', { text });
  return res.analysis;
}
