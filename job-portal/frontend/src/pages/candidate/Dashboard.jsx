import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { candidateAPI, jobsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import JobCard from '../../components/jobs/JobCard';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileCheck, 
  Bookmark,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
  ArrowRight
} from 'lucide-react';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pending: 0,
    reviewed: 0,
    shortlisted: 0,
    rejected: 0,
    savedJobs: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [applicationsRes, savedRes, recommendationsRes] = await Promise.all([
        candidateAPI.getApplications({ limit: 5 }),
        candidateAPI.getSavedJobs({ limit: 5 }),
        candidateAPI.getRecommendedJobs()
      ]);

      // Calculate stats from applications
      const apps = applicationsRes.data.applications || [];
      const savedJobs = savedRes.data.savedJobs || [];
      const statsData = {
        totalApplications: applicationsRes.data.pagination?.total || apps.length,
        pending: apps.filter(a => a.status === 'pending').length,
        reviewed: apps.filter(a => a.status === 'reviewed').length,
        shortlisted: apps.filter(a => a.status === 'shortlisted').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
        savedJobs: savedRes.data.pagination?.totalSaved || savedJobs.length
      };

      setStats(statsData);
      setRecentApplications(apps.slice(0, 5));
      setRecommendations(recommendationsRes.data || []);
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'reviewed': return FileCheck;
      case 'shortlisted': return Star;
      case 'rejected': return XCircle;
      case 'hired': return CheckCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'shortlisted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'hired': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <LayoutDashboard className="h-8 w-8 mr-3 text-primary-600" />
          Welcome back, {user?.profile?.fullName || user?.email}!
        </h1>
        <p className="text-gray-600 mt-2">
          Track your applications and discover new opportunities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="card text-center">
          <Briefcase className="h-8 w-8 text-primary-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
          <p className="text-sm text-gray-600">Total Applied</p>
        </div>
        
        <div className="card text-center">
          <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
          <p className="text-sm text-gray-600">Pending</p>
        </div>
        
        <div className="card text-center">
          <FileCheck className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.reviewed}</p>
          <p className="text-sm text-gray-600">Reviewed</p>
        </div>
        
        <div className="card text-center">
          <Star className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.shortlisted}</p>
          <p className="text-sm text-gray-600">Shortlisted</p>
        </div>
        
        <div className="card text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
          <p className="text-sm text-gray-600">Rejected</p>
        </div>
        
        <div className="card text-center">
          <Bookmark className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{stats.savedJobs}</p>
          <p className="text-sm text-gray-600">Saved Jobs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Applications</h2>
              <Link
                to="/candidate/applications"
                className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No applications yet</h3>
                <p className="text-gray-600 mt-2">Start applying to jobs to track them here</p>
                <Link to="/jobs" className="btn-primary mt-4 inline-block">
                  Browse Jobs
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((app) => {
                  const StatusIcon = getStatusIcon(app.status);
                  return (
                    <div
                      key={app._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          {app.companyLogo ? (
                            <img
                              src={`http://localhost:5000${app.companyLogo}`}
                              alt={app.companyName}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <Briefcase className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <Link
                            to={`/jobs/${app.jobId}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {app.jobTitle}
                          </Link>
                          <p className="text-sm text-gray-600">{app.companyName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          {formatDate(app.createdAt)}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {app.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Profile Completion */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/jobs"
                className="flex items-center p-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <Briefcase className="h-5 w-5 mr-3" />
                Search Jobs
              </Link>
              <Link
                to="/candidate/saved-jobs"
                className="flex items-center p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Bookmark className="h-5 w-5 mr-3" />
                View Saved Jobs
              </Link>
              <Link
                to="/candidate/profile"
                className="flex items-center p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <TrendingUp className="h-5 w-5 mr-3" />
                Update Profile
              </Link>
            </div>
          </div>

          {/* Profile Tips */}
          <div className="card bg-gradient-to-br from-primary-50 to-primary-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Profile Tips</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Complete your profile for better matches
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Upload an updated resume
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Add relevant skills to your profile
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Write a compelling headline
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Job Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-primary-600" />
              Recommended for You
            </h2>
            <Link
              to="/jobs"
              className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
            >
              View All Jobs <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
