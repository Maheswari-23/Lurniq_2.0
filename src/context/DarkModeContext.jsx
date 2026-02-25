// src/context/DarkModeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext(null);

export function DarkModeProvider({ children }) {
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem('lurniq_dark');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('lurniq_dark', JSON.stringify(dark));
        if (dark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }, [dark]);

    const toggle = () => setDark(d => !d);

    return (
        <DarkModeContext.Provider value={{ dark, toggle }}>
            {children}
        </DarkModeContext.Provider>
    );
}

export function useDarkMode() {
    const ctx = useContext(DarkModeContext);
    if (!ctx) throw new Error('useDarkMode must be used inside <DarkModeProvider>');
    return ctx;
}
