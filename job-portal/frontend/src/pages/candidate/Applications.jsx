import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { candidateAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { 
  FileCheck, 
  Briefcase, 
  MapPin, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Eye,
  ExternalLink,
  Building2
} from 'lucide-react';

const statusConfig = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    label: 'Pending Review'
  },
  reviewed: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Eye,
    label: 'Reviewed'
  },
  shortlisted: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Star,
    label: 'Shortlisted'
  },
  rejected: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    label: 'Not Selected'
  },
  hired: {
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: CheckCircle,
    label: 'Hired'
  }
};

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchApplications();
  }, [currentPage, statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: 10 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await candidateAPI.getApplications(params);
      setApplications(res.data.applications);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const applied = new Date(dateString);
    const diffDays = Math.floor((now - applied) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (loading && !applications.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <FileCheck className="h-8 w-8 mr-3 text-primary-600" />
          My Applications
        </h1>
        <p className="text-gray-600 mt-2">
          Track the status of your job applications
        </p>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'].map((status) => {
            const config = statusConfig[status];
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : config?.label || status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900">No applications found</h3>
          <p className="text-gray-600 mt-2 mb-6">
            {statusFilter === 'all'
              ? "You haven't applied to any jobs yet"
              : `No ${statusFilter} applications`}
          </p>
          <Link to="/jobs" className="btn-primary">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const config = statusConfig[app.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            
            return (
              <div
                key={app._id}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Job Info */}
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {app.companyLogo ? (
                        <img
                          src={`http://localhost:5000${app.companyLogo}`}
                          alt={app.companyName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <Building2 className="h-7 w-7 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <Link
                        to={`/jobs/${app.jobId}`}
                        className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {app.jobTitle}
                      </Link>
                      
                      <Link
                        to={`/company/${app.employerId}`}
                        className="block text-gray-600 hover:text-primary-600"
                      >
                        {app.companyName}
                      </Link>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                        {app.location && (
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {app.location}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Applied {getTimeAgo(app.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${config.color}`}>
                      <StatusIcon className="h-4 w-4 mr-2" />
                      {config.label}
                    </span>
                    
                    <Link
                      to={`/jobs/${app.jobId}`}
                      className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                      title="View Job"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </Link>
                  </div>
                </div>

                {/* Application Details */}
                {app.coverLetter && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Cover Letter:</span>{' '}
                      {app.coverLetter.length > 200
                        ? `${app.coverLetter.substring(0, 200)}...`
                        : app.coverLetter}
                    </p>
                  </div>
                )}

                {/* Status Timeline Hint */}
                {app.status === 'shortlisted' && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 flex items-center">
                      <Star className="h-4 w-4 mr-2" />
                      Great news! You've been shortlisted. The employer may contact you soon.
                    </p>
                  </div>
                )}
                
                {app.status === 'hired' && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-800 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Congratulations! You've been selected for this position.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Summary Stats */}
      {applications.length > 0 && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = applications.filter(a => a.status === status).length;
            const Icon = config.icon;
            return (
              <div
                key={status}
                className={`p-4 rounded-lg border ${config.color} text-center cursor-pointer`}
                onClick={() => setStatusFilter(status)}
              >
                <Icon className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs">{config.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
