import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavigationBar from './components/NavigationBar';
import Home from './pages/Home';
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
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <NavigationBar />
          <Routes>
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
            <Route path="/setup-firebase" element={<SetupFirebase />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
