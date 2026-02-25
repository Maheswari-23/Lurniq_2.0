// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import ForgotPassword from './pages/ForgotPassword';
import ProfileSetup from './pages/ProfileSetup';
import VARKContentPage from './pages/VARKContent';
import Questionnaire from './pages/Questionnaire';
import VARKResult from './pages/VARKResult';
import LearningContent from './pages/LearningContent';
import Profile from './pages/Profile';
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
  if (authLoading) return null;
  if (!currentUser) return <Navigate to="/signin" replace />;
  return children;
};

// ── Guest-only route: redirect logged-in users away ───────────────
const GuestRoute = ({ children }) => {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return null;
  if (currentUser) {
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
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Guest-only */}
          <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
          <Route path="/signin" element={<GuestRoute><Signin /></GuestRoute>} />

          {/* Auth-required, no navbar */}
          <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
          <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
          <Route path="/vark-result" element={<ProtectedRoute><VARKResult /></ProtectedRoute>} />

          {/* Auth-required with navbar */}
          <Route path="/vark" element={<ProtectedRoute><MainLayout><VARKContentPage /></MainLayout></ProtectedRoute>} />
          <Route path="/learning" element={<ProtectedRoute><MainLayout><LearningContent /></MainLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
