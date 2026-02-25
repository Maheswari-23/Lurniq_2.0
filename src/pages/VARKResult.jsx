// src/pages/VARKResult.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STYLES = {
    Visual: { color: '#7B61FF', bg: 'rgba(123,97,255,0.1)', emoji: '👁️', label: 'Visual Learner', desc: 'You learn best through images, diagrams, charts, and videos. Your brain thrives on seeing information visually. Try color-coded notes, mind maps, and YouTube tutorials for your subjects.' },
    Auditory: { color: '#F97AFE', bg: 'rgba(249,122,254,0.1)', emoji: '🎧', label: 'Auditory Learner', desc: 'You learn best by listening and discussing. Lectures, podcasts, and group discussions are your superpower. Try recording yourself summarizing topics and listening back.' },
    Reading: { color: '#4C1D95', bg: 'rgba(76,29,149,0.1)', emoji: '📖', label: 'Reading/Writing Learner', desc: 'You learn best through written text. Reading, taking detailed notes, and summarizing in your own words works brilliantly for you. Make lists and rewrite key points.' },
    Kinesthetic: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', emoji: '🏃', label: 'Kinesthetic Learner', desc: 'You learn best by doing. Hands-on experiments, real-world examples, and practice problems are your strongest tools. Take frequent breaks and link concepts to real actions.' },
};

const VARKResult = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [animated, setAnimated] = useState(false);
    const [confetti, setConfetti] = useState([]);

    const vark = currentUser?.vark_profile;
    const style = vark?.dominant_style || 'Visual';
    const scores = vark?.all_scores || { Visual: 0.25, Auditory: 0.25, Reading: 0.25, Kinesthetic: 0.25 };
    const info = STYLES[style] || STYLES.Visual;

    // Generate confetti pieces
    useEffect(() => {
        const pieces = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2,
            color: ['#7B61FF', '#F97AFE', '#10B981', '#FBBF24'][Math.floor(Math.random() * 4)],
            size: Math.random() * 8 + 6,
        }));
        setConfetti(pieces);
        setTimeout(() => setAnimated(true), 100);
    }, []);

    const maxScore = Math.max(...Object.values(scores));

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F9FAFB 0%, #EDE9FE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden', fontFamily: "'Poppins', sans-serif" }}>
            {/* Confetti */}
            <style>{`
        @keyframes fall { 0% { transform: translateY(-100px) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes barGrow { from { width: 0; } to { width: var(--target-w); } }
        @keyframes popIn { 0% { transform: scale(0.7); opacity: 0; } 80% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
            {confetti.map(c => (
                <div key={c.id} style={{ position: 'fixed', top: 0, left: `${c.left}%`, width: c.size, height: c.size, background: c.color, borderRadius: '2px', animation: `fall ${2 + c.delay}s ease-in ${c.delay}s 1 forwards`, zIndex: 0, pointerEvents: 'none' }} />
            ))}

            <div style={{ background: 'white', borderRadius: '28px', padding: '48px 40px', maxWidth: '560px', width: '100%', boxShadow: '0 24px 80px rgba(123,97,255,0.15)', position: 'relative', zIndex: 1, animation: 'popIn 0.6s ease-out both', textAlign: 'center' }}>
                {/* Trophy */}
                <div style={{ fontSize: '60px', marginBottom: '8px' }}>🎉</div>
                <p style={{ color: '#6B7280', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Your VARK Learning Style</p>

                {/* Main Result */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: info.bg, border: `2px solid ${info.color}`, borderRadius: '50px', padding: '10px 24px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '28px' }}>{info.emoji}</span>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: info.color }}>{info.label}</span>
                </div>

                {/* Description */}
                <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: 1.7, marginBottom: '32px', textAlign: 'left' }}>{info.desc}</p>

                {/* Score Bars */}
                <div style={{ marginBottom: '32px', textAlign: 'left' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Your Full VARK Breakdown</p>
                    {Object.entries(scores).map(([s, score]) => {
                        const pct = Math.round(score * 100);
                        const inf = STYLES[s] || STYLES.Visual;
                        const isDominant = s === style;
                        return (
                            <div key={s} style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: isDominant ? 700 : 500, color: isDominant ? inf.color : '#374151' }}>{inf.emoji} {s}{isDominant ? ' ★' : ''}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: inf.color }}>{pct}%</span>
                                </div>
                                <div style={{ background: '#F3F4F6', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: inf.color, borderRadius: '10px', width: animated ? `${pct}%` : '0%', transition: 'width 1s ease', opacity: isDominant ? 1 : 0.5 }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <button
                    onClick={() => navigate('/learning')}
                    style={{ width: '100%', padding: '16px', background: `linear-gradient(135deg, #F97AFE, #7B61FF)`, color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(123,97,255,0.4)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    🚀 Start My Personalized Learning Journey
                </button>
                <p style={{ marginTop: '16px', fontSize: '13px', color: '#9CA3AF' }}>Your content is now tailored to your {info.label} profile</p>
            </div>
        </div>
    );
};

export default VARKResult;
