// src/config.js
// Central API URL — reads VITE_API_URL at build time, falls back to local dev server.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default API_BASE_URL;
