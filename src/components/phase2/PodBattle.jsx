import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import { Trophy, Clock, X, CheckCircle2, Circle } from 'lucide-react';

const PodBattle = ({ podId, onClose, currentUser }) => {
    const [battle, setBattle] = useState(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedAns, setSelectedAns] = useState(null);
    const [feedback, setFeedback] = useState(null); 
    const [countdown, setCountdown] = useState(30);

    const token = localStorage.getItem('lurniq_token');

    const fetchState = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/pods/${podId}/battle/state`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.battle) {
                setBattle(data.battle);
            } else {
                setBattle(null);
                onClose(); // Battle doesn't exist or ended
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Poll battle state every 3 seconds to update leaderboard
    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 3000);
        return () => clearInterval(interval);
    }, [podId]);

    // Question countdown timer
    useEffect(() => {
        if (!battle || battle.state === 'ended') return;
        
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            // Auto advance
            handleNextQ();
        }
    }, [countdown, battle]);

    const handleNextQ = () => {
        if (!battle) return;
        if (currentQ < battle.questions.length - 1) {
            setCurrentQ(q => q + 1);
            setSelectedAns(null);
            setFeedback(null);
            setCountdown(30);
        } else {
            // If it's the last question and time is up, maybe just stay on leaderboard
            if (battle.started_by === currentUser.id || currentUser.id) {
                // Anyone can trigger end if they finish? Let's just let the UI handle ended state locally for the user
                // Actually the battle ends when the person who started it clicks "End Battle", or everyone finishes.
                // For hackathon simplicity, let's just show local end screen.
            }
        }
    };

    const submitAnswer = async (ansIndex) => {
        if (selectedAns !== null || !battle) return;
        setSelectedAns(ansIndex);
        
        try {
            const res = await fetch(`${API_BASE_URL}/pods/${podId}/battle/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ q_index: currentQ, ans_index: ansIndex })
            });
            const data = await res.json();
            if (data.success) {
                setFeedback(data.correct ? 'correct' : 'incorrect');
                fetchState(); // instant refresh leaderboard
                
                setTimeout(() => {
                    handleNextQ();
                }, 2000);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const endBattle = async () => {
        try {
            await fetch(`${API_BASE_URL}/pods/${podId}/battle/end`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    if (!battle) return null;

    const isEnded = battle.state === 'ended' || (currentQ >= battle.questions.length - 1 && selectedAns !== null && countdown === 0);
    const question = battle.questions[currentQ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'radial-gradient(circle at 50% 10%, #2e1065 0%, #111827 70%)', zIndex: 9999, display: 'flex',
            flexDirection: 'column', color: 'white', fontFamily: "'Poppins', sans-serif"
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #F97AFE, #7B61FF)', padding: '10px', borderRadius: '14px', boxShadow: '0 0 20px rgba(123, 97, 255, 0.5)' }}>
                        <Trophy size={28} color="white" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Live Boss Battle</h2>
                        <span style={{ fontSize: '14px', color: '#9CA3AF' }}>Topic: {battle.topic}</span>
                    </div>
                </div>
                {battle.started_by === currentUser.id && (
                    <button onClick={endBattle} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>End Battle For All</button>
                )}
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={32} /></button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Main Battle Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', justifyContent: 'center', alignItems: 'center' }}>
                    {!isEnded ? (
                        <div style={{ width: '100%', maxWidth: '800px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <span style={{ fontSize: '18px', fontWeight: 600, color: '#A78BFA' }}>Question {currentQ + 1} <span style={{ color: '#6B7280' }}>/ {battle.questions.length}</span></span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: countdown <= 10 ? 'rgba(239,68,68,0.2)' : 'rgba(123,97,255,0.2)', color: countdown <= 10 ? '#FCA5A5' : '#E0E7FF', padding: '10px 20px', borderRadius: '24px', transition: 'all 0.3s', border: `1px solid ${countdown <= 10 ? '#EF4444' : '#7B61FF'}`, boxShadow: countdown <= 10 ? '0 0 15px rgba(239,68,68,0.4)' : '0 0 15px rgba(123,97,255,0.4)' }}>
                                    <Clock size={20} />
                                    <span style={{ fontSize: '20px', fontWeight: 700 }}>{countdown}s</span>
                                </div>
                            </div>
                            
                            <h1 style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1.4, marginBottom: '40px' }}>{question.q}</h1>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {question.options.map((opt, i) => {
                                    const isSelected = selectedAns === i;
                                    let bg = 'rgba(255,255,255,0.05)';
                                    let border = '2px solid rgba(255,255,255,0.1)';
                                    
                                    if (isSelected) {
                                        if (feedback === 'correct') { bg = 'rgba(16, 185, 129, 0.2)'; border = '2px solid #10B981'; }
                                        else if (feedback === 'incorrect') { bg = 'rgba(239, 68, 68, 0.2)'; border = '2px solid #EF4444'; }
                                        else { bg = 'rgba(123, 97, 255, 0.2)'; border = '2px solid #7B61FF'; }
                                    }

                                    return (
                                        <button 
                                            key={i}
                                            onClick={() => submitAnswer(i)}
                                            disabled={selectedAns !== null}
                                            style={{
                                                background: bg, border,
                                                padding: '24px', borderRadius: '16px', fontSize: '18px', color: 'white',
                                                cursor: selectedAns !== null ? 'default' : 'pointer',
                                                textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', fontWeight: 500,
                                                boxShadow: isSelected ? (feedback === 'correct' ? '0 0 20px rgba(16,185,129,0.3)' : feedback === 'incorrect' ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 20px rgba(123,97,255,0.3)') : 'none'
                                            }}
                                            onMouseOver={e => { if(selectedAns === null) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                            onMouseOut={e => { if(selectedAns === null) { e.currentTarget.style.background = bg; e.currentTarget.style.transform = 'translateY(0)'; } }}
                                        >
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isSelected ? (feedback === 'correct' ? '#10B981' : feedback === 'incorrect' ? '#EF4444' : '#7B61FF') : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                                {['A','B','C','D'][i]}
                                            </div>
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            {feedback && (
                                <div style={{ marginTop: '30px', textAlign: 'center', animation: 'fadeIn 0.3s' }}>
                                    {feedback === 'correct' ? <span style={{ color: '#10B981', fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><CheckCircle2 size={30} /> Correct! +1 Point</span> : <span style={{ color: '#EF4444', fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><X size={30} /> Incorrect</span>}
                                </div>
                            )}

                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', animation: 'chatPop 0.5s cubic-bezier(0.34,1.56,0.64,1)', background: 'rgba(255,255,255,0.03)', padding: '60px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                            <Trophy size={80} color="#F97AFE" style={{ marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(249,122,254,0.6))' }} />
                            <h1 style={{ fontSize: '48px', fontWeight: 800, margin: '0 0 10px', background: 'linear-gradient(135deg, #F97AFE, #7B61FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Battle Complete!</h1>
                            <p style={{ fontSize: '20px', color: '#D1D5DB' }}>Check the final leaderboard safely.</p>
                            <button onClick={onClose} style={{ marginTop: '40px', background: 'linear-gradient(135deg, #F97AFE, #7B61FF)', color: 'white', border: 'none', padding: '16px 40px', borderRadius: '99px', fontSize: '20px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 30px rgba(123,97,255,0.4)', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>Return to Pod</button>
                        </div>
                    )}
                </div>

                {/* Sidebar Leaderboard */}
                <div style={{ width: '380px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: '#A78BFA' }}>
                            <Trophy size={20} color="#F97AFE" /> Live Leaderboard
                        </h3>
                    </div>
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                        {battle.leaderboard.map((user, idx) => (
                            <div key={user.user_id} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: user.user_id === currentUser.id ? 'rgba(123,97,255,0.2)' : 'rgba(255,255,255,0.05)', border: user.user_id === currentUser.id ? '1px solid rgba(123,97,255,0.5)' : '1px solid transparent', padding: '16px', borderRadius: '16px', transition: 'all 0.2s' }}>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: idx === 0 ? '#FBBF24' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#F59E0B' : '#6B7280', width: '30px', textShadow: idx === 0 ? '0 0 10px rgba(251,191,36,0.5)' : 'none' }}>
                                    #{idx + 1}
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `hsl(${(idx * 50) % 360}, 70%, 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                                    {user.name.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{user.name} {user.user_id === currentUser.id && "(You)"}</div>
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 800 }}>{user.score}</div>
                            </div>
                        ))}
                        {battle.leaderboard.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#6B7280', marginTop: '20px', fontStyle: 'italic' }}>Waiting for scores...</div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
                @keyframes chatPop { from{opacity:0;transform:scale(0.85) translateY(16px)} to{opacity:1;transform:none} }
            `}</style>
        </div>
    );
};

export default PodBattle;
