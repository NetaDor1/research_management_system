import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import NavigationBar from './components/NavigationBar';
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
import './App.css';

function AppContent() {
  const location = useLocation();
  const showNavBar = location.pathname !== '/login';

  return (
    <div className="App">
      {showNavBar && <NavigationBar />}
      <Routes>
        <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/research" element={<Research />} />
            <Route path="/research/new" element={<NewResearch />} />
            <Route path="/research/:id" element={<ResearchDetail />} />
            <Route path="/patents" element={<Patents />} />
            <Route path="/patents/new" element={<NewPatent />} />
            <Route path="/patents/:id" element={<PatentDetail />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/new" element={<NewArticle />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/report-format" element={<ReportFormat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/setup-firebase" element={<SetupFirebase />} />
            <Route path="/notifications" element={<Notifications />} />
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
