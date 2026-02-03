import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardPage } from './pages/DashboardPage';
import { OwnerPage } from './pages/OwnerPage';
import { ResearcherPage } from './pages/ResearcherPage';
import { VerifierPage } from './pages/VerifierPage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/owner" element={<OwnerPage />} />
        <Route path="/researcher" element={<ResearcherPage />} />
        <Route path="/verifier" element={<VerifierPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
