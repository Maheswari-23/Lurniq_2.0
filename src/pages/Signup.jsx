// src/pages/Signup.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png';
import { signup } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { handleAuthSuccess } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', age_group: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const data = await signup(form);
      handleAuthSuccess(data.user);
      navigate('/vark');   // new user → cold start VARK page first
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', padding: '20px' },
    wrapper: { background: 'linear-gradient(90deg,#F97AFE 0%,#7B61FF 100%)', borderRadius: '16px', padding: '3px', maxWidth: '450px', width: '100%' },
    card: { background: 'white', borderRadius: '14px', padding: '40px', textAlign: 'center' },
    logo: { width: '80px', height: '80px', marginBottom: '20px', objectFit: 'contain' },
    h1: { fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '8px' },
    sub: { fontSize: '14px', color: '#6B7280', marginBottom: '30px' },
    form: { textAlign: 'left' },
    group: { marginBottom: '18px' },
    label: { display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '7px' },
    input: { width: '100%', padding: '12px 15px', fontSize: '14px', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s,box-shadow 0.2s' },
    select: { width: '100%', padding: '12px 15px', fontSize: '14px', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', background: 'white', cursor: 'pointer' },
    error: { background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
    btn: { width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, color: 'white', background: loading ? '#9CA3AF' : 'linear-gradient(90deg,#F97AFE 0%,#7B61FF 100%)', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px', transition: 'transform 0.2s,box-shadow 0.2s' },
    footer: { marginTop: '22px', fontSize: '14px', color: '#6B7280' },
    link: { color: '#7B61FF', fontWeight: 600, textDecoration: 'none' },
  };

  const focus = e => { e.target.style.borderColor = '#7B61FF'; e.target.style.boxShadow = '0 0 0 3px rgba(123,97,255,0.1)'; };
  const blur = e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={s.page}>
      <div style={s.wrapper}>
        <div style={s.card}>
          <img src={Logo} alt="Lurniq" style={s.logo} />
          <h1 style={s.h1}>Create Your Account</h1>
          <p style={s.sub}>Start your personalised learning journey today.</p>

          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.group}>
              <label style={s.label}>Full Name</label>
              <input type="text" value={form.name} onChange={set('name')} placeholder="Enter your full name" required style={s.input} onFocus={focus} onBlur={blur} />
            </div>

            <div style={s.group}>
              <label style={s.label}>Age Group</label>
              <select value={form.age_group} onChange={set('age_group')} required style={s.select} onFocus={focus} onBlur={blur}>
                <option value="">Select your age group</option>
                <option value="5-10">5 – 10 Years</option>
                <option value="11-15">11 – 15 Years</option>
                <option value="16-20">16 – 20 Years</option>
                <option value="21-25">21 – 25 Years</option>
                <option value="25+">25+ Years</option>
              </select>
            </div>

            <div style={s.group}>
              <label style={s.label}>Email Address</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="Enter your email" required style={s.input} onFocus={focus} onBlur={blur} />
            </div>

            <div style={s.group}>
              <label style={s.label}>Password <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(min. 6 characters)</span></label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="Create a password" required style={s.input} onFocus={focus} onBlur={blur} />
            </div>

            <button type="submit" disabled={loading} style={s.btn}>
              {loading ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>

          <p style={s.footer}>
            Already have an account?{' '}
            <Link to="/signin" style={s.link}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;