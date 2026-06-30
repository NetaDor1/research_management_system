import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import NavigationBar from './components/NavigationBar';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import Home from './pages/home';
import Dashboard from './pages/Dashboard';
import Research from './pages/Research';
import ResearchDetail from './pages/ResearchDetail';
import NewResearch from './pages/NewResearch';
import Patents from './pages/Patents';
import PatentDetail from './pages/PatentDetail';
import NewPatent from './pages/NewPatent';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import NewArticle from './pages/NewArticle';
import Statistics from './pages/Statistics';
import ReportFormat from './pages/ReportFormat';
import SetupFirebase from './pages/SetupFirebase';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import PendingApproval from './pages/PendingApproval';
import UserManagement from './pages/UserManagement';
import './App.css';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/pending-approval'];

function AppContent() {
  const location = useLocation();
  const showNavBar = !AUTH_PATHS.includes(location.pathname);

  return (
    <div className="App">
      {showNavBar && <NavigationBar />}
      <Routes>
        {/* Public guest routes */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

        {/* Authenticated but pending approval */}
        <Route
          path="/pending-approval"
          element={
            <ProtectedRoute require="pending">
              <PendingApproval />
            </ProtectedRoute>
          }
        />

        {/* Protected app routes */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/research" element={<ProtectedRoute><Research /></ProtectedRoute>} />
        <Route path="/research/new" element={<ProtectedRoute><NewResearch /></ProtectedRoute>} />
        <Route path="/research/:id" element={<ProtectedRoute><ResearchDetail /></ProtectedRoute>} />
        <Route path="/patents" element={<ProtectedRoute><Patents /></ProtectedRoute>} />
        <Route path="/patents/new" element={<ProtectedRoute><NewPatent /></ProtectedRoute>} />
        <Route path="/patents/:id" element={<ProtectedRoute><PatentDetail /></ProtectedRoute>} />
        <Route path="/articles" element={<ProtectedRoute><Articles /></ProtectedRoute>} />
        <Route path="/articles/new" element={<ProtectedRoute><NewArticle /></ProtectedRoute>} />
        <Route path="/articles/:id" element={<ProtectedRoute><ArticleDetail /></ProtectedRoute>} />
        <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
        <Route path="/report-format" element={<ProtectedRoute><ReportFormat /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/setup-firebase" element={<ProtectedRoute require="admin"><SetupFirebase /></ProtectedRoute>} />
        <Route path="/user-management" element={<ProtectedRoute require="admin"><UserManagement /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
