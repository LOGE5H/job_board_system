import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { employerAPI, jobsAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { 
  Plus, Briefcase, Edit, Trash2, Users, Eye, EyeOff, 
  MoreVertical, MapPin, DollarSign, Clock
} from 'lucide-react';

export default function EmployerJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, [pagination.currentPage, statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await employerAPI.getJobs({
        page: pagination.currentPage,
        limit: 10,
        status: statusFilter
      });
      setJobs(res.data.jobs);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await jobsAPI.update(jobId, { status: newStatus });
      toast.success(`Job status updated to ${newStatus}`);
      fetchJobs();
    } catch (error) {
      toast.error('Failed to update job status');
    }
    setMenuOpen(null);
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await jobsAPI.delete(jobId);
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max.toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return 'badge-success';
      case 'closed': return 'badge-gray';
      case 'hidden': return 'badge-warning';
      default: return 'badge-gray';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Job Postings</h1>
          <p className="text-gray-600 mt-1">Manage and track your job listings</p>
        </div>
        <Link to="/employer/jobs/create" className="btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Post New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, currentPage: 1 }));
            }}
            className="input-field w-auto"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <LoadingSpinner size="lg" className="py-20" />
      ) : jobs.length > 0 ? (
        <>
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job._id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Link 
                        to={`/jobs/${job._id}`}
                        className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {job.title}
                      </Link>
                      <span className={getStatusBadge(job.status)}>
                        {job.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {job.location}
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {formatSalary(job.salaryMin, job.salaryMax)}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Skills */}
                    {job.requiredSkills && job.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {job.requiredSkills.slice(0, 5).map((skill, index) => (
                          <span key={index} className="badge-gray">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/employer/jobs/${job._id}/applicants`}
                      className="flex items-center px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {job.applicationCount} Applicants
                    </Link>

                    <Link
                      to={`/employer/jobs/${job._id}/edit`}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit className="h-5 w-5" />
                    </Link>

                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === job._id ? null : job._id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {menuOpen === job._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                          {job.status !== 'open' && (
                            <button
                              onClick={() => handleStatusChange(job._id, 'open')}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Mark as Open
                            </button>
                          )}
                          {job.status !== 'closed' && (
                            <button
                              onClick={() => handleStatusChange(job._id, 'closed')}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <EyeOff className="h-4 w-4 mr-2" />
                              Mark as Closed
                            </button>
                          )}
                          <hr className="my-1" />
                          <button
                            onClick={() => handleDelete(job._id)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Job
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs posted yet</h3>
          <p className="text-gray-600 mb-6">Start by posting your first job listing</p>
          <Link to="/employer/jobs/create" className="btn-primary">
            Post Your First Job
          </Link>
        </div>
      )}
    </div>
  );
}
