// src/pages/VARKResult.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, Headphones, BookOpen, Zap, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const STYLE_CONFIG = {
    Visual: { icon: Eye, label: 'Visual Learner', tagline: 'You think in pictures', accent: '#7B61FF', tips: ['Color-code your notes & highlights', 'Use mind maps and diagrams', 'Watch tutorial videos before reading', 'Visualize information as flowcharts'] },
    Auditory: { icon: Headphones, label: 'Auditory Learner', tagline: 'You learn through listening', accent: '#7B61FF', tips: ['Record summaries and replay them', 'Join study groups and discussions', 'Read your notes aloud', 'Listen to educational podcasts'] },
    Reading: { icon: BookOpen, label: 'Reading/Writing Learner', tagline: 'You master through text', accent: '#7B61FF', tips: ['Take detailed written notes', 'Read textbooks and articles thoroughly', 'Rewrite key points in your own words', 'Create structured outlines and lists'] },
    Kinesthetic: { icon: Zap, label: 'Kinesthetic Learner', tagline: 'You learn by doing', accent: '#7B61FF', tips: ['Take breaks every 30 minutes', 'Apply concepts to real-world examples', 'Build, experiment, and create', 'Teach concepts to someone else'] },
};

const VARK_ORDER = ['Visual', 'Auditory', 'Reading', 'Kinesthetic'];

const VARKResult = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [barsReady, setBarsReady] = useState(false);

    const vark = currentUser?.vark_profile;
    const style = vark?.dominant_style || 'Visual';
    const scores = vark?.all_scores || { Visual: 0.25, Auditory: 0.25, Reading: 0.25, Kinesthetic: 0.25 };
    const cfg = STYLE_CONFIG[style] || STYLE_CONFIG.Visual;
    const StyleIcon = cfg.icon;

    useEffect(() => {
        const t = setTimeout(() => setBarsReady(true), 120);
        return () => clearTimeout(t);
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Poppins', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
            <style>{`
        @keyframes popIn { 0%{opacity:0;transform:scale(0.94) translateY(16px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        .vr-wrap { animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .vr-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(123,97,255,0.35) !important; }
        .vr-btn { transition: all 0.22s ease !important; }
        .vr-bar { transition: width 1s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

            <div className="vr-wrap" style={{ width: '100%', maxWidth: '520px' }}>

                {/* Main card */}
                <div style={{ background: 'white', borderRadius: '28px', boxShadow: '0 8px 40px rgba(123,97,255,0.12), 0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

                    {/* ── Gradient Header ── */}
                    <div style={{ background: 'linear-gradient(135deg, #F97AFE 0%, #7B61FF 100%)', padding: '44px 36px 40px', textAlign: 'center', position: 'relative' }}>
                        {/* Decorative circles */}
                        <div style={{ position: 'absolute', top: 16, right: 24, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                        <div style={{ position: 'absolute', bottom: -20, left: 20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

                        {/* Icon box */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '68px', height: '68px', background: 'rgba(255,255,255,0.18)', borderRadius: '18px', backdropFilter: 'blur(10px)', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.3)' }}>
                            <StyleIcon size={32} color="white" strokeWidth={1.75} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Sparkles size={12} color="rgba(255,255,255,0.7)" />
                            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Your Learning Style</p>
                            <Sparkles size={12} color="rgba(255,255,255,0.7)" />
                        </div>
                        <h1 style={{ margin: '0 0 8px', fontSize: '30px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{cfg.label}</h1>
                        <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.82)', fontWeight: 400 }}>{cfg.tagline}</p>
                    </div>

                    {/* ── VARK Bars ── */}
                    <div style={{ padding: '28px 32px 0' }}>
                        <p style={{ margin: '0 0 16px', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>VARK Score Breakdown</p>
                        {VARK_ORDER.map((s) => {
                            const pct = Math.round((scores[s] ?? 0) * 100);
                            const Icon = STYLE_CONFIG[s].icon;
                            const isDominant = s === style;
                            return (
                                <div key={s} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <Icon size={13} color={isDominant ? '#7B61FF' : '#CBD5E1'} strokeWidth={2.5} />
                                            <span style={{ fontSize: '13px', fontWeight: isDominant ? 700 : 500, color: isDominant ? '#111827' : '#9CA3AF' }}>
                                                {s}
                                            </span>
                                            {isDominant && (
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#7B61FF', background: '#EDE9FE', padding: '1px 8px', borderRadius: '99px', letterSpacing: '0.04em' }}>TOP</span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: isDominant ? '#7B61FF' : '#CBD5E1' }}>{pct}%</span>
                                    </div>
                                    <div style={{ background: '#F3F4F6', borderRadius: '999px', height: '7px', overflow: 'hidden' }}>
                                        <div className="vr-bar" style={{
                                            height: '100%',
                                            borderRadius: '999px',
                                            background: isDominant ? 'linear-gradient(90deg, #F97AFE, #7B61FF)' : '#E5E7EB',
                                            width: barsReady ? `${pct}%` : '0%',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Study Tips ── */}
                    <div style={{ margin: '20px 24px 28px', background: '#F5F3FF', borderRadius: '16px', padding: '20px 22px', border: '1px solid #EDE9FE' }}>
                        <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#7B61FF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>How to Study Effectively</p>
                        {cfg.tips.map((tip, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', marginBottom: i < cfg.tips.length - 1 ? '9px' : 0 }}>
                                <CheckCircle2 size={15} color="#7B61FF" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.55 }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── CTA ── */}
                <button
                    className="vr-btn"
                    onClick={() => navigate('/learning')}
                    style={{ marginTop: '16px', width: '100%', padding: '16px', background: 'linear-gradient(90deg, #F97AFE, #7B61FF)', color: 'white', border: 'none', borderRadius: '18px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(123,97,255,0.28)' }}
                >
                    Start My Personalized Journey
                    <ArrowRight size={18} strokeWidth={2.5} />
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#9CA3AF', marginTop: '10px' }}>
                    Content is now curated for your {cfg.label} profile
                </p>

            </div>
        </div>
    );
};

export default VARKResult;
