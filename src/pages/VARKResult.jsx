// src/pages/VARKResult.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, Headphones, BookOpen, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

const STYLE_CONFIG = {
    Visual: {
        gradient: 'linear-gradient(135deg, #7B61FF 0%, #A78BFA 100%)',
        light: '#EDE9FE',
        border: '#C4B5FD',
        text: '#5B21B6',
        Icon: Eye,
        tagline: 'You think in pictures',
        tips: ['Color-code your notes', 'Use mind maps & diagrams', 'Watch tutorial videos', 'Draw flowcharts for processes'],
    },
    Auditory: {
        gradient: 'linear-gradient(135deg, #DB2777 0%, #F472B6 100%)',
        light: '#FCE7F3',
        border: '#F9A8D4',
        text: '#9D174D',
        Icon: Headphones,
        tagline: 'You learn through listening',
        tips: ['Record & replay your summaries', 'Join study groups & discussions', 'Listen to educational podcasts', 'Read your notes out loud'],
    },
    Reading: {
        gradient: 'linear-gradient(135deg, #1D4ED8 0%, #60A5FA 100%)',
        light: '#EFF6FF',
        border: '#BFDBFE',
        text: '#1E40AF',
        Icon: BookOpen,
        tagline: 'You master through text',
        tips: ['Take detailed written notes', 'Read textbooks thoroughly', 'Write summaries in your own words', 'Create numbered lists & outlines'],
    },
    Kinesthetic: {
        gradient: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
        light: '#ECFDF5',
        border: '#A7F3D0',
        text: '#065F46',
        Icon: Zap,
        tagline: 'You learn by doing',
        tips: ['Take practice breaks every 30 min', 'Use real-world examples', 'Build, experiment & create', 'Teach concepts to others'],
    },
};

const VARK_ORDER = ['Visual', 'Auditory', 'Reading', 'Kinesthetic'];

const VARKResult = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [ready, setReady] = useState(false);

    const vark = currentUser?.vark_profile;
    const style = vark?.dominant_style || 'Visual';
    const scores = vark?.all_scores || { Visual: 0.25, Auditory: 0.25, Reading: 0.25, Kinesthetic: 0.25 };
    const cfg = STYLE_CONFIG[style] || STYLE_CONFIG.Visual;
    const { Icon } = cfg;

    useEffect(() => {
        const t = setTimeout(() => setReady(true), 80);
        return () => clearTimeout(t);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#F8FAFC',
            fontFamily: "'Poppins', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
        }}>
            <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes barFill { from { width:0; } to { width:var(--w); } }
        .vr-card { animation: slideUp 0.55s ease both; }
        .vr-card:nth-child(2) { animation-delay: 0.1s; }
        .vr-card:nth-child(3) { animation-delay: 0.2s; }
        .vr-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.15) !important; }
        .vr-cta { transition: transform 0.2s, box-shadow 0.2s; }
      `}</style>

            <div style={{ width: '100%', maxWidth: '560px' }}>

                {/* ── Hero card ── */}
                <div className="vr-card" style={{
                    background: 'white',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    marginBottom: '16px',
                }}>
                    {/* Gradient banner */}
                    <div style={{ background: cfg.gradient, padding: '40px 36px 36px', textAlign: 'center' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '72px',
                            height: '72px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '20px',
                            marginBottom: '16px',
                            backdropFilter: 'blur(8px)',
                        }}>
                            <Icon size={36} color="white" strokeWidth={1.5} />
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>
                            Your Learning Style
                        </p>
                        <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                            {style} Learner
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', margin: 0, fontWeight: 400 }}>
                            {cfg.tagline}
                        </p>
                    </div>

                    {/* Score breakdown */}
                    <div style={{ padding: '28px 32px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
                            VARK Breakdown
                        </p>
                        {VARK_ORDER.map((s) => {
                            const pct = Math.round((scores[s] ?? 0) * 100);
                            const c = STYLE_CONFIG[s];
                            const isDominant = s === style;
                            return (
                                <div key={s} style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <c.Icon size={14} color={isDominant ? c.text : '#94A3B8'} strokeWidth={2} />
                                            <span style={{ fontSize: '13px', fontWeight: isDominant ? 700 : 500, color: isDominant ? c.text : '#64748B' }}>
                                                {s}{isDominant ? ' · Dominant' : ''}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: isDominant ? c.text : '#94A3B8' }}>{pct}%</span>
                                    </div>
                                    <div style={{ background: '#F1F5F9', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            borderRadius: '999px',
                                            background: isDominant ? cfg.gradient : '#CBD5E1',
                                            width: ready ? `${pct}%` : '0%',
                                            transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Tips card ── */}
                <div className="vr-card" style={{
                    background: cfg.light,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: '20px',
                    padding: '24px 28px',
                    marginBottom: '16px',
                }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: cfg.text, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                        How to Study Effectively
                    </p>
                    {cfg.tips.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < cfg.tips.length - 1 ? '10px' : 0 }}>
                            <CheckCircle2 size={16} color={cfg.text} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span style={{ fontSize: '14px', color: cfg.text, lineHeight: 1.5 }}>{tip}</span>
                        </div>
                    ))}
                </div>

                {/* ── CTA ── */}
                <div className="vr-card">
                    <button
                        className="vr-cta"
                        onClick={() => navigate('/learning')}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: cfg.gradient,
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        }}
                    >
                        Start My Personalized Journey
                        <ArrowRight size={18} strokeWidth={2.5} />
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '12px' }}>
                        Your content is now curated for your {style} learning style
                    </p>
                </div>

            </div>
        </div>
    );
};

export default VARKResult;
