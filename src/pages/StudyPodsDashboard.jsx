import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPods, createPod, joinPod } from '../services/podService';
import { Users, Plus, Key, Loader2, ArrowRight } from 'lucide-react';

const StudyPodsDashboard = () => {
    const navigate = useNavigate();
    const [pods, setPods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    
    // Form states
    const [name, setName] = useState('');
    const [goals, setGoals] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState(null);

    const loadPods = async () => {
        try {
            setLoading(true);
            const { pods } = await getMyPods();
            setPods(pods);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPods(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await createPod(name, goals, "");
            navigate(`/pods/${res.pod_id}`);
        } catch (e) { setError(e.message); }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await joinPod(joinCode);
            navigate(`/pods/${res.pod_id}`);
        } catch (e) { setError(e.message); }
    };

    const styles = {
        container: { maxWidth: '1000px', margin: '40px auto', padding: '0 20px' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
        title: { fontSize: '28px', fontWeight: 600, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
        card: { background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', position: 'relative' },
        actionCard: { background: '#F9FAFB', border: '2px dashed #E5E7EB', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '180px' },
        btn: { background: 'linear-gradient(135deg, #F97AFE, #7B61FF)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: '16px' },
        input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', marginBottom: '12px', fontSize: '14px', boxSizing: 'border-box' },
        modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
        modal: { background: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '400px' }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}><Users size={32} color="#7B61FF" /> Study Pods</h1>
            </div>

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
                    <p>Loading your pods...</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {pods.map(pod => (
                        <div 
                            key={pod.id} 
                            style={styles.card}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#7B61FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = styles.card.boxShadow; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                            onClick={() => navigate(`/pods/${pod.id}`)}
                        >
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#111827' }}>{pod.name}</h3>
                            <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>Code: <strong>{pod.pod_code}</strong></p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                                <span style={{ background: '#F3F4F6', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, color: '#374151' }}>
                                    {pod.member_count} Members
                                </span>
                                <ArrowRight size={18} color="#7B61FF" />
                            </div>
                        </div>
                    ))}

                    <div style={styles.actionCard} onClick={() => setIsJoining(true)}>
                        <Key size={32} color="#9CA3AF" style={{ marginBottom: '12px' }} />
                        <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#374151' }}>Join a Pod</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Have an invite code?</p>
                    </div>

                    <div style={styles.actionCard} onClick={() => setIsCreating(true)}>
                        <Plus size={32} color="#9CA3AF" style={{ marginBottom: '12px' }} />
                        <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#374151' }}>Create a Pod</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Start a new group</p>
                    </div>
                </div>
            )}

            {isCreating && (
                <div style={styles.modalOverlay} onClick={() => setIsCreating(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '20px' }}>Create new Pod</h2>
                        {error && <p style={{ color: 'red', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}
                        <form onSubmit={handleCreate}>
                            <input style={styles.input} required placeholder="Pod Name" value={name} onChange={e => setName(e.target.value)} />
                            <textarea style={{...styles.input, minHeight: '80px', resize: 'vertical'}} placeholder="Shared Goals" value={goals} onChange={e => setGoals(e.target.value)} />
                            <button type="submit" style={styles.btn}>Create Pod</button>
                            <button type="button" onClick={() => setIsCreating(false)} style={{...styles.btn, background: '#F3F4F6', color: '#374151'}}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {isJoining && (
                <div style={styles.modalOverlay} onClick={() => setIsJoining(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '20px' }}>Join a Pod</h2>
                        {error && <p style={{ color: 'red', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}
                        <form onSubmit={handleJoin}>
                            <input style={styles.input} required placeholder="5-Letter Invite Code" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={5} />
                            <button type="submit" style={styles.btn}>Join Pod</button>
                            <button type="button" onClick={() => setIsJoining(false)} style={{...styles.btn, background: '#F3F4F6', color: '#374151'}}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyPodsDashboard;
