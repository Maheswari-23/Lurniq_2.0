import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentCard from '../components/phase2/ContentCard';
import CapsuleViewer from '../components/phase2/CapsuleViewer';
import AIChatbot from '../components/AIChatbot';
import '../styles/phase2.css';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useStreak, getBadge } from '../hooks/useStreak';
import { Search, X, BookOpen, Flame, Trophy, CheckCircle2, ChevronDown } from 'lucide-react';

// ── Built-in topic catalogue ─────────────────────────────────────────
const BUILTIN_TOPICS = [
    { id: 'variables', label: 'Variables & Data Types', description: 'Store and categorise data using named memory containers across primitive and composite types.', difficulty: 1, category: 'Foundations' },
    { id: 'operators', label: 'Operators', description: 'Perform arithmetic, logical, and bitwise operations to manipulate values and control flow.', difficulty: 1, category: 'Foundations' },
    { id: 'conditionals', label: 'Conditional Statements', description: 'Branch program execution using if-else chains and switch-case decision trees.', difficulty: 1, category: 'Foundations' },
    { id: 'loops', label: 'Loops', description: 'Automate repetitive tasks with for, while, and do-while iteration constructs.', difficulty: 1, category: 'Foundations' },
    { id: 'functions', label: 'Functions', description: 'Encapsulate reusable logic, manage scope, and model behaviour with parameters and return values.', difficulty: 2, category: 'Core Concepts' },
    { id: 'arrays', label: 'Arrays & Strings', description: 'Organise sequential data, traverse collections, and manipulate text efficiently.', difficulty: 2, category: 'Core Concepts' },
    { id: 'recursion', label: 'Recursion', description: 'Solve problems by decomposing them into self-similar sub-problems using base and recursive cases.', difficulty: 2, category: 'Core Concepts' },
    { id: 'oop', label: 'Object-Oriented Programming', description: 'Model real-world entities with classes, objects, encapsulation, inheritance, and polymorphism.', difficulty: 2, category: 'Core Concepts' },
    { id: 'datastructures', label: 'Data Structures', description: 'Master Stacks, Queues, Linked Lists, Trees, Graphs, and HashMaps for efficient data management.', difficulty: 3, category: 'Advanced' },
    { id: 'complexity', label: 'Time & Space Complexity', description: 'Analyse algorithmic efficiency using Big-O notation and reason about trade-offs.', difficulty: 3, category: 'Advanced' },
];

const loadCustomTopics = () => {
    try { return JSON.parse(localStorage.getItem('lurniq_custom_topics') || '[]'); } catch { return []; }
};

const DEFAULT_VARK = { style: 'Visual', allScores: { Visual: 0.4, Auditory: 0.2, Reading: 0.2, Kinesthetic: 0.2 } };
const VARK_STYLES = ['Visual', 'Auditory', 'Reading', 'Kinesthetic'];
const VARK_COLORS = { Visual: '#7B61FF', Auditory: '#F97AFE', Reading: '#4C1D95', Kinesthetic: '#10B981' };
const VARK_TEXT = { Visual: '#7B61FF', Auditory: '#C026D3', Reading: '#4C1D95', Kinesthetic: '#059669' };

const DIFFICULTY_META = {
    1: { label: 'Beginner', color: '#0EA5E9' },
    2: { label: 'Intermediate', color: '#7B61FF' },
    3: { label: 'Advanced', color: '#F59E0B' },
    4: { label: 'Custom', color: '#10B981' },
};

// ── Skeleton card ───────────────────────────────────────────────────
const SkeletonCard = () => (
    <div style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk{background:linear-gradient(90deg,#F3F4F6 25%,#E9ECEF 50%,#F3F4F6 75%);background-size:400px 100%;animation:shimmer 1.4s ease infinite;border-radius:8px;}`}</style>
        <div className="sk" style={{ height: '14px', width: '60%', marginBottom: '12px' }} />
        <div className="sk" style={{ height: '10px', width: '90%', marginBottom: '8px' }} />
        <div className="sk" style={{ height: '10px', width: '75%', marginBottom: '20px' }} />
        <div className="sk" style={{ height: '32px', width: '40%' }} />
    </div>
);

// ── Main component ──────────────────────────────────────────────────
const LearningContent = () => {
    const navigate = useNavigate();
    const { currentUser, saveVark } = useAuth();
    const toast = useToast();
    const { streak } = useStreak();
    const badge = getBadge(streak);

    const [varkData, setVarkData] = useState(DEFAULT_VARK);
    const [activeModality, setActiveModality] = useState(DEFAULT_VARK.style);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [customTopics, setCustomTopics] = useState(loadCustomTopics);
    const [completed, setCompleted] = useState(() => {
        try { return JSON.parse(localStorage.getItem('lurniq_completed') || '[]'); } catch { return []; }
    });

    // Merged topic list
    const TOPICS = useMemo(() => [...BUILTIN_TOPICS, ...customTopics], [customTopics]);

    // Load VARK profile from context / localStorage
    useEffect(() => {
        const fromCtx = currentUser?.vark_profile;
        const fromLS = (() => { try { return JSON.parse(localStorage.getItem('varkResult')); } catch { return null; } })();
        const saved = fromCtx || fromLS || window.varkResult;
        if (saved?.style) {
            setVarkData({ style: saved.style, allScores: saved.allScores || DEFAULT_VARK.allScores });
            setActiveModality(saved.style);
        }
        setTimeout(() => setLoading(false), 700);
    }, [currentUser]);

    // Expose global hook so AIChatbot can push new custom topics
    useEffect(() => {
        window.__addCustomTopic = (newTopic) => {
            setCustomTopics(prev => {
                if (prev.find(t => t.id === newTopic.id)) return prev;
                const updated = [...prev, newTopic];
                localStorage.setItem('lurniq_custom_topics', JSON.stringify(updated));
                return updated;
            });
            toast('✨ New module added to your Learning Hub!', 'success');
        };
        return () => { delete window.__addCustomTopic; };
    }, [toast]);

    const probs = varkData.allScores || DEFAULT_VARK.allScores;
    const categories = ['All', 'Foundations', 'Core Concepts', 'Advanced', 'My Topics'];

    const filtered = useMemo(() => {
        let result;
        if (activeCategory === 'My Topics') result = customTopics;
        else if (activeCategory === 'All') result = TOPICS;
        else result = TOPICS.filter(t => t.category === activeCategory);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(t => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
        }
        return result;
    }, [activeCategory, search, TOPICS, customTopics]);

    const markComplete = (topicId) => {
        if (!completed.includes(topicId)) {
            const next = [...completed, topicId];
            setCompleted(next);
            localStorage.setItem('lurniq_completed', JSON.stringify(next));
        }
    };

    const handleViewerClose = async (updatedProbs) => {
        try {
            if (updatedProbs) {
                const dominant = Object.entries(updatedProbs).reduce((best, [k, v]) => v > best[1] ? [k, v] : best, ['Visual', 0])[0];
                const updated = { style: dominant, allScores: updatedProbs };
                setVarkData(updated);
                setActiveModality(dominant);
                await saveVark(updated);
            }
            if (selectedTopic) markComplete(selectedTopic.id);
        } catch (e) {
            console.warn('[LearningContent] handleViewerClose error (non-critical):', e.message);
        } finally {
            setSelectedTopic(null);
        }
    };

    const progressPct = Math.round((completed.length / TOPICS.length) * 100);

    return (
        <div className="lc-container">
            <style>{`
        .search-input:focus{border-color:#7B61FF!important;box-shadow:0 0 0 3px rgba(123,97,255,0.15)!important}
        .vark-switcher{appearance:none;-webkit-appearance:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:0.82rem;border-radius:8px;padding:5px 28px 5px 10px;outline:none;transition:all 0.2s;}
        .vark-switcher:hover{opacity:0.85}
      `}</style>

            {/* ── Page Header ── */}
            <header className="lc-header">
                <div className="lc-header-text">
                    <h1 className="lc-title">Learning Hub</h1>
                    <p className="lc-subtitle">Adaptive content personalised to your <strong>{activeModality}</strong> learning profile.</p>
                </div>

                {/* Streak + Progress chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '99px', padding: '6px 14px' }}>
                        <Flame size={15} color="#F97316" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#C2410C' }}>{streak}-Day Streak</span>
                        <span style={{ fontSize: '13px' }}>{badge.emoji}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F5F3FF', border: '1px solid #C4B5FD', borderRadius: '99px', padding: '6px 14px' }}>
                        <Trophy size={15} color="#7B61FF" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#5B21B6' }}>{completed.length}/{TOPICS.length} Completed</span>
                    </div>
                </div>

                {/* Overall progress bar */}
                <div style={{ margin: '0 0 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Overall Progress</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#7B61FF' }}>{progressPct}%</span>
                    </div>
                    <div style={{ background: '#E5E7EB', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#F97AFE,#7B61FF)', width: `${progressPct}%`, borderRadius: '999px', transition: 'width 0.8s ease' }} />
                    </div>
                </div>

                {/* VARK strip with style switcher */}
                <div className="lc-vark-strip">
                    <div className="lvs-label-col">
                        <span className="lvs-heading">Study Mode</span>
                        {/* ── VARK Style switcher dropdown ── */}
                        <div style={{ position: 'relative', display: 'inline-block', marginTop: '4px' }}>
                            <select
                                className="vark-switcher"
                                value={activeModality}
                                onChange={e => setActiveModality(e.target.value)}
                                style={{
                                    border: `2px solid ${VARK_COLORS[activeModality]}`,
                                    color: VARK_TEXT[activeModality],
                                    background: 'white',
                                }}
                                title="Switch your study style"
                            >
                                {VARK_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown size={11} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.45 }} />
                        </div>
                    </div>
                    <div className="lvs-bars">
                        {Object.entries(probs).map(([style, prob]) => (
                            <div key={style} className="lvs-row">
                                <span className="lvs-style-label">{style.slice(0, 1)}</span>
                                <div className="lvs-track">
                                    <div className={`lvs-fill lvs-fill--${style.toLowerCase()}`} style={{ width: `${(prob * 100).toFixed(1)}%` }} />
                                </div>
                                <span className="lvs-pct">{(prob * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                    <button className="lvs-retake" onClick={() => navigate('/questionnaire')}>Retake Assessment</button>
                </div>
            </header>

            {/* ── Search Bar ── */}
            <div style={{ margin: '0 0 16px', position: 'relative' }}>
                <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search topics…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '11px 40px 11px 40px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white', transition: 'border-color 0.2s,box-shadow 0.2s' }}
                />
                {search && (
                    <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9CA3AF' }}>
                        <X size={15} />
                    </button>
                )}
            </div>

            {/* ── Category Tabs ── */}
            <nav className="lc-tabs" aria-label="Topic categories">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`lc-tab${activeCategory === cat ? ' lc-tab--active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                        <span className="lc-tab-count">
                            {cat === 'All' ? TOPICS.length
                                : cat === 'My Topics' ? customTopics.length
                                    : TOPICS.filter(t => t.category === cat).length}
                        </span>
                    </button>
                ))}
            </nav>

            {/* ── Topic Grid — always shown ── */}
            {loading ? (
                <div className="content-grid">
                    {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <BookOpen size={48} color="#E5E7EB" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                        {activeCategory === 'My Topics' ? 'No custom topics yet' : 'No topics found'}
                    </h3>
                    <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
                        {activeCategory === 'My Topics'
                            ? 'Ask the AI chatbot a question and click "+ Add to Learning Hub" to create your first custom module.'
                            : 'Try a different search term'}
                    </p>
                    {search && <button onClick={() => setSearch('')} style={{ marginTop: '16px', padding: '9px 20px', background: '#F5F3FF', color: '#7B61FF', border: '1px solid #C4B5FD', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Clear Search</button>}
                </div>
            ) : (
                <div className="content-grid">
                    {filtered.map(topic => (
                        <div key={topic.id} style={{ position: 'relative' }}>
                            {completed.includes(topic.id) && (
                                <div title="Completed" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                                    <CheckCircle2 size={20} color="#059669" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }} />
                                </div>
                            )}
                            <ContentCard
                                topic={topic.id}
                                label={topic.label}
                                description={topic.description}
                                difficulty={topic.difficulty}
                                category={topic.category}
                                modality={activeModality}
                                difficultyMeta={DIFFICULTY_META[topic.difficulty] || DIFFICULTY_META[1]}
                                onClick={() => setSelectedTopic(topic)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Info Bar ── */}
            {!loading && filtered.length > 0 && (
                <div className="lc-info-bar">
                    <span className="lc-info-badge">AIMC-Bandit</span>
                    <p>Content sequences adapt after each session via Bayesian inference and LinUCB contextual bandits.</p>
                </div>
            )}

            {/* ── CapsuleViewer Modal ── */}
            {selectedTopic && (
                <CapsuleViewer
                    topic={selectedTopic.id}
                    topicLabel={selectedTopic.label}
                    modality={activeModality}
                    varkProbs={probs}
                    onClose={handleViewerClose}
                />
            )}

            {/* Floating AI Chatbot */}
            <AIChatbot varkStyle={activeModality} />
        </div>
    );
};

export default LearningContent;
