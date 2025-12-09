import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Public Pages
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import CompanyPage from './pages/CompanyPage';
import Login from './pages/auth/Login';
import LoginCandidate from './pages/auth/LoginCandidate';
import LoginEmployer from './pages/auth/LoginEmployer';
import RegisterCandidate from './pages/auth/RegisterCandidate';
import RegisterEmployer from './pages/auth/RegisterEmployer';
import VerifyEmail from './pages/auth/VerifyEmail';

// Employer Pages
import EmployerDashboard from './pages/employer/Dashboard';
import EmployerJobs from './pages/employer/Jobs';
import CreateJob from './pages/employer/CreateJob';
import EditJob from './pages/employer/EditJob';
import Applicants from './pages/employer/Applicants';
import EmployerProfile from './pages/employer/Profile';

// Candidate Pages
import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateApplications from './pages/candidate/Applications';
import SavedJobs from './pages/candidate/SavedJobs';
import CandidateProfile from './pages/candidate/Profile';

// Protected Route Components
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={user.role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard'} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/:id" element={<JobDetails />} />
      <Route path="/company/:id" element={<CompanyPage />} />
      
      {/* Auth Routes */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/login/candidate" element={<PublicOnlyRoute><LoginCandidate /></PublicOnlyRoute>} />
      <Route path="/login/employer" element={<PublicOnlyRoute><LoginEmployer /></PublicOnlyRoute>} />
      <Route path="/register/candidate" element={<PublicOnlyRoute><RegisterCandidate /></PublicOnlyRoute>} />
      <Route path="/register/employer" element={<PublicOnlyRoute><RegisterEmployer /></PublicOnlyRoute>} />
      <Route path="/verify/:token" element={<VerifyEmail />} />
      
      {/* Employer Routes */}
      <Route path="/employer/dashboard" element={
        <ProtectedRoute allowedRoles={['employer']}><EmployerDashboard /></ProtectedRoute>
      } />
      <Route path="/employer/jobs" element={
        <ProtectedRoute allowedRoles={['employer']}><EmployerJobs /></ProtectedRoute>
      } />
      <Route path="/employer/jobs/create" element={
        <ProtectedRoute allowedRoles={['employer']}><CreateJob /></ProtectedRoute>
      } />
      <Route path="/employer/jobs/:id/edit" element={
        <ProtectedRoute allowedRoles={['employer']}><EditJob /></ProtectedRoute>
      } />
      <Route path="/employer/jobs/:jobId/applicants" element={
        <ProtectedRoute allowedRoles={['employer']}><Applicants /></ProtectedRoute>
      } />
      <Route path="/employer/jobs/:jobId/applications" element={
        <ProtectedRoute allowedRoles={['employer']}><Applicants /></ProtectedRoute>
      } />
      <Route path="/employer/profile" element={
        <ProtectedRoute allowedRoles={['employer']}><EmployerProfile /></ProtectedRoute>
      } />
      
      {/* Candidate Routes */}
      <Route path="/candidate/dashboard" element={
        <ProtectedRoute allowedRoles={['candidate']}><CandidateDashboard /></ProtectedRoute>
      } />
      <Route path="/candidate/applications" element={
        <ProtectedRoute allowedRoles={['candidate']}><CandidateApplications /></ProtectedRoute>
      } />
      <Route path="/candidate/saved-jobs" element={
        <ProtectedRoute allowedRoles={['candidate']}><SavedJobs /></ProtectedRoute>
      } />
      <Route path="/candidate/profile" element={
        <ProtectedRoute allowedRoles={['candidate']}><CandidateProfile /></ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-grow">
            <AppRoutes />
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}

export default App;
