// src/components/Navbar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const s = {
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { fontWeight: 700, fontSize: '18px', color: '#111827', textDecoration: 'none' },
    links: { display: 'flex', alignItems: 'center', gap: '24px' },
    link: { fontSize: '14px', fontWeight: 500, color: '#6B7280', textDecoration: 'none' },
    user: { fontSize: '13px', color: '#6B7280' },
    logoutBtn: { fontSize: '13px', fontWeight: 600, color: '#7B61FF', background: 'none', border: '1px solid #7B61FF', borderRadius: '6px', padding: '5px 14px', cursor: 'pointer' },
  };

  return (
    <header className="app-container">
      <nav className="navbar" style={s.nav}>
        <NavLink to="/learning" style={s.logo}>Lurniq</NavLink>

        <div style={s.links}>
          <NavLink to="/learning" style={({ isActive }) => ({ ...s.link, color: isActive ? '#7B61FF' : '#6B7280', fontWeight: isActive ? 600 : 500 })}>
            Learning Hub
          </NavLink>
          <NavLink to="/questionnaire" style={({ isActive }) => ({ ...s.link, color: isActive ? '#7B61FF' : '#6B7280', fontWeight: isActive ? 600 : 500 })}>
            Retake VARK
          </NavLink>

          {currentUser && (
            <>
              <span style={s.user}>Hi, {currentUser.name?.split(' ')[0]}</span>
              <button onClick={handleLogout} style={s.logoutBtn}>Log out</button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;