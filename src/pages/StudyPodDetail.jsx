import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPodDetails, getChatHistory, sendChatMessage, toggleTask, addTask, editTask, deleteTask, updateGoals, updateNotes } from '../services/podService';
import { useAuth } from '../context/AuthContext';
import {
    Loader2, Send, CheckCircle2, Circle, ArrowLeft, Target, Trophy,
    Video, KanbanSquare, Bot, Plus, Pencil, Trash2, Check, X, Save,
    MessageCircle, BookOpen, ChevronDown, ChevronUp, Copy, PenTool, StickyNote, Download
} from 'lucide-react';
import PodVideoCall from '../components/phase2/PodVideoCall';
import AIChatbot from '../components/AIChatbot';
import CapsuleViewer from '../components/phase2/CapsuleViewer';
import ContentCard from '../components/phase2/ContentCard';
import PodBattle from '../components/phase2/PodBattle';
import PodWhiteboard from '../components/phase2/PodWhiteboard';
import API_BASE_URL from '../config.js';
import '../styles/phase2.css';

// ── Built-in topic catalogue (same as LearningContent) ──────────────
const BUILTIN_TOPICS = [
    { id: 'variables',      label: 'Variables & Data Types',         description: 'Store and categorise data using named memory containers.', difficulty: 1, category: 'Foundations' },
    { id: 'operators',      label: 'Operators',                      description: 'Perform arithmetic, logical, and bitwise operations.', difficulty: 1, category: 'Foundations' },
    { id: 'conditionals',   label: 'Conditional Statements',         description: 'Branch execution using if-else and switch-case trees.', difficulty: 1, category: 'Foundations' },
    { id: 'loops',          label: 'Loops',                          description: 'Automate repetitive tasks with for, while, do-while.', difficulty: 1, category: 'Foundations' },
    { id: 'functions',      label: 'Functions',                      description: 'Encapsulate reusable logic with parameters and return values.', difficulty: 2, category: 'Core Concepts' },
    { id: 'arrays',         label: 'Arrays & Strings',               description: 'Organise sequential data and manipulate text.', difficulty: 2, category: 'Core Concepts' },
    { id: 'recursion',      label: 'Recursion',                      description: 'Solve problems by decomposing them into sub-problems.', difficulty: 2, category: 'Core Concepts' },
    { id: 'oop',            label: 'Object-Oriented Programming',    description: 'Model entities with classes, inheritance and polymorphism.', difficulty: 2, category: 'Core Concepts' },
    { id: 'datastructures', label: 'Data Structures',                description: 'Stacks, Queues, Linked Lists, Trees, Graphs and HashMaps.', difficulty: 3, category: 'Advanced' },
    { id: 'complexity',     label: 'Time & Space Complexity',        description: 'Analyse algorithmic efficiency using Big-O notation.', difficulty: 3, category: 'Advanced' },
];
const DIFFICULTY_META = {
    1: { label: 'Beginner',      color: '#0EA5E9' },
    2: { label: 'Intermediate',  color: '#7B61FF' },
    3: { label: 'Advanced',      color: '#F59E0B' },
    4: { label: 'Custom',        color: '#10B981' },
};
const DEFAULT_VARK = { style: 'Visual', allScores: { Visual: 0.4, Auditory: 0.2, Reading: 0.2, Kinesthetic: 0.2 } };

// ── Floating Group Chat ──────────────────────────────────────────────
const FloatingChat = ({ chat, onSend, chatRef }) => {
    const [open, setOpen] = useState(false);
    const [msg, setMsg] = useState('');
    const unread = chat.length;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!msg.trim()) return;
        onSend(msg);
        setMsg('');
    };

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={() => setOpen(o => !o)}
                title="Group Chat"
                style={{
                    position: 'fixed', bottom: '90px', right: '24px', zIndex: 1001,
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F97AFE, #7B61FF)',
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(123,97,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}
                {!open && unread > 0 && (
                    <span style={{
                        position: 'absolute', top: '-2px', right: '-2px',
                        background: '#EF4444', color: 'white', borderRadius: '50%',
                        width: '18px', height: '18px', fontSize: '10px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{Math.min(unread, 99)}</span>
                )}
            </button>

            {/* Chat Panel */}
            {open && (
                <div style={{
                    position: 'fixed', bottom: '160px', right: '24px', zIndex: 1000,
                    width: '340px', maxHeight: '480px',
                    background: 'white', borderRadius: '20px',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
                    display: 'flex', flexDirection: 'column',
                    fontFamily: "'Poppins', sans-serif",
                    animation: 'chatPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <style>{`@keyframes chatPop{from{opacity:0;transform:scale(0.85) translateY(16px)}to{opacity:1;transform:none}}`}</style>
                    {/* Header */}
                    <div style={{ padding: '14px 16px', background: 'linear-gradient(90deg,#F97AFE,#7B61FF)', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageCircle size={18} color="white" />
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Group Chat</span>
                    </div>
                    {/* Messages */}
                    <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
                        {chat.length === 0 && <p style={{ color: '#9CA3AF', textAlign: 'center', fontSize: '13px', fontStyle: 'italic' }}>No messages yet. Start the conversation!</p>}
                        {chat.map((m, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.isMe ? 'flex-end' : 'flex-start' }}>
                                {!m.isMe && <span style={{ fontSize: '10px', color: '#6B7280', marginBottom: '3px' }}>{m.sender_name}</span>}
                                <div style={{
                                    background: m.isMe ? 'linear-gradient(90deg,#F97AFE,#7B61FF)' : '#F3F4F6',
                                    color: m.isMe ? 'white' : '#111827',
                                    padding: '9px 13px', borderRadius: '14px',
                                    borderBottomRightRadius: m.isMe ? '4px' : '14px',
                                    borderBottomLeftRadius: !m.isMe ? '4px' : '14px',
                                    fontSize: '13px', maxWidth: '85%', lineHeight: '1.4'
                                }}>{m.message}</div>
                            </div>
                        ))}
                    </div>
                    {/* Input */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', padding: '10px 12px', borderTop: '1px solid #F3F4F6', gap: '8px' }}>
                        <input
                            value={msg} onChange={e => setMsg(e.target.value)}
                            placeholder="Type a message…"
                            style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button type="submit" disabled={!msg.trim()} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(90deg,#F97AFE,#7B61FF)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !msg.trim() ? 0.5 : 1 }}>
                            <Send size={15} color="white" />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

// ── Learning Modules Panel ───────────────────────────────────────────
const LearningModulesPanel = ({ varkStyle = 'Visual' }) => {
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const customTopics = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('lurniq_custom_topics') || '[]'); } catch { return []; }
    }, []);
    const TOPICS = useMemo(() => [...BUILTIN_TOPICS, ...customTopics], [customTopics]);
    const categories = useMemo(() => ['All', ...new Set(TOPICS.map(t => t.category))], [TOPICS]);
    const filtered = useMemo(() => activeCategory === 'All' ? TOPICS : TOPICS.filter(t => t.category === activeCategory), [TOPICS, activeCategory]);

    if (selectedTopic) {
        return (
            <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => setSelectedTopic(null)}
                        style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563' }}
                    >
                        <ArrowLeft size={16} /> Back to Modules
                    </button>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>{selectedTopic.label}</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <CapsuleViewer topic={selectedTopic.id} label={selectedTopic.label} modality={varkStyle} custom={selectedTopic} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={20} color="#7B61FF" /> Learning Modules
                </h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                            padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                            background: activeCategory === cat ? '#7B61FF' : '#F3F4F6',
                            color: activeCategory === cat ? 'white' : '#4B5563',
                            transition: 'all 0.2s'
                        }}>{cat}</button>
                    ))}
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', alignContent: 'start' }}>
                {filtered.map(topic => {
                    const diff = DIFFICULTY_META[topic.difficulty] || DIFFICULTY_META[1];
                    return (
                        <div
                            key={topic.id}
                            onClick={() => setSelectedTopic(topic)}
                            style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                            onMouseOver={e => { e.currentTarget.style.borderColor = '#7B61FF'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(123,97,255,0.12)'; }}
                            onMouseOut={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ background: diff.color + '20', color: diff.color, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>{diff.label}</span>
                                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{topic.category}</span>
                            </div>
                            <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>{topic.label}</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>{topic.description}</p>
                            <div style={{ marginTop: '12px', padding: '7px 12px', background: '#F5F3FF', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#7B61FF', textAlign: 'center' }}>
                                Start {varkStyle} Capsule →
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// ── Main Component ───────────────────────────────────────────────────
const StudyPodDetail = () => {
    const { podId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [pod, setPod] = useState(null);
    const [chat, setChat] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTaskText, setEditingTaskText] = useState('');
    const [newTaskText, setNewTaskText] = useState('');
    const [showAddTask, setShowAddTask] = useState(false);
    const [editingGoals, setEditingGoals] = useState(false);
    const [goalsText, setGoalsText] = useState('');
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesText, setNotesText] = useState('');
    
    // Boss Battle State
    const [showBattle, setShowBattle] = useState(false);
    const [startingBattle, setStartingBattle] = useState(false);
    const [copied, setCopied] = useState(false);

    const chatRef = useRef(null);
    const myId = currentUser?._id || currentUser?.id;

    const isEditingGoalsRef = useRef(false);
    const isEditingNotesRef = useRef(false);
    
    useEffect(() => { isEditingGoalsRef.current = editingGoals; }, [editingGoals]);
    useEffect(() => { isEditingNotesRef.current = editingNotes; }, [editingNotes]);

    const loadData = async () => {
        try {
            const [podRes, chatRes] = await Promise.all([getPodDetails(podId), getChatHistory(podId)]);
            setPod(podRes.pod);
            if (!isEditingGoalsRef.current) setGoalsText(podRes.pod.goals || '');
            if (!isEditingNotesRef.current) setNotesText(podRes.pod.notes || '');
            // Annotate messages with isMe flag
            setChat((chatRes.chat_history || []).map(m => ({ ...m, isMe: m.sender_id === myId })));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); const iv = setInterval(loadData, 5000); return () => clearInterval(iv); }, [podId]);
    useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [chat]);

    const handleChatSend = async (msgText) => {
        const tempMsg = { sender_id: myId, sender_name: currentUser.name, message: msgText, timestamp: new Date().toISOString(), isMe: true };
        setChat(c => [...c, tempMsg]);
        try { await sendChatMessage(podId, msgText); loadData(); } catch (e) { console.error(e); }
    };

    const handleStartBattle = async () => {
        try {
            setStartingBattle(true);
            await fetch(`${API_BASE_URL}/pods/${podId}/battle/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('lurniq_token')}` },
                body: JSON.stringify({ topic: pod.weekly_challenge || 'Computer Science' })
            });
            await loadData();
            setShowBattle(true);
        } catch (e) {
            console.error(e);
        } finally {
            setStartingBattle(false);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(pod.pod_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggleTask = async (taskId, isCompleted) => {
        setPod(p => {
            const nc = { ...p.task_completions };
            if (!nc[taskId]) nc[taskId] = [];
            nc[taskId] = isCompleted ? nc[taskId].filter(id => id !== myId) : [...new Set([...nc[taskId], myId])];
            return { ...p, task_completions: nc };
        });
        try { await toggleTask(podId, taskId, !isCompleted); loadData(); } catch (e) { console.error(e); }
    };

    const handleAddTask = async () => {
        if (!newTaskText.trim()) return;
        try { await addTask(podId, newTaskText.trim()); setNewTaskText(''); setShowAddTask(false); loadData(); } catch (e) { console.error(e); }
    };

    const handleEditTask = async (taskId) => {
        if (!editingTaskText.trim()) return;
        try { await editTask(podId, taskId, editingTaskText.trim()); setEditingTaskId(null); loadData(); } catch (e) { console.error(e); }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        setPod(p => ({ ...p, daily_tasks: p.daily_tasks.filter(t => t.id !== taskId) }));
        try { await deleteTask(podId, taskId); loadData(); } catch (e) { console.error(e); }
    };

    const handleSaveGoals = async () => {
        try { await updateGoals(podId, goalsText); setEditingGoals(false); loadData(); } catch (e) { console.error(e); }
    };

    if (loading && !pod) return <div style={{ padding: '100px', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} /></div>;
    if (!pod) return <div style={{ padding: '100px', textAlign: 'center' }}>Pod not found.</div>;

    const memberCount = Object.keys(pod.members).length;
    const totalPossibleTasks = pod.daily_tasks.length * memberCount;
    const totalCompletedTasks = Object.values(pod.task_completions).reduce((sum, u) => sum + u.length, 0);
    const progressPercent = totalPossibleTasks === 0 ? 0 : Math.min(100, Math.round((totalCompletedTasks / totalPossibleTasks) * 100));
    const varkStyle = currentUser?.vark_profile?.style || 'Visual';

    const btnSm = (c) => ({ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', color: c });
    const tab = (isActive) => ({
        padding: '10px 20px', borderRadius: '12px', border: 'none',
        background: isActive ? '#7B61FF' : 'white', color: isActive ? 'white' : '#4B5563',
        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: isActive ? '0 4px 12px rgba(123,97,255,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', gap: '8px'
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate('/pods')} style={{ cursor: 'pointer', background: '#F3F4F6', border: 'none', padding: '8px', borderRadius: '50%', display: 'flex' }}><ArrowLeft size={20} color="#4B5563" /></button>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' }}>{pod.name}</h1>
                    
                    <div style={{ display: 'flex', alignItems: 'center', background: '#F3F4F6', padding: '4px 8px 4px 12px', borderRadius: '20px', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#4B5563' }}>Code: <strong>{pod.pod_code}</strong></span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button onClick={handleCopyCode} style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: copied ? '#10B981' : '#6B7280', transition: 'color 0.2s' }} title="Copy Code">
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            {copied && <span style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>Copied!</span>}
                        </div>
                    </div>

                    <span style={{ background: '#F3F4F6', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#4B5563' }}>{memberCount} Members</span>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        {(pod.active_battle && pod.active_battle.state === 'active') ? (
                            <button onClick={() => setShowBattle(true)} style={{ background: 'linear-gradient(135deg, #F97AFE, #7B61FF)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(123, 97, 255, 0.4)', animation: 'pulse 2s infinite' }}>
                                <Trophy size={18} /> Join Battle
                            </button>
                        ) : (
                            <button onClick={handleStartBattle} disabled={startingBattle} style={{ background: 'linear-gradient(135deg, #F97AFE, #7B61FF)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: startingBattle ? 0.7 : 1, boxShadow: '0 4px 12px rgba(123, 97, 255, 0.2)' }}>
                                {startingBattle ? <Loader2 size={18} className="lucide-spin" /> : <Trophy size={18} />} Start Battle
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                        <span>Group Progress</span><span>{progressPercent}%</span>
                    </div>
                    <div style={{ height: '12px', background: '#F3F4F6', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#F97AFE,#7B61FF)', width: `${progressPercent}%`, transition: 'width 0.5s ease-out' }} />
                    </div>
                </div>
            </div>

            {/* Tabs + Content */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexShrink: 0 }}>
                    <button style={tab(activeTab === 'dashboard')} onClick={() => setActiveTab('dashboard')}><KanbanSquare size={18} /> Dashboard</button>
                    <button style={tab(activeTab === 'notes')} onClick={() => setActiveTab('notes')}><StickyNote size={18} /> Notes</button>
                    <button style={tab(activeTab === 'modules')} onClick={() => setActiveTab('modules')}><BookOpen size={18} /> Modules</button>
                    <button style={tab(activeTab === 'whiteboard')} onClick={() => setActiveTab('whiteboard')}><PenTool size={18} /> Whiteboard</button>
                    <button style={tab(activeTab === 'call')} onClick={() => setActiveTab('call')}><Video size={18} /> Video Call</button>
                    <button style={tab(activeTab === 'learn')} onClick={() => setActiveTab('learn')}><Bot size={18} /> AI Tutor</button>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '24px' }}>
                    {activeTab === 'dashboard' && (
                        <>
                            {/* Goals */}
                            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}><Target size={20} color="#7B61FF" /> Shared Goals</h2>
                                    {!editingGoals
                                        ? <button style={btnSm('#7B61FF')} onClick={() => { setGoalsText(pod.goals || ''); setEditingGoals(true); }}><Pencil size={16} /></button>
                                        : <div style={{ display: 'flex', gap: '6px' }}>
                                            <button style={btnSm('#7B61FF')} onClick={handleSaveGoals}><Save size={16} /></button>
                                            <button style={btnSm('#EF4444')} onClick={() => setEditingGoals(false)}><X size={16} /></button>
                                          </div>
                                    }
                                </div>
                                {editingGoals
                                    ? <textarea value={goalsText} onChange={e => setGoalsText(e.target.value)} placeholder="Set your pod's shared goals..." style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1.5px solid #7B61FF', borderRadius: '8px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', fontSize: '15px', boxSizing: 'border-box' }} />
                                    : <p style={{ margin: 0, color: '#4B5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{pod.goals || <em style={{ color: '#9CA3AF' }}>No goals set yet. Click the pencil to add some!</em>}</p>
                                }
                            </div>

                            {/* Daily Tasks */}
                            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}><CheckCircle2 size={20} color="#7B61FF" /> Daily Tasks</h2>
                                    <button onClick={() => setShowAddTask(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F3E8FF', color: '#7B61FF', border: '1px solid #E9D5FF', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                                        <Plus size={15} /> Add Task
                                    </button>
                                </div>
                                {showAddTask && (
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                        <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTask()} placeholder="New task description..." autoFocus
                                            style={{ flex: 1, border: '1.5px solid #7B61FF', borderRadius: '8px', padding: '8px 12px', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }} />
                                        <button onClick={handleAddTask} style={{ background: '#7B61FF', border: 'none', borderRadius: '8px', padding: '8px 14px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Add</button>
                                        <button onClick={() => setShowAddTask(false)} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}><X size={16} color="#6B7280" /></button>
                                    </div>
                                )}
                                <div>
                                    {pod.daily_tasks.map(task => {
                                        const completedBy = pod.task_completions[task.id] || [];
                                        const isCompletedByMe = completedBy.includes(myId);
                                        const isEditing = editingTaskId === task.id;
                                        return (
                                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F9FAFB', borderRadius: '8px', marginBottom: '8px' }}>
                                                <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => !isEditing && handleToggleTask(task.id, isCompletedByMe)}>
                                                    {isCompletedByMe ? <CheckCircle2 size={22} color="#7B61FF" /> : <Circle size={22} color="#D1D5DB" />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    {isEditing
                                                        ? <input value={editingTaskText} onChange={e => setEditingTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEditTask(task.id)} autoFocus
                                                            style={{ width: '100%', border: '1.5px solid #7B61FF', borderRadius: '6px', padding: '5px 10px', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }} />
                                                        : <>
                                                            <span style={{ fontSize: '15px', color: isCompletedByMe ? '#6B7280' : '#111827', textDecoration: isCompletedByMe ? 'line-through' : 'none' }}>{task.task}</span>
                                                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                {completedBy.map(uid => (
                                                                    <span key={uid} style={{ fontSize: '10px', background: '#F3E8FF', color: '#6B21A8', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>{pod.members[uid]?.split(' ')[0] || 'User'}</span>
                                                                ))}
                                                            </div>
                                                          </>
                                                    }
                                                </div>
                                                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                                    {isEditing
                                                        ? <><button style={btnSm('#7B61FF')} onClick={() => handleEditTask(task.id)}><Check size={16} /></button><button style={btnSm('#EF4444')} onClick={() => setEditingTaskId(null)}><X size={16} /></button></>
                                                        : <><button style={btnSm('#7B61FF')} onClick={() => { setEditingTaskId(task.id); setEditingTaskText(task.task); }}><Pencil size={14} /></button><button style={btnSm('#EF4444')} onClick={() => handleDeleteTask(task.id)}><Trash2 size={14} /></button></>
                                                    }
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {pod.daily_tasks.length === 0 && <p style={{ color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic', margin: '16px 0 0' }}>No tasks yet. Click "+ Add Task" to get started!</p>}
                                </div>
                            </div>

                            {/* Weekly Challenge */}
                            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px' }}>
                                <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}><Trophy size={20} color="#F59E0B" /> Weekly Challenge</h2>
                                <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '16px', borderRadius: '12px' }}>
                                    <p style={{ margin: 0, color: '#92400E', fontWeight: 500 }}>{pod.weekly_challenge || "No active challenge this week."}</p>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'notes' && (
                        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}><StickyNote size={20} color="#7B61FF" /> Shared Notes</h2>
                                {!editingNotes
                                    ? <div style={{ display: 'flex', gap: '8px' }}>
                                          <button style={btnSm('#10B981')} onClick={() => {
                                              const element = document.createElement("a");
                                              const file = new Blob([pod.notes || 'No notes taken yet.'], {type: 'text/plain'});
                                              element.href = URL.createObjectURL(file);
                                              element.download = `${pod.name ? pod.name.replace(/\s+/g, '_') : 'study_pod'}_notes.txt`;
                                              document.body.appendChild(element);
                                              element.click();
                                          }} title="Download Notes">
                                              <Download size={16} />
                                          </button>
                                          <button style={btnSm('#7B61FF')} onClick={() => { setNotesText(pod.notes || ''); setEditingNotes(true); }}><Pencil size={16} /></button>
                                      </div>
                                    : <div style={{ display: 'flex', gap: '6px' }}>
                                        <button style={btnSm('#7B61FF')} onClick={async () => { try { await updateNotes(podId, notesText); setEditingNotes(false); loadData(); } catch(e) { console.error(e); } }}><Save size={16} /></button>
                                        <button style={btnSm('#EF4444')} onClick={() => setEditingNotes(false)}><X size={16} /></button>
                                      </div>
                                }
                            </div>
                            
                            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ position: 'absolute', top: 0, left: '32px', bottom: 0, width: '2px', background: '#FCA5A5', zIndex: 1, pointerEvents: 'none' }} />
                                
                                {editingNotes
                                    ? <textarea value={notesText} onChange={e => setNotesText(e.target.value)} placeholder="Type shared notes for the pod here..." style={{ flex: 1, minHeight: '400px', width: '100%', padding: '24px 24px 24px 48px', border: '1px solid #FDE68A', borderRadius: '4px', resize: 'vertical', outline: 'none', fontFamily: "'Courier New', Courier, monospace", fontSize: '15px', boxSizing: 'border-box', background: '#FFFBEB', lineHeight: '28px', backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #FDE68A 27px, #FDE68A 28px)', color: '#374151', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02), 4px 4px 15px rgba(0,0,0,0.05)' }} />
                                    : <div style={{ flex: 1, minHeight: '400px', padding: '24px 24px 24px 48px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '4px', overflowY: 'auto', fontFamily: "'Courier New', Courier, monospace", fontSize: '15px', lineHeight: '28px', backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #FDE68A 27px, #FDE68A 28px)', color: '#374151', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02), 4px 4px 15px rgba(0,0,0,0.05)' }}>
                                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', position: 'relative', zIndex: 2 }}>{pod.notes || <em style={{ color: '#9CA3AF' }}>No notes taken yet. Click the pencil icon to start typing!</em>}</p>
                                      </div>
                                }
                            </div>
                        </div>
                    )}

                    {activeTab === 'modules' && <LearningModulesPanel varkStyle={varkStyle} />}
                    {activeTab === 'whiteboard' && <PodWhiteboard podCode={pod.pod_code} />}
                    {activeTab === 'call' && <PodVideoCall podCode={pod.pod_code} userName={currentUser.name} />}
                    {activeTab === 'learn' && <div style={{ flex: 1, display: 'flex' }}><AIChatbot inline={true} /></div>}
                </div>
            </div>

            {/* Floating Chat Icon */}
            <FloatingChat chat={chat} onSend={handleChatSend} chatRef={chatRef} />
            
            {showBattle && (
                <PodBattle podId={podId} currentUser={currentUser} onClose={() => setShowBattle(false)} />
            )}
        </div>
    );
};

export default StudyPodDetail;
