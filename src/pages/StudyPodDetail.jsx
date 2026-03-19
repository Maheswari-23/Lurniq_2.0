import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPodDetails, getChatHistory, sendChatMessage, toggleTask, addTask, editTask, deleteTask, updateGoals } from '../services/podService';
import { useAuth } from '../context/AuthContext';
import { Loader2, Send, CheckCircle2, Circle, ArrowLeft, Target, Trophy, Video, KanbanSquare, Bot, Plus, Pencil, Trash2, Check, X, Save } from 'lucide-react';
import PodVideoCall from '../components/phase2/PodVideoCall';
import AIChatbot from '../components/AIChatbot';

const StudyPodDetail = () => {
    const { podId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    const [pod, setPod] = useState(null);
    const [chat, setChat] = useState([]);
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Task editing state
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTaskText, setEditingTaskText] = useState('');
    const [newTaskText, setNewTaskText] = useState('');
    const [showAddTask, setShowAddTask] = useState(false);

    // Goal editing state
    const [editingGoals, setEditingGoals] = useState(false);
    const [goalsText, setGoalsText] = useState('');

    const chatRef = useRef(null);

    const loadData = async () => {
        try {
            const [podRes, chatRes] = await Promise.all([
                getPodDetails(podId),
                getChatHistory(podId)
            ]);
            setPod(podRes.pod);
            if (!editingGoals) setGoalsText(podRes.pod.goals || '');
            setChat(chatRes.chat_history || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, [podId]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [chat]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!msg.trim()) return;
        const currentMsg = msg;
        setMsg('');
        const myId = currentUser._id || currentUser.id;
        const tempMsg = { sender_id: myId, sender_name: currentUser.name, message: currentMsg, timestamp: new Date().toISOString() };
        setChat(c => [...c, tempMsg]);
        try {
            await sendChatMessage(podId, currentMsg);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleToggleTask = async (taskId, isCompleted) => {
        const myId = currentUser._id || currentUser.id;
        setPod(p => {
            const newCompletions = { ...p.task_completions };
            if (!newCompletions[taskId]) newCompletions[taskId] = [];
            if (isCompleted) {
                newCompletions[taskId] = newCompletions[taskId].filter(id => id !== myId);
            } else {
                if (!newCompletions[taskId].includes(myId)) newCompletions[taskId] = [...newCompletions[taskId], myId];
            }
            return { ...p, task_completions: newCompletions };
        });
        try {
            await toggleTask(podId, taskId, !isCompleted);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleAddTask = async () => {
        if (!newTaskText.trim()) return;
        try {
            await addTask(podId, newTaskText.trim());
            setNewTaskText('');
            setShowAddTask(false);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleEditTask = async (taskId) => {
        if (!editingTaskText.trim()) return;
        try {
            await editTask(podId, taskId, editingTaskText.trim());
            setEditingTaskId(null);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        setPod(p => ({ ...p, daily_tasks: p.daily_tasks.filter(t => t.id !== taskId) }));
        try {
            await deleteTask(podId, taskId);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleSaveGoals = async () => {
        try {
            await updateGoals(podId, goalsText);
            setEditingGoals(false);
            loadData();
        } catch (e) { console.error(e); }
    };

    if (loading && !pod) return <div style={{ padding: '100px', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} /></div>;
    if (!pod) return <div style={{ padding: '100px', textAlign: 'center' }}>Pod not found.</div>;

    const myId = currentUser._id || currentUser.id;
    const memberCount = Object.keys(pod.members).length;
    const totalPossibleTasks = pod.daily_tasks.length * memberCount;
    const totalCompletedTasks = Object.values(pod.task_completions).reduce((sum, users) => sum + users.length, 0);
    const progressPercent = totalPossibleTasks === 0 ? 0 : Math.min(100, Math.round((totalCompletedTasks / totalPossibleTasks) * 100));

    const btnSm = (color) => ({
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', color
    });

    const s = {
        container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', boxSizing: 'border-box' },
        header: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', flexShrink: 0 },
        titleRow: { display: 'flex', alignItems: 'center', gap: '16px' },
        backBtn: { cursor: 'pointer', background: '#F3F4F6', border: 'none', padding: '8px', borderRadius: '50%', display: 'flex' },
        title: { fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' },
        badge: { background: '#F3F4F6', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#4B5563' },
        progressBarBg: { height: '12px', background: '#F3F4F6', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' },
        progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #F97AFE, #7B61FF)', transition: 'width 0.5s ease-out' },
        tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexShrink: 0 },
        tab: (isActive) => ({
            padding: '10px 20px', borderRadius: '12px', border: 'none',
            background: isActive ? '#7B61FF' : 'white',
            color: isActive ? 'white' : '#4B5563',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: isActive ? '0 4px 12px rgba(123,97,255,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', gap: '8px'
        }),
        main: { display: 'flex', gap: '24px', flex: 1, minHeight: 0 },
        leftPanel: { flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', paddingRight: '4px' },
        card: { background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px' },
        cardTitle: { fontSize: '18px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' },
        taskRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F9FAFB', borderRadius: '8px', marginBottom: '8px', transition: 'background 0.2s' },
        rightPanel: { width: '380px', display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', overflow: 'hidden', flexShrink: 0 },
        chatHeader: { padding: '16px', borderBottom: '1px solid #E5E7EB', fontWeight: 600, background: '#F9FAFB', flexShrink: 0 },
        chatMsgs: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
        msgWrapper: (isMe) => ({ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }),
        msgBubble: (isMe) => ({ background: isMe ? '#7B61FF' : '#F3F4F6', color: isMe ? 'white' : '#111827', padding: '10px 14px', borderRadius: '16px', borderBottomRightRadius: isMe ? '4px' : '16px', borderBottomLeftRadius: !isMe ? '4px' : '16px', maxWidth: '85%', fontSize: '14px', lineHeight: '1.4' }),
        msgSender: { fontSize: '11px', color: '#6B7280', margin: '0 4px 4px' },
        chatInputForm: { display: 'flex', padding: '16px', borderTop: '1px solid #E5E7EB', gap: '8px', background: 'white', flexShrink: 0 },
        chatInput: { flex: 1, border: '1px solid #E5E7EB', borderRadius: '24px', padding: '10px 16px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' },
        sendBtn: { background: '#7B61FF', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }
    };

    return (
        <div style={s.container}>
            <div style={s.header}>
                <div style={s.titleRow}>
                    <button onClick={() => navigate('/pods')} style={s.backBtn}><ArrowLeft size={20} color="#4B5563" /></button>
                    <h1 style={s.title}>{pod.name}</h1>
                    <span style={s.badge}>Code: {pod.pod_code}</span>
                    <span style={s.badge}>{memberCount} Members</span>
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                        <span>Group Progress</span><span>{progressPercent}%</span>
                    </div>
                    <div style={s.progressBarBg}><div style={{ ...s.progressBarFill, width: `${progressPercent}%` }} /></div>
                </div>
            </div>

            <div style={s.main}>
                <div style={s.leftPanel}>
                    <div style={s.tabs}>
                        <button style={s.tab(activeTab === 'dashboard')} onClick={() => setActiveTab('dashboard')}><KanbanSquare size={18} /> Dashboard</button>
                        <button style={s.tab(activeTab === 'call')} onClick={() => setActiveTab('call')}><Video size={18} /> Video Call</button>
                        <button style={s.tab(activeTab === 'learn')} onClick={() => setActiveTab('learn')}><Bot size={18} /> Learning Hub</button>
                    </div>

                    {activeTab === 'dashboard' && (
                        <>
                            {/* ── Goals Card ── */}
                            <div style={s.card}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h2 style={{ ...s.cardTitle, margin: 0 }}><Target size={20} color="#7B61FF" /> Shared Goals</h2>
                                    {!editingGoals
                                        ? <button style={btnSm('#7B61FF')} onClick={() => { setGoalsText(pod.goals || ''); setEditingGoals(true); }} title="Edit goals"><Pencil size={16} /></button>
                                        : <div style={{ display: 'flex', gap: '6px' }}>
                                            <button style={btnSm('#10B981')} onClick={handleSaveGoals} title="Save"><Save size={16} /></button>
                                            <button style={btnSm('#EF4444')} onClick={() => setEditingGoals(false)} title="Cancel"><X size={16} /></button>
                                          </div>
                                    }
                                </div>
                                {editingGoals
                                    ? <textarea
                                        value={goalsText}
                                        onChange={e => setGoalsText(e.target.value)}
                                        placeholder="Set your pod's shared goals..."
                                        style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1.5px solid #7B61FF', borderRadius: '8px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', fontSize: '15px', boxSizing: 'border-box' }}
                                      />
                                    : <p style={{ margin: 0, color: '#4B5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{pod.goals || <em style={{ color: '#9CA3AF' }}>No goals set yet. Click the pencil to add some!</em>}</p>
                                }
                            </div>

                            {/* ── Daily Tasks Card ── */}
                            <div style={s.card}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h2 style={{ ...s.cardTitle, margin: 0 }}><CheckCircle2 size={20} color="#10B981" /> Daily Tasks</h2>
                                    <button
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#F0FDF4', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                                        onClick={() => setShowAddTask(p => !p)}
                                    >
                                        <Plus size={15} /> Add Task
                                    </button>
                                </div>

                                {showAddTask && (
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                        <input
                                            value={newTaskText}
                                            onChange={e => setNewTaskText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                            placeholder="New task description..."
                                            style={{ flex: 1, border: '1.5px solid #7B61FF', borderRadius: '8px', padding: '8px 12px', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }}
                                            autoFocus
                                        />
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
                                            <div key={task.id} style={s.taskRow}>
                                                {/* Checkbox */}
                                                <div
                                                    style={{ cursor: 'pointer', flexShrink: 0 }}
                                                    onClick={() => !isEditing && handleToggleTask(task.id, isCompletedByMe)}
                                                >
                                                    {isCompletedByMe ? <CheckCircle2 size={22} color="#10B981" /> : <Circle size={22} color="#D1D5DB" />}
                                                </div>

                                                {/* Task text or editor */}
                                                <div style={{ flex: 1 }}>
                                                    {isEditing
                                                        ? <input
                                                            value={editingTaskText}
                                                            onChange={e => setEditingTaskText(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleEditTask(task.id)}
                                                            style={{ width: '100%', border: '1.5px solid #7B61FF', borderRadius: '6px', padding: '5px 10px', outline: 'none', fontFamily: 'inherit', fontSize: '14px' }}
                                                            autoFocus
                                                          />
                                                        : <>
                                                            <span style={{ fontSize: '15px', color: isCompletedByMe ? '#6B7280' : '#111827', textDecoration: isCompletedByMe ? 'line-through' : 'none' }}>
                                                                {task.task}
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                {completedBy.map(uid => (
                                                                    <span key={uid} style={{ fontSize: '10px', background: '#D1FAE5', color: '#065F46', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                                                                        {pod.members[uid]?.split(' ')[0] || 'User'}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                          </>
                                                    }
                                                </div>

                                                {/* Action buttons */}
                                                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                                    {isEditing
                                                        ? <>
                                                            <button style={btnSm('#10B981')} onClick={() => handleEditTask(task.id)} title="Save"><Check size={16} /></button>
                                                            <button style={btnSm('#EF4444')} onClick={() => setEditingTaskId(null)} title="Cancel"><X size={16} /></button>
                                                          </>
                                                        : <>
                                                            <button style={btnSm('#7B61FF')} onClick={() => { setEditingTaskId(task.id); setEditingTaskText(task.task); }} title="Edit task"><Pencil size={14} /></button>
                                                            <button style={btnSm('#EF4444')} onClick={() => handleDeleteTask(task.id)} title="Delete task"><Trash2 size={14} /></button>
                                                          </>
                                                    }
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {pod.daily_tasks.length === 0 && (
                                        <p style={{ color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic', margin: '16px 0 0' }}>No tasks yet. Click "+ Add Task" to get started!</p>
                                    )}
                                </div>
                            </div>

                            {/* ── Weekly Challenge Card ── */}
                            <div style={s.card}>
                                <h2 style={s.cardTitle}><Trophy size={20} color="#F59E0B" /> Weekly Challenge</h2>
                                <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '16px', borderRadius: '12px' }}>
                                    <p style={{ margin: 0, color: '#92400E', fontWeight: 500 }}>
                                        {pod.weekly_challenge || "No active challenge this week."}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'call' && (
                        <PodVideoCall podCode={pod.pod_code} userName={currentUser.name} />
                    )}

                    {activeTab === 'learn' && (
                        <div style={{ flex: 1, display: 'flex' }}>
                            <AIChatbot inline={true} />
                        </div>
                    )}
                </div>

                {/* ── Right: Group Chat ── */}
                <div style={s.rightPanel}>
                    <div style={s.chatHeader}>Group Chat</div>
                    <div style={s.chatMsgs} ref={chatRef}>
                        {chat.map((m, i) => {
                            const isMe = m.sender_id === myId;
                            return (
                                <div key={i} style={s.msgWrapper(isMe)}>
                                    {!isMe && <span style={s.msgSender}>{m.sender_name}</span>}
                                    <div style={s.msgBubble(isMe)}>{m.message}</div>
                                </div>
                            );
                        })}
                    </div>
                    <form style={s.chatInputForm} onSubmit={handleSend}>
                        <input style={s.chatInput} placeholder="Type a message..." value={msg} onChange={e => setMsg(e.target.value)} />
                        <button type="submit" style={s.sendBtn} disabled={!msg.trim()}><Send size={18} color="white" /></button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudyPodDetail;
