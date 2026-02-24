// src/pages/LearningContent.jsx
// Phase 2 — Adaptive Learning Hub — 10 CS Topics
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentCard from '../components/phase2/ContentCard';
import CapsuleViewer from '../components/phase2/CapsuleViewer';
import '../styles/phase2.css';
import { useAuth } from '../context/AuthContext';


// ──────────────────────────────────────────────────────────────
// Topic catalogue  (difficulty: 1 = Beginner, 2 = Intermediate, 3 = Advanced)
// ──────────────────────────────────────────────────────────────
const TOPICS = [
    {
        id: 'variables',
        label: 'Variables & Data Types',
        description: 'Store and categorise data using named memory containers across primitive and composite types.',
        difficulty: 1,
        category: 'Foundations',
    },
    {
        id: 'operators',
        label: 'Operators',
        description: 'Perform arithmetic, logical, and bitwise operations to manipulate values and control flow.',
        difficulty: 1,
        category: 'Foundations',
    },
    {
        id: 'conditionals',
        label: 'Conditional Statements',
        description: 'Branch program execution using if-else chains and switch-case decision trees.',
        difficulty: 1,
        category: 'Foundations',
    },
    {
        id: 'loops',
        label: 'Loops',
        description: 'Automate repetitive tasks with for, while, and do-while iteration constructs.',
        difficulty: 1,
        category: 'Foundations',
    },
    {
        id: 'functions',
        label: 'Functions',
        description: 'Encapsulate reusable logic, manage scope, and model behaviour with parameters and return values.',
        difficulty: 2,
        category: 'Core Concepts',
    },
    {
        id: 'arrays',
        label: 'Arrays & Strings',
        description: 'Organise sequential data, traverse collections, and manipulate text efficiently.',
        difficulty: 2,
        category: 'Core Concepts',
    },
    {
        id: 'recursion',
        label: 'Recursion',
        description: 'Solve problems by decomposing them into self-similar sub-problems using base and recursive cases.',
        difficulty: 2,
        category: 'Core Concepts',
    },
    {
        id: 'oop',
        label: 'Object-Oriented Programming',
        description: 'Model real-world entities with classes, objects, encapsulation, inheritance, and polymorphism.',
        difficulty: 2,
        category: 'Core Concepts',
    },
    {
        id: 'datastructures',
        label: 'Data Structures',
        description: 'Master Stacks, Queues, Linked Lists, Trees, Graphs, and HashMaps for efficient data management.',
        difficulty: 3,
        category: 'Advanced',
    },
    {
        id: 'complexity',
        label: 'Time & Space Complexity',
        description: 'Analyse algorithmic efficiency using Big-O notation and reason about trade-offs.',
        difficulty: 3,
        category: 'Advanced',
    },
];

// Fallback VARK distribution when Phase 1 hasn't been completed
const DEFAULT_VARK = {
    style: 'Visual',
    allScores: { Visual: 0.4, Auditory: 0.2, Reading: 0.2, Kinesthetic: 0.2 },
};

const DIFFICULTY_META = {
    1: { label: 'Beginner', color: '#0EA5E9' },
    2: { label: 'Intermediate', color: '#7B61FF' },
    3: { label: 'Advanced', color: '#F59E0B' },
};

const LearningContent = () => {
    const navigate = useNavigate();
    const { currentUser, saveVark } = useAuth();

    const [varkData, setVarkData] = useState(DEFAULT_VARK);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        // Priority: AuthContext (DB-backed) > localStorage > window global > default
        const fromCtx = currentUser?.vark_profile;
        const fromLS = (() => { try { return JSON.parse(localStorage.getItem('varkResult')); } catch { return null; } })();
        const fromWin = window.varkResult;
        const saved = fromCtx || fromLS || fromWin;
        if (saved?.style) setVarkData({ style: saved.style, allScores: saved.allScores || DEFAULT_VARK.allScores });
    }, [currentUser]);


    const modality = varkData.style;
    const probs = varkData.allScores || DEFAULT_VARK.allScores;
    const categories = ['All', 'Foundations', 'Core Concepts', 'Advanced'];
    const filtered = activeCategory === 'All'
        ? TOPICS
        : TOPICS.filter(t => t.category === activeCategory);

    const handleViewerClose = async (updatedProbs) => {
        if (updatedProbs) {
            const dominant = Object.entries(updatedProbs).reduce(
                (best, [k, v]) => (v > best[1] ? [k, v] : best),
                ['Visual', 0]
            )[0];
            const updated = { style: dominant, allScores: updatedProbs };
            setVarkData(updated);
            await saveVark(updated);   // persist to DB + localStorage
        }
        setSelectedTopic(null);
    };


    return (
        <div className="lc-container">

            {/* ── Page Header ────────────────────────────────────── */}
            <header className="lc-header">
                <div className="lc-header-text">
                    <h1 className="lc-title">Learning Hub</h1>
                    <p className="lc-subtitle">
                        Adaptive content personalised to your <strong>{modality}</strong> learning profile.
                    </p>
                </div>

                {/* VARK Profile strip */}
                <div className="lc-vark-strip">
                    <div className="lvs-label-col">
                        <span className="lvs-heading">VARK Profile</span>
                        <span className="lvs-dominant">{modality}</span>
                    </div>
                    <div className="lvs-bars">
                        {Object.entries(probs).map(([style, prob]) => (
                            <div key={style} className="lvs-row">
                                <span className="lvs-style-label">{style.slice(0, 1)}</span>
                                <div className="lvs-track">
                                    <div
                                        className={`lvs-fill lvs-fill--${style.toLowerCase()}`}
                                        style={{ width: `${(prob * 100).toFixed(1)}%` }}
                                    />
                                </div>
                                <span className="lvs-pct">{(prob * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                    <button className="lvs-retake" onClick={() => navigate('/questionnaire')}>
                        Retake Assessment
                    </button>
                </div>
            </header>

            {/* ── Category Tabs ───────────────────────────────────── */}
            <nav className="lc-tabs" aria-label="Topic categories">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`lc-tab${activeCategory === cat ? ' lc-tab--active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                        <span className="lc-tab-count">
                            {cat === 'All' ? TOPICS.length : TOPICS.filter(t => t.category === cat).length}
                        </span>
                    </button>
                ))}
            </nav>

            {/* ── Topic Grid ──────────────────────────────────────── */}
            <div className="content-grid">
                {filtered.map(topic => (
                    <ContentCard
                        key={topic.id}
                        topic={topic.id}
                        label={topic.label}
                        description={topic.description}
                        difficulty={topic.difficulty}
                        category={topic.category}
                        modality={modality}
                        difficultyMeta={DIFFICULTY_META[topic.difficulty]}
                        onClick={() => setSelectedTopic(topic)}
                    />
                ))}
            </div>

            {/* ── Info Bar ────────────────────────────────────────── */}
            <div className="lc-info-bar">
                <span className="lc-info-badge">AIMC-Bandit</span>
                <p>Content sequences adapt after each session via Bayesian inference and LinUCB contextual bandits.</p>
            </div>

            {/* ── CapsuleViewer Modal ─────────────────────────────── */}
            {selectedTopic && (
                <CapsuleViewer
                    topic={selectedTopic.id}
                    topicLabel={selectedTopic.label}
                    modality={modality}
                    varkProbs={probs}
                    onClose={handleViewerClose}
                />
            )}
        </div>
    );
};

export default LearningContent;
