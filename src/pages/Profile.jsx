import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config.js';
import { Eye, Headphones, BookOpen, Activity, UserCog, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

const VARK_COLORS = { Visual: '#7B61FF', Auditory: '#F97AFE', Reading: '#4C1D95', Kinesthetic: '#10B981' };

const Profile = () => {
    const { currentUser, updateUser } = useAuth();

    const [profile, setProfile] = useState({ name: currentUser?.name || '', age_group: currentUser?.age_group || '' });
    const [pwData, setPwData] = useState({ current_password: '', new_password: '', confirm: '' });
    const [profileMsg, setProfileMsg] = useState('');
    const [pwMsg, setPwMsg] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);

    const token = localStorage.getItem('lurniq_token');
    const vark = currentUser?.vark_profile;
    const scores = vark?.allScores || {};
    const dominant = vark?.style;

    const updateProfile = async (e) => {
        e.preventDefault();
        setProfileLoading(true); setProfileMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: profile.name, age_group: profile.age_group }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Update failed');
            updateUser && updateUser({ name: profile.name, age_group: profile.age_group });
            setProfileMsg('✅ Profile updated!');
        } catch (err) { setProfileMsg(`❌ ${err.message}`); }
        finally { setProfileLoading(false); }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        if (pwData.new_password !== pwData.confirm) return setPwMsg('❌ Passwords do not match.');
        if (pwData.new_password.length < 6) return setPwMsg('❌ Password must be at least 6 characters.');
        setPwLoading(true); setPwMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ current_password: pwData.current_password, new_password: pwData.new_password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Change failed');
            setPwMsg('✅ Password changed!');
            setPwData({ current_password: '', new_password: '', confirm: '' });
        } catch (err) { setPwMsg(`❌ ${err.message}`); }
        finally { setPwLoading(false); }
    };

    const getIcon = (style, size = 24) => {
        const color = VARK_COLORS[style] || '#7B61FF';
        switch (style) {
            case 'Visual': return <Eye size={size} color={color} />;
            case 'Auditory': return <Headphones size={size} color={color} />;
            case 'Reading': return <BookOpen size={size} color={color} />;
            case 'Kinesthetic': return <Activity size={size} color={color} />;
            default: return <Activity size={size} color={color} />;
        }
    };

    const s = {
        page: { minHeight: '100vh', background: '#F4F6F8', padding: '60px 20px', fontFamily: "'Inter', 'Poppins', sans-serif" },
        wrap: { maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' },
        headerCard: { background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' },
        headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(135deg, #F97AFE 0%, #7B61FF 100%)', opacity: 0.8 },
        avatarWrap: { position: 'relative', zIndex: 1, marginTop: '20px' },
        avatar: { width: '100px', height: '100px', borderRadius: '50%', background: 'white', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' },
        avatarInner: { width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #4C1D95, #7B61FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: 'white', fontWeight: 700 },
        name: { fontSize: '28px', fontWeight: 800, color: '#111827', margin: '20px 0 6px', zIndex: 1 },
        email: { fontSize: '15px', color: '#6B7280', zIndex: 1, fontWeight: 500 },
        
        card: { background: 'white', borderRadius: '24px', padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F3F4F6' },
        cardTitle: { fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px' },
        
        dominantBadge: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', background: `${dominant ? VARK_COLORS[dominant] : '#7B61FF'}10`, padding: '20px', borderRadius: '16px', border: `1px solid ${dominant ? VARK_COLORS[dominant] : '#7B61FF'}30` },
        dominantIcon: { background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
        
        scoreRow: { marginBottom: '20px' },
        scoreHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' },
        scoreLabel: { fontSize: '14px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' },
        scoreValue: (style) => ({ fontSize: '14px', fontWeight: 700, color: VARK_COLORS[style] }),
        barBg: { background: '#F3F4F6', borderRadius: '12px', height: '10px', overflow: 'hidden' },
        barFill: (style, score) => ({ height: '100%', background: VARK_COLORS[style], borderRadius: '12px', width: `${Math.round(score * 100)}%`, opacity: style === dominant ? 1 : 0.6, transition: 'width 1s ease-out' }),
        
        group: { marginBottom: '20px' },
        label: { display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' },
        input: { width: '100%', padding: '14px 16px', fontSize: '15px', border: '1.5px solid #E5E7EB', borderRadius: '12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827', transition: 'border-color 0.2s', backgroundColor: '#F9FAFB' },
        
        btn: (loading) => ({ padding: '14px 32px', fontSize: '15px', fontWeight: 600, color: 'white', background: loading ? '#9CA3AF' : '#111827', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', marginTop: '10px' }),
        
        msg: (ok) => ({ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, background: ok ? '#ECFDF5' : '#FEF2F2', color: ok ? '#065F46' : '#B91C1C', border: `1px solid ${ok ? '#A7F3D0' : '#FECACA'}`, display: 'flex', alignItems: 'center', gap: '8px' }),
    };

    const renderMsg = (msgStr) => {
        if (!msgStr) return null;
        const isOk = msgStr.startsWith('✅');
        const text = msgStr.replace('✅ ', '').replace('❌ ', '');
        return (
            <div style={s.msg(isOk)}>
                {isOk ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                {text}
            </div>
        );
    };

    return (
        <div style={s.page}>
            <div style={s.wrap}>
                {/* Header */}
                <div style={s.headerCard}>
                    <div style={s.headerBg}></div>
                    <div style={s.avatarWrap}>
                        <div style={s.avatar}>
                            <div style={s.avatarInner}>{(currentUser?.name || 'U')[0].toUpperCase()}</div>
                        </div>
                    </div>
                    <h1 style={s.name}>{currentUser?.name}</h1>
                    <p style={s.email}>{currentUser?.email}</p>
                </div>

                {/* VARK Profile Card */}
                {dominant && (
                    <div style={s.card}>
                        <h2 style={s.cardTitle}>
                            <Activity size={24} color="#111827" /> Your Learning DNA
                        </h2>
                        <div style={s.dominantBadge}>
                            <div style={s.dominantIcon}>
                                {getIcon(dominant, 32)}
                            </div>
                            <div>
                                <p style={{ margin: 0, fontWeight: 800, color: VARK_COLORS[dominant], fontSize: '20px' }}>{dominant} Learner</p>
                                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>Your dominant cognitive style</p>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '32px' }}>
                            {Object.entries(scores).map(([style, score]) => (
                                <div key={style} style={s.scoreRow}>
                                    <div style={s.scoreHeader}>
                                        <span style={s.scoreLabel}>
                                            {getIcon(style, 16)} {style}
                                        </span>
                                        <span style={s.scoreValue(style)}>{Math.round(score * 100)}%</span>
                                    </div>
                                    <div style={s.barBg}>
                                        <div style={s.barFill(style, score)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Edit Profile */}
                <div style={s.card}>
                    <h2 style={s.cardTitle}>
                        <UserCog size={24} color="#111827" /> Profile Settings
                    </h2>
                    <form onSubmit={updateProfile}>
                        <div style={s.group}>
                            <label style={s.label}>Full Name</label>
                            <input type="text" required value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} style={s.input} />
                        </div>
                        <div style={s.group}>
                            <label style={s.label}>Age Group</label>
                            <select value={profile.age_group} onChange={e => setProfile(p => ({ ...p, age_group: e.target.value }))} style={s.input}>
                                <option value="">Select age group</option>
                                {['5-10', '11-15', '16-20', '21-25', '25+'].map(a => <option key={a} value={a}>{a} Years</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={profileLoading} style={s.btn(profileLoading)}
                            onMouseEnter={e => !profileLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={e => !profileLoading && (e.currentTarget.style.transform = 'none')}
                        >
                            {profileLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        {renderMsg(profileMsg)}
                    </form>
                </div>

                {/* Change Password */}
                <div style={s.card}>
                    <h2 style={s.cardTitle}>
                        <ShieldCheck size={24} color="#111827" /> Security
                    </h2>
                    <form onSubmit={changePassword}>
                        <div style={s.group}>
                            <label style={s.label}>Current Password</label>
                            <input type="password" required value={pwData.current_password} onChange={e => setPwData(p => ({ ...p, current_password: e.target.value }))} style={s.input} placeholder="Enter your regular password" />
                        </div>
                        <div style={s.group}>
                            <label style={s.label}>New Password</label>
                            <input type="password" required value={pwData.new_password} onChange={e => setPwData(p => ({ ...p, new_password: e.target.value }))} style={s.input} placeholder="At least 6 characters" />
                        </div>
                        <div style={s.group}>
                            <label style={s.label}>Confirm New Password</label>
                            <input type="password" required value={pwData.confirm} onChange={e => setPwData(p => ({ ...p, confirm: e.target.value }))} style={s.input} placeholder="Repeat new password" />
                        </div>
                        <button type="submit" disabled={pwLoading} style={s.btn(pwLoading)}
                            onMouseEnter={e => !pwLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                            onMouseLeave={e => !pwLoading && (e.currentTarget.style.transform = 'none')}
                        >
                            {pwLoading ? 'Changing...' : 'Update Password'}
                        </button>
                        {renderMsg(pwMsg)}
                    </form>
                </div>
            </div>
            
            <style>{`
                input:focus, select:focus { border-color: #7B61FF !important; background: white !important; }
            `}</style>
        </div>
    );
};

export default Profile;
