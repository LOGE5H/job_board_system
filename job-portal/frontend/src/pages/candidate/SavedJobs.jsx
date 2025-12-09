import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { candidateAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { 
  Bookmark, 
  Briefcase, 
  MapPin, 
  Clock,
  DollarSign,
  Building2,
  Trash2,
  ExternalLink,
  BookmarkX
} from 'lucide-react';

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    fetchSavedJobs();
  }, [currentPage]);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const res = await candidateAPI.getSavedJobs({ page: currentPage, limit: 10 });
      console.log('Saved jobs response:', res.data);
      setSavedJobs(res.data.savedJobs || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load saved jobs:', error);
      toast.error('Failed to load saved jobs');
    } finally {
      setLoading(false);
    }
  };

  const removeSavedJob = async (jobId) => {
    try {
      setRemoving(jobId);
      await candidateAPI.unsaveJob(jobId);
      setSavedJobs(savedJobs.filter(job => job._id !== jobId));
      toast.success('Job removed from saved list');
    } catch (error) {
      toast.error('Failed to remove job');
    } finally {
      setRemoving(null);
    }
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return null;
    const format = (val) => `$${(val / 1000).toFixed(0)}k`;
    if (min && max) return `${format(min)} - ${format(max)}`;
    if (min) return `From ${format(min)}`;
    return `Up to ${format(max)}`;
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const saved = new Date(dateString);
    const diffDays = Math.floor((now - saved) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Saved today';
    if (diffDays === 1) return 'Saved yesterday';
    if (diffDays < 7) return `Saved ${diffDays} days ago`;
    if (diffDays < 30) return `Saved ${Math.floor(diffDays / 7)} weeks ago`;
    return `Saved ${Math.floor(diffDays / 30)} months ago`;
  };

  const jobTypeLabels = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'internship': 'Internship',
    'remote': 'Remote'
  };

  if (loading && !savedJobs.length) {
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
          <Bookmark className="h-8 w-8 mr-3 text-primary-600" />
          Saved Jobs
        </h1>
        <p className="text-gray-600 mt-2">
          Jobs you've bookmarked for later
        </p>
      </div>

      {savedJobs.length === 0 ? (
        <div className="card text-center py-16">
          <BookmarkX className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900">No saved jobs</h3>
          <p className="text-gray-600 mt-2 mb-6">
            Save jobs you're interested in to apply later
          </p>
          <Link to="/jobs" className="btn-primary">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedJobs.map((job) => (
            <div
              key={job._id}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Job Info */}
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {job.logoPath ? (
                      <img
                        src={`http://localhost:5000${job.logoPath}`}
                        alt={job.companyName}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className="h-7 w-7 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          to={`/jobs/${job._id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          {job.title}
                        </Link>
                        
                        <Link
                          to={`/company/${job.employerId}`}
                          className="block text-gray-600 hover:text-primary-600"
                        >
                          {job.companyName}
                        </Link>
                      </div>

                      {/* Job Status */}
                      {job.status !== 'open' && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                          Closed
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                      {job.location && (
                        <span className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-1" />
                          {job.location}
                        </span>
                      )}
                      
                      <span className="flex items-center text-sm text-gray-500">
                        <Briefcase className="h-4 w-4 mr-1" />
                        {jobTypeLabels[job.jobType] || job.jobType}
                      </span>
                      
                      {formatSalary(job.salaryMin, job.salaryMax) && (
                        <span className="flex items-center text-sm text-gray-500">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatSalary(job.salaryMin, job.salaryMax)}
                        </span>
                      )}
                      
                      <span className="flex items-center text-sm text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        {getTimeAgo(job.savedAt)}
                      </span>
                    </div>

                    {/* Skills */}
                    {job.requiredSkills && job.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {job.requiredSkills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 5 && (
                          <span className="px-2 py-1 text-gray-500 text-xs">
                            +{job.requiredSkills.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 md:flex-col md:space-x-0 md:space-y-2">
                  <Link
                    to={`/jobs/${job._id}`}
                    className="btn-primary flex items-center text-sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Job
                  </Link>
                  
                  <button
                    onClick={() => removeSavedJob(job._id)}
                    disabled={removing === job._id}
                    className="btn-secondary flex items-center text-sm text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {removing === job._id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Description Preview */}
              {job.description && (
                <p className="mt-4 pt-4 border-t text-sm text-gray-600 line-clamp-2">
                  {job.description}
                </p>
              )}
            </div>
          ))}
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

      {/* Quick Stats */}
      {savedJobs.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              You have <strong>{savedJobs.length}</strong> saved job{savedJobs.length !== 1 ? 's' : ''}
            </span>
            <Link
              to="/jobs"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Find more jobs →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
