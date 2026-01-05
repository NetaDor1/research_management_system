<<<<<<< Updated upstream
import logo from './logo.svg';
=======
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavigationBar from './components/NavigationBar';
import Home from './pages/home';
import Dashboard from './pages/Dashboard';
import Research from './pages/Research';
import ResearchDetail from './pages/ResearchDetail';
import NewResearch from './pages/NewResearch';
import Patents from './pages/Patents';
import PatentDetail from './pages/PatentDetail';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import Statistics from './pages/Statistics';
import ReportFormat from './pages/ReportFormat';
>>>>>>> Stashed changes
import './App.css';
import { db } from "../services/firebase";


function App() {
  return (
<<<<<<< Updated upstream
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
=======
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
            <Route path="/patents/:id" element={<PatentDetail />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/report-format" element={<ReportFormat />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
>>>>>>> Stashed changes
  );
}

export default App;
