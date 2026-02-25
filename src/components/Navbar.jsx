// src/components/Navbar.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/signin');
    setMenuOpen(false);
  };

  const s = {
    header: { background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100 },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', padding: '0 20px', maxWidth: '1200px', margin: '0 auto' },
    logo: { display: 'flex', alignItems: 'center', textDecoration: 'none' },
    logoImg: { height: '44px', width: 'auto' },
    links: { display: 'flex', alignItems: 'center', gap: '20px' },
    link: { fontSize: '14px', fontWeight: 500, color: '#6B7280', textDecoration: 'none' },
    user: { fontSize: '13px', color: '#6B7280', fontWeight: 500 },
    logoutBtn: { fontSize: '13px', fontWeight: 600, color: '#7B61FF', background: 'none', border: '1.5px solid #7B61FF', borderRadius: '20px', padding: '6px 16px', cursor: 'pointer' },
  };

  const activeLink = (isActive) => ({ ...s.link, color: isActive ? '#7B61FF' : '#6B7280', fontWeight: isActive ? 700 : 500 });

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
          {currentUser && (
            <>
              <span style={s.user}>Hi, {currentUser.name?.split(' ')[0]} 👋</span>
              <button onClick={handleLogout} style={s.logoutBtn}>Log out</button>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button className="nb-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#111827', padding: '4px', display: 'none' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{ background: 'white', borderTop: '1px solid #E5E7EB', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <NavLink to="/learning" style={({ isActive }) => ({ ...activeLink(isActive), fontSize: '15px' })} onClick={() => setMenuOpen(false)}>Learning Hub</NavLink>
          <NavLink to="/questionnaire" style={({ isActive }) => ({ ...activeLink(isActive), fontSize: '15px' })} onClick={() => setMenuOpen(false)}>Retake VARK</NavLink>
          <NavLink to="/profile" style={({ isActive }) => ({ ...activeLink(isActive), fontSize: '15px' })} onClick={() => setMenuOpen(false)}>Profile</NavLink>
          {currentUser && (
            <>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Hi, {currentUser.name?.split(' ')[0]} 👋</span>
              <button onClick={handleLogout} style={{ ...s.logoutBtn, width: 'fit-content' }}>Log out</button>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .nb-desktop { display: none !important; }
          .nb-burger  { display: block !important; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;