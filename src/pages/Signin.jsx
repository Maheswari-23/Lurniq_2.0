// src/pages/Signin.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import { signin } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const Signin = () => {
  const navigate = useNavigate();
  const { handleAuthSuccess } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signin(form);
      handleAuthSuccess(data.user);
      // If user already has a VARK profile → go straight to learning hub
      // Otherwise → questionnaire first
      if (data.user?.vark_profile) {
        navigate('/learning');
      } else {
        navigate('/questionnaire');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: '20px' },
    card: { background: 'white', borderRadius: '20px', padding: '48px 40px', textAlign: 'center', maxWidth: '450px', width: '100%', boxShadow: '0 8px 32px rgba(123,97,255,0.10), 0 1.5px 6px rgba(0,0,0,0.06)' },
    logo: { height: '64px', width: 'auto', marginBottom: '24px' },
    h1: { fontSize: '26px', fontWeight: 700, color: '#111827', marginBottom: '6px' },
    sub: { fontSize: '14px', color: '#6B7280', marginBottom: '28px' },
    form: { textAlign: 'left' },
    group: { marginBottom: '18px' },
    label: { display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '7px' },
    input: { width: '100%', padding: '12px 15px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s,box-shadow 0.2s' },
    error: { background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
    btn: { width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600, color: 'white', background: loading ? '#9CA3AF' : 'linear-gradient(90deg,#F97AFE 0%,#7B61FF 100%)', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' },
    footer: { marginTop: '22px', fontSize: '14px', color: '#6B7280' },
    link: { color: '#7B61FF', fontWeight: 600, textDecoration: 'none' },
  };

  const focus = e => { e.target.style.borderColor = '#7B61FF'; e.target.style.boxShadow = '0 0 0 3px rgba(123,97,255,0.1)'; };
  const blur = e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <img src={Logo} alt="Lurniq" style={s.logo} />
        <h1 style={s.h1}>Welcome Back!</h1>
        <p style={s.sub}>Sign in to continue your learning journey.</p>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.group}>
            <label style={s.label}>Email Address</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="Enter your email" required style={s.input} onFocus={focus} onBlur={blur} />
          </div>

          <div style={s.group}>
            <label style={s.label}>Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="Enter your password" required style={s.input} onFocus={focus} onBlur={blur} />
          </div>

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={s.footer}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" style={s.link}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Signin;