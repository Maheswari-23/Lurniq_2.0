// src/services/authService.js
// Handles all API calls for auth and user profile endpoints.
// The JWT token is read/written to localStorage automatically.

const API = 'http://localhost:5000/api';

// ── Helpers ────────────────────────────────────────────────────────
function getToken() {
    return localStorage.getItem('lurniq_token');
}

function authHeaders(extra = {}) {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    };
}

async function handleResponse(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// ── Auth ───────────────────────────────────────────────────────────

/** Register a new user. Returns { token, user } */
export async function signup({ name, email, password, age_group }) {
    const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, age_group }),
    });
    const data = await handleResponse(res);
    if (data.token) localStorage.setItem('lurniq_token', data.token);
    return data;
}

/** Sign in an existing user. Returns { token, user } */
export async function signin({ email, password }) {
    const res = await fetch(`${API}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    if (data.token) localStorage.setItem('lurniq_token', data.token);
    return data;
}

/** Remove JWT from localStorage. */
export function logout() {
    localStorage.removeItem('lurniq_token');
    localStorage.removeItem('varkResult');
}

// ── User profile ───────────────────────────────────────────────────

/** Fetch the current user's profile + VARK data. */
export async function getProfile() {
    const res = await fetch(`${API}/user/profile`, { headers: authHeaders() });
    return handleResponse(res);
}

/** Persist VARK style + allScores to the database for the logged-in user. */
export async function updateVark({ style, allScores }) {
    const res = await fetch(`${API}/user/vark`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ style, allScores }),
    });
    return handleResponse(res);
}

const authService = { signup, signin, logout, getProfile, updateVark };
export default authService;
