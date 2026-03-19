import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPodDetails, getChatHistory, sendChatMessage, toggleTask } from '../services/podService';
import { useAuth } from '../context/AuthContext';
import { Loader2, Send, CheckCircle2, Circle, ArrowLeft, Target, Trophy } from 'lucide-react';

const StudyPodDetail = () => {
    const { podId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    const [pod, setPod] = useState(null);
    const [chat, setChat] = useState([]);
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(true);
    
    const chatRef = useRef(null);

    const loadData = async () => {
        try {
            const [podRes, chatRes] = await Promise.all([
                getPodDetails(podId),
                getChatHistory(podId)
            ]);
            setPod(podRes.pod);
            setChat(chatRes.chat_history || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000); // Polling for chat updates
        return () => clearInterval(interval);
    }, [podId]);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
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
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleTask = async (taskId, isCompleted) => {
        const myId = currentUser._id || currentUser.id;
        setPod(p => {
            const newCompletions = { ...p.task_completions };
            if (!newCompletions[taskId]) newCompletions[taskId] = [];
            
            if (isCompleted) {
                newCompletions[taskId] = newCompletions[taskId].filter(id => id !== myId);
            } else {
                if (!newCompletions[taskId].includes(myId)) {
                    newCompletions[taskId] = [...newCompletions[taskId], myId];
                }
            }
            return { ...p, task_completions: newCompletions };
        });

        try {
            await toggleTask(podId, taskId, !isCompleted);
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

    const s = {
        container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', boxSizing: 'border-box' },
        header: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', flexShrink: 0 },
        titleRow: { display: 'flex', alignItems: 'center', gap: '16px' },
        backBtn: { cursor: 'pointer', background: '#F3F4F6', border: 'none', padding: '8px', borderRadius: '50%', display: 'flex' },
        title: { fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' },
        badge: { background: '#F3F4F6', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#4B5563' },
        progressBarBg: { height: '12px', background: '#F3F4F6', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' },
        progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #F97AFE, #7B61FF)', transition: 'width 0.5s ease-out' },
        main: { display: 'flex', gap: '24px', flex: 1, minHeight: 0 },
        leftPanel: { flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', paddingRight: '4px' },
        card: { background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px' },
        cardTitle: { fontSize: '18px', fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' },
        taskRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', transition: 'background 0.2s' },
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
                        <span>Group Progress</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div style={s.progressBarBg}><div style={{...s.progressBarFill, width: `${progressPercent}%`}} /></div>
                </div>
            </div>

            <div style={s.main}>
                <div style={s.leftPanel}>
                    <div style={s.card}>
                        <h2 style={s.cardTitle}><Target size={20} color="#7B61FF" /> Shared Goals</h2>
                        <p style={{ margin: 0, color: '#4B5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {pod.goals || "No goals set. Work together and conquer!"}
                        </p>
                    </div>

                    <div style={s.card}>
                        <h2 style={s.cardTitle}><CheckCircle2 size={20} color="#10B981" /> Daily Tasks</h2>
                        <div>
                            {pod.daily_tasks.map(task => {
                                const completedBy = pod.task_completions[task.id] || [];
                                const isCompletedByMe = completedBy.includes(myId);
                                
                                return (
                                    <div 
                                        key={task.id} 
                                        style={s.taskRow}
                                        onClick={() => handleToggleTask(task.id, isCompletedByMe)}
                                    >
                                        {isCompletedByMe ? <CheckCircle2 size={22} color="#10B981" /> : <Circle size={22} color="#D1D5DB" />}
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '15px', color: isCompletedByMe ? '#6B7280' : '#111827', textDecoration: isCompletedByMe ? 'line-through' : 'none' }}>
                                                {task.task}
                                            </span>
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                {completedBy.map(uid => (
                                                    <span key={uid} style={{ fontSize: '10px', background: '#D1FAE5', color: '#065F46', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                                                        {pod.members[uid]?.split(' ')[0] || 'User'}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={s.card}>
                        <h2 style={s.cardTitle}><Trophy size={20} color="#F59E0B" /> Weekly Challenge</h2>
                        <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '16px', borderRadius: '12px' }}>
                            <p style={{ margin: 0, color: '#92400E', fontWeight: 500 }}>
                                {pod.weekly_challenge || "No active challenge this week."}
                            </p>
                        </div>
                    </div>
                </div>

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
                        <button type="submit" style={s.sendBtn} disabled={!msg.trim()}>
                            <Send size={18} color="white" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudyPodDetail;
