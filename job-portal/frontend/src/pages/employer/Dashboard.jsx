import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { employerAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
  Briefcase, Users, FileText, TrendingUp, Plus, 
  Clock, CheckCircle, XCircle, Eye, AlertCircle
} from 'lucide-react';

export default function EmployerDashboard() {
  const { user, isEmailVerified } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await employerAPI.getDashboard();
      setDashboardData(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const recentApplications = dashboardData?.recentApplications || [];
  const applicationStats = dashboardData?.applicationStats || [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'reviewed': return <Eye className="h-4 w-4 text-blue-500" />;
      case 'shortlisted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.profile?.company_name || 'Employer'}
          </h1>
          <p className="text-gray-600 mt-1">Manage your job postings and applicants</p>
        </div>
        
        {isEmailVerified ? (
          <Link to="/employer/jobs/create" className="btn-primary flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Post New Job
          </Link>
        ) : (
          <div className="flex items-center text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
            <AlertCircle className="h-5 w-5 mr-2" />
            Verify your email to post jobs
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_jobs || 0}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Jobs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.active_jobs || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Applicants</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_applications || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">This Month</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.applicationsThisMonth || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Applications</h2>
              <Link to="/employer/jobs" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All Jobs →
              </Link>
            </div>

            {recentApplications.length > 0 ? (
              <div className="space-y-4">
                {recentApplications.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {app.candidate_name?.charAt(0) || 'C'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{app.candidate_name}</p>
                        <p className="text-sm text-gray-600">Applied for {app.job_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(app.status)}
                      <span className="text-sm text-gray-600 capitalize">{app.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications yet</p>
                <p className="text-sm mt-1">Post a job to start receiving applications</p>
              </div>
            )}
          </div>
        </div>

        {/* Application Stats */}
        <div>
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Application Status</h2>
            
            <div className="space-y-4">
              {['pending', 'reviewed', 'shortlisted', 'rejected'].map(status => {
                const stat = applicationStats.find(s => s.status === status);
                const count = stat?.count || 0;
                const total = stats.total_applications || 1;
                const percentage = Math.round((count / total) * 100) || 0;

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        {getStatusIcon(status)}
                        <span className="ml-2 text-sm text-gray-600 capitalize">{status}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          status === 'pending' ? 'bg-yellow-500' :
                          status === 'reviewed' ? 'bg-blue-500' :
                          status === 'shortlisted' ? 'bg-green-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                to="/employer/jobs/create" 
                className="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <Plus className="h-5 w-5 text-primary-600 mr-3" />
                <span className="text-primary-700 font-medium">Post New Job</span>
              </Link>
              <Link 
                to="/employer/jobs" 
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Briefcase className="h-5 w-5 text-gray-600 mr-3" />
                <span className="text-gray-700 font-medium">Manage Jobs</span>
              </Link>
              <Link 
                to="/employer/profile" 
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FileText className="h-5 w-5 text-gray-600 mr-3" />
                <span className="text-gray-700 font-medium">Update Profile</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
