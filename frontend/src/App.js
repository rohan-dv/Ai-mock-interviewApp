import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ResumeUpload from "./pages/ResumeUpload";
import InterviewSetup from "./pages/InterviewSetup";
import LiveInterview from "./pages/LiveInterview";
import FeedbackReport from "./pages/FeedbackReport";
import Analytics from "./pages/Analytics";
import StudyPlan from "./pages/StudyPlan";
import History from "./pages/History";

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />

      <Route path="/dashboard" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
      <Route path="/resume" element={<ProtectedRoute><AppShell><ResumeUpload /></AppShell></ProtectedRoute>} />
      <Route path="/interview/setup" element={<ProtectedRoute><AppShell><InterviewSetup /></AppShell></ProtectedRoute>} />
      <Route path="/interview/:sessionId" element={<ProtectedRoute><LiveInterview /></ProtectedRoute>} />
      <Route path="/feedback/:sessionId" element={<ProtectedRoute><AppShell><FeedbackReport /></AppShell></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AppShell><Analytics /></AppShell></ProtectedRoute>} />
      <Route path="/study-plan" element={<ProtectedRoute><AppShell><StudyPlan /></AppShell></ProtectedRoute>} />
      <Route path="/study-plan/:sessionId" element={<ProtectedRoute><AppShell><StudyPlan /></AppShell></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><AppShell><History /></AppShell></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster theme="dark" position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
