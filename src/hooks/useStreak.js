// src/hooks/useStreak.js
// Tracks daily learning streak in localStorage
import { useState, useEffect } from 'react';

export function useStreak() {
    const [streak, setStreak] = useState(0);
    const [isNewDay, setIsNewDay] = useState(false);

    useEffect(() => {
        const today = new Date().toDateString();
        const lastVisit = localStorage.getItem('lurniq_last_visit');
        const currentStreak = parseInt(localStorage.getItem('lurniq_streak') || '0', 10);

        if (!lastVisit) {
            // First ever visit
            localStorage.setItem('lurniq_last_visit', today);
            localStorage.setItem('lurniq_streak', '1');
            setStreak(1);
            setIsNewDay(true);
        } else if (lastVisit === today) {
            // Same day — keep streak
            setStreak(currentStreak);
        } else {
            const last = new Date(lastVisit);
            const now = new Date(today);
            const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Consecutive day — increment
                const newStreak = currentStreak + 1;
                localStorage.setItem('lurniq_streak', newStreak.toString());
                localStorage.setItem('lurniq_last_visit', today);
                setStreak(newStreak);
                setIsNewDay(true);
            } else {
                // Streak broken
                localStorage.setItem('lurniq_streak', '1');
                localStorage.setItem('lurniq_last_visit', today);
                setStreak(1);
            }
        }
    }, []);

    return { streak, isNewDay };
}

export function getBadge(streak) {
    if (streak >= 30) return { emoji: '💎', label: 'Diamond', color: '#06B6D4' };
    if (streak >= 14) return { emoji: '🏆', label: 'Gold', color: '#F59E0B' };
    if (streak >= 7) return { emoji: '🔥', label: 'On Fire', color: '#EF4444' };
    if (streak >= 3) return { emoji: '⚡', label: 'Rising', color: '#7B61FF' };
    return { emoji: '🌱', label: 'Seedling', color: '#10B981' };
}
