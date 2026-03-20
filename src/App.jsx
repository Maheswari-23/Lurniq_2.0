// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

import LandingPage from './pages/LandingPage';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import ForgotPassword from './pages/ForgotPassword';
import ProfileSetup from './pages/ProfileSetup';
import VARKContentPage from './pages/VARKContent';
import Questionnaire from './pages/Questionnaire';
import VARKResult from './pages/VARKResult';
import LearningContent from './pages/LearningContent';
import StudyPodsDashboard from './pages/StudyPodsDashboard';
import StudyPodDetail from './pages/StudyPodDetail';
import Profile from './pages/Profile';
import ConceptLens from './pages/ConceptLens';
import Navbar from './components/Navbar';

const MainLayout = ({ children }) => (
  <>
    <Navbar />
    <main className="app-container">{children}</main>
  </>
);

const ProtectedRoute = ({ children }) => {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return null;
  if (!currentUser) return <Navigate to="/signin" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return null;
  if (currentUser) return <Navigate to={currentUser.vark_profile ? '/learning' : '/vark'} replace />;
  return children;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
            <Route path="/signin" element={<GuestRoute><Signin /></GuestRoute>} />
            <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire /></ProtectedRoute>} />
            <Route path="/vark-result" element={<ProtectedRoute><VARKResult /></ProtectedRoute>} />
            <Route path="/vark" element={<ProtectedRoute><MainLayout><VARKContentPage /></MainLayout></ProtectedRoute>} />
            <Route path="/learning" element={<ProtectedRoute><MainLayout><LearningContent /></MainLayout></ProtectedRoute>} />
            <Route path="/pods" element={<ProtectedRoute><MainLayout><StudyPodsDashboard /></MainLayout></ProtectedRoute>} />
            <Route path="/pods/:podId" element={<ProtectedRoute><MainLayout><StudyPodDetail /></MainLayout></ProtectedRoute>} />
            <Route path="/lens" element={<ProtectedRoute><MainLayout><ConceptLens /></MainLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
