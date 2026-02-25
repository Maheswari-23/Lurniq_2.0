// src/context/AuthContext.jsx
// Global auth state. Persists the JWT + user object in localStorage
// so the user stays logged in across browser sessions.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile, logout as _logout, updateVark as _updateVark } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);  // { id, name, email, vark_profile, … }
    const [authLoading, setAuthLoading] = useState(true);  // true while checking stored token

    // On mount: if a JWT exists in localStorage, fetch the user profile
    useEffect(() => {
        const token = localStorage.getItem('lurniq_token');
        if (!token) { setAuthLoading(false); return; }

        getProfile()
            .then(data => {
                if (data.success) {
                    setCurrentUser(data.user);
                    // Sync VARK to window/localStorage for the learning components
                    if (data.user.vark_profile) {
                        window.varkResult = {
                            style: data.user.vark_profile.style,
                            allScores: data.user.vark_profile.allScores,
                        };
                        localStorage.setItem('varkResult', JSON.stringify(window.varkResult));
                    }
                }
            })
            .catch(() => {
                // Token is expired / invalid — clear it
                localStorage.removeItem('lurniq_token');
            })
            .finally(() => setAuthLoading(false));
    }, []);

    /** Call after a successful signup or signin API response. */
    const handleAuthSuccess = useCallback((user) => {
        setCurrentUser(user);
        if (user?.vark_profile) {
            window.varkResult = {
                style: user.vark_profile.style,
                allScores: user.vark_profile.allScores,
            };
            localStorage.setItem('varkResult', JSON.stringify(window.varkResult));
        }
    }, []);

    const logout = useCallback(() => {
        _logout();
        setCurrentUser(null);
        window.varkResult = null;
    }, []);

    /** Persist updated VARK scores after questionnaire or capsule session. */
    const saveVark = useCallback(async ({ style, allScores }) => {
        // Always update local state immediately
        window.varkResult = { style, allScores };
        localStorage.setItem('varkResult', JSON.stringify({ style, allScores }));

        setCurrentUser(prev => prev ? {
            ...prev,
            vark_profile: { style, allScores, last_updated: new Date().toISOString() },
        } : prev);

        // Persist to DB if logged in
        const token = localStorage.getItem('lurniq_token');
        if (token) {
            try {
                await _updateVark({ style, allScores });
            } catch (e) {
                console.warn('[AuthContext] Failed to save VARK to DB:', e.message);
            }
        }
    }, []);

    /** Update local user state (e.g. after profile edit). */
    const updateUser = useCallback((fields) => {
        setCurrentUser(prev => prev ? { ...prev, ...fields } : prev);
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, authLoading, handleAuthSuccess, logout, saveVark, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

/** Hook to access auth context anywhere in the app. */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

export default AuthContext;
