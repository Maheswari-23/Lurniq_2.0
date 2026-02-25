// src/components/Navbar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const s = {
    header: { background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100 },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', padding: '0 30px', maxWidth: '1200px', margin: '0 auto' },
    logo: { display: 'flex', alignItems: 'center', textDecoration: 'none' },
    logoImg: { height: '48px', width: 'auto' },
    links: { display: 'flex', alignItems: 'center', gap: '24px' },
    link: { fontSize: '14px', fontWeight: 500, color: '#6B7280', textDecoration: 'none' },
    user: { fontSize: '13px', color: '#6B7280', fontWeight: 500 },
    logoutBtn: { fontSize: '13px', fontWeight: 600, color: '#7B61FF', background: 'none', border: '1.5px solid #7B61FF', borderRadius: '20px', padding: '6px 16px', cursor: 'pointer', transition: 'all 0.2s' },
  };

  return (
    <header style={s.header}>
      <nav style={s.nav}>
        <NavLink to="/learning" style={s.logo}>
          <img src={Logo} alt="Lurniq" style={s.logoImg} />
        </NavLink>

        <div style={s.links}>
          <NavLink to="/learning" style={({ isActive }) => ({ ...s.link, color: isActive ? '#7B61FF' : '#6B7280', fontWeight: isActive ? 600 : 500 })}>
            Learning Hub
          </NavLink>
          <NavLink to="/questionnaire" style={({ isActive }) => ({ ...s.link, color: isActive ? '#7B61FF' : '#6B7280', fontWeight: isActive ? 600 : 500 })}>
            Retake VARK
          </NavLink>

          {currentUser && (
            <>
              <span style={s.user}>Hi, {currentUser.name?.split(' ')[0]} 👋</span>
              <button onClick={handleLogout} style={s.logoutBtn}>Log out</button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;