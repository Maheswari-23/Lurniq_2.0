// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import API_BASE_URL from '../config.js';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password.length < 6) return setError('Password must be at least 6 characters.');
        if (form.password !== form.confirm) return setError('Passwords do not match.');
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, new_password: form.password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reset failed.');
            setSuccess(true);
            setTimeout(() => navigate('/signin'), 2500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const s = {
        page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: '20px', fontFamily: "'Poppins',sans-serif" },
        card: { background: 'white', borderRadius: '20px', padding: '48px 40px', textAlign: 'center', maxWidth: '420px', width: '100%', boxShadow: '0 8px 32px rgba(123,97,255,0.10)' },
        logo: { height: '56px', width: 'auto', marginBottom: '20px' },
        h1: { fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '6px' },
        sub: { fontSize: '13px', color: '#6B7280', marginBottom: '28px' },
        group: { marginBottom: '16px', textAlign: 'left' },
        label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '6px' },
        input: { width: '100%', padding: '11px 14px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', outline: 'none', boxSizing: 'border-box' },
        error: { background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' },
        success: { background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 },
        btn: { width: '100%', padding: '13px', fontSize: '14px', fontWeight: 600, color: 'white', background: loading ? '#9CA3AF' : 'linear-gradient(90deg,#F97AFE,#7B61FF)', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '6px' },
        link: { color: '#7B61FF', fontWeight: 600, textDecoration: 'none', fontSize: '13px' },
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <img src={Logo} alt="Lurniq" style={s.logo} />
                <h1 style={s.h1}>Reset Password</h1>
                <p style={s.sub}>Enter your email and choose a new password.</p>

                {success ? (
                    <div style={s.success}>✅ Password reset! Redirecting to Sign In…</div>
                ) : (
                    <>
                        {error && <div style={s.error}>{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div style={s.group}>
                                <label style={s.label}>Email Address</label>
                                <input type="email" required value={form.email} onChange={set('email')} placeholder="Your account email" style={s.input} />
                            </div>
                            <div style={s.group}>
                                <label style={s.label}>New Password</label>
                                <input type="password" required value={form.password} onChange={set('password')} placeholder="Min. 6 characters" style={s.input} />
                            </div>
                            <div style={s.group}>
                                <label style={s.label}>Confirm New Password</label>
                                <input type="password" required value={form.confirm} onChange={set('confirm')} placeholder="Repeat new password" style={s.input} />
                            </div>
                            <button type="submit" disabled={loading} style={s.btn}>{loading ? 'Resetting…' : 'Reset Password'}</button>
                        </form>
                        <p style={{ marginTop: '20px', fontSize: '13px', color: '#6B7280' }}>
                            Remember it? <Link to="/signin" style={s.link}>Sign In</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
