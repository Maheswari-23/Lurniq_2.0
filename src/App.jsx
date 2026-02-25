// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import ProfileSetup from './pages/ProfileSetup';
import VARKContentPage from './pages/VARKContent';
import Questionnaire from './pages/Questionnaire';
import LearningContent from './pages/LearningContent';
import Navbar from './components/Navbar';

// ── Layout wrapper (adds Navbar) ──────────────────────────────────
const MainLayout = ({ children }) => (
  <>
    <Navbar />
    <main className="app-container">{children}</main>
  </>
);

// ── Protected route: redirect to /signin when not logged in ───────
const ProtectedRoute = ({ children }) => {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return null;                // still checking token
  if (!currentUser) return <Navigate to="/signin" replace />;
  return children;
};

// ── Guest-only route: redirect to /vark or /learning when already logged in ─
const GuestRoute = ({ children }) => {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return null;
  if (currentUser) {
    // Returning user with VARK profile → learning hub
    // New user without VARK profile → cold start
    return <Navigate to={currentUser.vark_profile ? '/learning' : '/vark'} replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Guest-only (redirect logged-in users away) */}
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
          <Route path="/signin" element={<GuestRoute><Signin /></GuestRoute>} />

          {/* Auth-required but no navbar */}
          <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
          <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />

          {/* Auth-required with navbar */}
          <Route path="/vark" element={
            <ProtectedRoute>
              <MainLayout><VARKContentPage /></MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/learning" element={
            <ProtectedRoute>
              <MainLayout><LearningContent /></MainLayout>
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
