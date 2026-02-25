// src/components/Navbar.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { Sun, Moon } from 'lucide-react';
import Logo from '../assets/logo.png';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const { dark, toggle } = useDarkMode();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/signin'); setMenuOpen(false); };

  const s = {
    header: { background: dark ? 'rgba(17,24,39,0.97)' : 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${dark ? '#374151' : '#E5E7EB'}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100 },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', padding: '0 20px', maxWidth: '1200px', margin: '0 auto' },
    logo: { display: 'flex', alignItems: 'center', textDecoration: 'none' },
    logoImg: { height: '44px', width: 'auto' },
    links: { display: 'flex', alignItems: 'center', gap: '20px' },
    link: { fontSize: '14px', fontWeight: 500, color: dark ? '#D1D5DB' : '#6B7280', textDecoration: 'none' },
    user: { fontSize: '13px', color: dark ? '#9CA3AF' : '#6B7280', fontWeight: 500 },
    logoutBtn: { fontSize: '13px', fontWeight: 600, color: '#7B61FF', background: 'none', border: '1.5px solid #7B61FF', borderRadius: '20px', padding: '6px 16px', cursor: 'pointer' },
    darkBtn: { background: dark ? '#374151' : '#F3F4F6', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? '#FBBF24' : '#6B7280', transition: 'all 0.2s' },
  };

  const activeLink = (isActive) => ({ ...s.link, color: isActive ? '#7B61FF' : (dark ? '#D1D5DB' : '#6B7280'), fontWeight: isActive ? 700 : 500 });

  return (
    <header style={s.header}>
      <nav style={s.nav}>
        <NavLink to="/learning" style={s.logo}>
          <img src={Logo} alt="Lurniq" style={s.logoImg} />
        </NavLink>

        {/* Desktop links */}
        <div style={s.links} className="nb-desktop">
          <NavLink to="/learning" style={({ isActive }) => activeLink(isActive)}>Learning Hub</NavLink>
          <NavLink to="/questionnaire" style={({ isActive }) => activeLink(isActive)}>Retake VARK</NavLink>
          <NavLink to="/profile" style={({ isActive }) => activeLink(isActive)}>Profile</NavLink>
          {/* Dark mode toggle */}
          <button style={s.darkBtn} onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {currentUser && (
            <>
              <span style={s.user}>Hi, {currentUser.name?.split(' ')[0]} 👋</span>
              <button onClick={handleLogout} style={s.logoutBtn}>Log out</button>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button className="nb-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: dark ? '#D1D5DB' : '#111827', padding: '4px', display: 'none' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{ background: dark ? '#1F2937' : 'white', borderTop: `1px solid ${dark ? '#374151' : '#E5E7EB'}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <NavLink to="/learning" style={({ isActive }) => ({ ...activeLink(isActive), fontSize: '15px' })} onClick={() => setMenuOpen(false)}>Learning Hub</NavLink>
          <NavLink to="/questionnaire" style={({ isActive }) => ({ ...activeLink(isActive), fontSize: '15px' })} onClick={() => setMenuOpen(false)}>Retake VARK</NavLink>
          <NavLink to="/profile" style={({ isActive }) => ({ ...activeLink(isActive), fontSize: '15px' })} onClick={() => setMenuOpen(false)}>Profile</NavLink>
          <button style={{ ...s.darkBtn, width: 'fit-content', gap: '8px', padding: '8px 14px', fontSize: '14px', color: dark ? '#FBBF24' : '#374151' }} onClick={toggle}>
            {dark ? <><Sun size={15} /> Light Mode</> : <><Moon size={15} /> Dark Mode</>}
          </button>
          {currentUser && (
            <>
              <span style={{ fontSize: '13px', color: dark ? '#9CA3AF' : '#6B7280' }}>Hi, {currentUser.name?.split(' ')[0]} 👋</span>
              <button onClick={handleLogout} style={{ ...s.logoutBtn, width: 'fit-content' }}>Log out</button>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) { .nb-desktop{display:none!important} .nb-burger{display:block!important} }
      `}</style>
    </header>
  );
};

export default Navbar;