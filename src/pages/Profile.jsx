// src/pages/Profile.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE_URL from '../config.js';

const VARK_COLORS = { Visual: '#7B61FF', Auditory: '#F97AFE', Reading: '#4C1D95', Kinesthetic: '#10B981' };
const VARK_EMOJI = { Visual: '👁️', Auditory: '🎧', Reading: '📖', Kinesthetic: '🏃' };

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

    const s = {
        page: { minHeight: '100vh', background: '#F9FAFB', padding: '40px 20px', fontFamily: "'Poppins', sans-serif" },
        wrap: { maxWidth: '640px', margin: '0 auto' },
        header: { textAlign: 'center', marginBottom: '36px' },
        avatar: { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#F97AFE,#7B61FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 12px', color: 'white', fontWeight: 700 },
        name: { fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 4px' },
        email: { fontSize: '13px', color: '#6B7280' },
        card: { background: 'white', borderRadius: '20px', padding: '28px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
        cardTitle: { fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
        group: { marginBottom: '16px' },
        label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' },
        input: { width: '100%', padding: '11px 14px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
        select: { width: '100%', padding: '11px 14px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', outline: 'none', boxSizing: 'border-box', background: 'white', fontFamily: 'inherit' },
        btn: (loading) => ({ padding: '12px 28px', fontSize: '14px', fontWeight: 600, color: 'white', background: loading ? '#9CA3AF' : 'linear-gradient(90deg,#F97AFE,#7B61FF)', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer' }),
        msg: (ok) => ({ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: ok ? '#ECFDF5' : '#FEF2F2', color: ok ? '#065F46' : '#B91C1C', border: `1px solid ${ok ? '#A7F3D0' : '#FECACA'}` }),
    };

    return (
        <div style={s.page}>
            <div style={s.wrap}>
                {/* Header */}
                <div style={s.header}>
                    <div style={s.avatar}>{(currentUser?.name || 'U')[0].toUpperCase()}</div>
                    <h1 style={s.name}>{currentUser?.name}</h1>
                    <p style={s.email}>{currentUser?.email}</p>
                </div>

                {/* VARK Card */}
                {dominant && (
                    <div style={s.card}>
                        <h2 style={s.cardTitle}>Your VARK Profile</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: `${VARK_COLORS[dominant]}15`, padding: '14px 18px', borderRadius: '12px', border: `1.5px solid ${VARK_COLORS[dominant]}40` }}>
                            <span style={{ fontSize: '28px' }}>{VARK_EMOJI[dominant]}</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: 700, color: VARK_COLORS[dominant], fontSize: '17px' }}>{dominant} Learner</p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Dominant learning style</p>
                            </div>
                        </div>
                        {Object.entries(scores).map(([style, score]) => (
                            <div key={style} style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{VARK_EMOJI[style]} {style}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: VARK_COLORS[style] }}>{Math.round(score * 100)}%</span>
                                </div>
                                <div style={{ background: '#F3F4F6', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: VARK_COLORS[style], borderRadius: '10px', width: `${Math.round(score * 100)}%`, opacity: style === dominant ? 1 : 0.5 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Edit Profile */}
                <div style={s.card}>
                    <h2 style={s.cardTitle}>✏️ Edit Profile</h2>
                    <form onSubmit={updateProfile}>
                        <div style={s.group}>
                            <label style={s.label}>Full Name</label>
                            <input type="text" required value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} style={s.input} />
                        </div>
                        <div style={s.group}>
                            <label style={s.label}>Age Group</label>
                            <select value={profile.age_group} onChange={e => setProfile(p => ({ ...p, age_group: e.target.value }))} style={s.select}>
                                <option value="">Select age group</option>
                                {['5-10', '11-15', '16-20', '21-25', '25+'].map(a => <option key={a} value={a}>{a} Years</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={profileLoading} style={s.btn(profileLoading)}>{profileLoading ? 'Saving…' : 'Save Changes'}</button>
                        {profileMsg && <div style={s.msg(profileMsg.startsWith('✅'))}>{profileMsg}</div>}
                    </form>
                </div>

                {/* Change Password */}
                <div style={s.card}>
                    <h2 style={s.cardTitle}>🔒 Change Password</h2>
                    <form onSubmit={changePassword}>
                        <div style={s.group}>
                            <label style={s.label}>Current Password</label>
                            <input type="password" required value={pwData.current_password} onChange={e => setPwData(p => ({ ...p, current_password: e.target.value }))} style={s.input} placeholder="Enter current password" />
                        </div>
                        <div style={s.group}>
                            <label style={s.label}>New Password</label>
                            <input type="password" required value={pwData.new_password} onChange={e => setPwData(p => ({ ...p, new_password: e.target.value }))} style={s.input} placeholder="Min. 6 characters" />
                        </div>
                        <div style={s.group}>
                            <label style={s.label}>Confirm New Password</label>
                            <input type="password" required value={pwData.confirm} onChange={e => setPwData(p => ({ ...p, confirm: e.target.value }))} style={s.input} placeholder="Repeat new password" />
                        </div>
                        <button type="submit" disabled={pwLoading} style={s.btn(pwLoading)}>{pwLoading ? 'Changing…' : 'Change Password'}</button>
                        {pwMsg && <div style={s.msg(pwMsg.startsWith('✅'))}>{pwMsg}</div>}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
