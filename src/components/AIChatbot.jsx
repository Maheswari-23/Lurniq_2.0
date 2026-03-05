// src/components/AIChatbot.jsx
// Floating chatbot — user enters any topic, instantly gets VARK-tailored content
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import API_BASE_URL from '../config.js';

const QUICK_STARTERS = ['Explain Big-O simply', 'What is a closure?', 'How does sorting work?', 'What is hashing?'];

const AIChatbot = ({ varkStyle = 'Visual' }) => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: `Hi! I'm your Lurniq AI tutor 👋 Ask me anything — I'll explain it in a **${varkStyle}** way just for you.` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

    const sendMessage = async (text) => {
        const q = (text || input).trim();
        if (!q || loading) return;
        setInput('');
        setMessages(m => [...m, { role: 'user', text: q }]);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/chatbot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('lurniq_token')}` },
                body: JSON.stringify({ question: q, vark_style: varkStyle }),
            });
            if (!res.ok) throw new Error('Server error');
            const data = await res.json();
            setMessages(m => [...m, { role: 'bot', text: data.answer || 'Sorry, I couldn\'t find an answer.' }]);
        } catch {
            // Offline fallback — generate a basic explanation client-side
            const fallback = generateFallback(q, varkStyle);
            setMessages(m => [...m, { role: 'bot', text: fallback }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={() => setOpen(o => !o)}
                title="Ask AI Tutor"
                style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg,#F97AFE,#7B61FF)',
                    border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(123,97,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}
            </button>

            {/* Chat panel */}
            {open && (
                <div style={{
                    position: 'fixed', bottom: '92px', right: '24px', zIndex: 999,
                    width: '340px', maxHeight: '480px',
                    background: 'white', borderRadius: '20px',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column',
                    fontFamily: "'Poppins', sans-serif",
                    animation: 'chatPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <style>{`
            @keyframes chatPop { from{opacity:0;transform:scale(0.85) translateY(16px)} to{opacity:1;transform:none} }
            .chat-msg-bot  { background:#F5F3FF; color:#111827; border-radius:14px 14px 14px 4px; align-self:flex-start; }
            .chat-msg-user { background:linear-gradient(90deg,#F97AFE,#7B61FF); color:white; border-radius:14px 14px 4px 14px; align-self:flex-end; }
          `}</style>

                    {/* Header */}
                    <div style={{ padding: '14px 16px', background: 'linear-gradient(90deg,#F97AFE,#7B61FF)', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bot size={18} color="white" />
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Lurniq AI Tutor</span>
                        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '99px' }}>{varkStyle}</span>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
                        {messages.map((m, i) => (
                            <div key={i} className={m.role === 'bot' ? 'chat-msg-bot' : 'chat-msg-user'} style={{ padding: '10px 13px', fontSize: '13px', lineHeight: 1.55, maxWidth: '85%' }}>
                                {m.text}
                            </div>
                        ))}
                        {loading && (
                            <div className="chat-msg-bot" style={{ padding: '10px 13px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <Loader2 size={14} color="#7B61FF" style={{ animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontSize: '13px', color: '#6B7280' }}>Thinking…</span>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Quick starters (only on first message) */}
                    {messages.length === 1 && (
                        <div style={{ padding: '0 12px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {QUICK_STARTERS.map(q => (
                                <button key={q} onClick={() => sendMessage(q)} style={{ fontSize: '11px', background: '#F5F3FF', color: '#7B61FF', border: '1px solid #C4B5FD', borderRadius: '99px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div style={{ padding: '10px 12px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask anything…"
                            style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(90deg,#F97AFE,#7B61FF)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || loading ? 0.5 : 1 }}>
                            <Send size={15} color="white" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

// ── Client-side fallback when backend offline ──────────────────────────────
function generateFallback(question, style) {
    const q = question.toLowerCase();
    if (q.includes('closure')) return style === 'Visual' ? 'A closure is a function that "captures" variables from its enclosing scope. Think of it as a backpack 🎒 — the function carries its variables with it.' : 'A closure is a function that retains access to variables from its outer scope even after that scope has finished executing.';
    if (q.includes('sort')) return style === 'Visual' ? 'Sorting = arranging items in order. Bubble sort swaps neighbours repeatedly. Merge sort splits the list in half, sorts each half, then merges. Quick sort picks a pivot and partitions around it.' : 'Common sorting algorithms: Bubble O(n²), Merge O(n log n), Quick O(n log n) average. Most languages use TimSort (hybrid merge+insertion) internally.';
    if (q.includes('hash')) return style === 'Visual' ? 'Hashing converts a key into an array index using a hash function. Like filing cabinets 🗄️ — you compute which drawer to open from the label.' : 'A hash function maps arbitrary keys to fixed-size indices. Hash maps give O(1) average lookup, O(n) worst case due to collisions.';
    if (q.includes('big-o') || q.includes('bigo')) return 'Big-O describes how an algorithm scales with input size. O(1)=constant, O(log n)=binary search, O(n)=loop, O(n²)=nested loops.';
    return `Great question about "${question}"! I'm currently offline, but here's a tip: try searching "${question} explained" on MDN or Wikipedia for a solid explanation. Your ${style} learning style means you'll benefit from ${style === 'Visual' ? 'diagrams and charts' : style === 'Auditory' ? 'video lectures' : style === 'Reading' ? 'detailed articles' : 'hands-on coding exercises'}.`;
}

export default AIChatbot;
