import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jobsAPI, candidateAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  MapPin, DollarSign, Clock, Building2, Briefcase, 
  Bookmark, BookmarkCheck, Flag, Share2, ArrowLeft,
  CheckCircle, Globe, Users, ExternalLink
} from 'lucide-react';

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isCandidate, user } = useAuth();
  
  const [job, setJob] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [companyJobs, setCompanyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState(null);

  useEffect(() => {
    fetchJobDetails();
    if (isCandidate) {
      checkApplicationStatus();
      checkSavedStatus();
    }
  }, [id, isCandidate]);

  const fetchJobDetails = async () => {
    try {
      const res = await jobsAPI.getById(id);
      setJob(res.data.job);
      setSimilarJobs(res.data.similarJobs || []);
      setCompanyJobs(res.data.companyJobs || []);
    } catch (error) {
      console.error('Failed to fetch job:', error);
      toast.error('Job not found');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const checkApplicationStatus = async () => {
    try {
      const res = await candidateAPI.checkApplication(id);
      setHasApplied(res.data.hasApplied);
      setApplicationStatus(res.data.application?.status);
    } catch (error) {
      console.error('Failed to check application:', error);
    }
  };

  const checkSavedStatus = async () => {
    try {
      const res = await candidateAPI.checkSavedJob(id);
      setIsSaved(res.data.isSaved);
    } catch (error) {
      console.error('Failed to check saved status:', error);
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to apply');
      navigate('/login');
      return;
    }

    if (!isCandidate) {
      toast.error('Only candidates can apply to jobs');
      return;
    }

    setApplying(true);
    try {
      const formData = new FormData();
      formData.append('coverLetter', coverLetter);
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      await candidateAPI.applyToJob(id, formData);
      toast.success('Application submitted successfully!');
      setHasApplied(true);
      setApplicationStatus('pending');
      setShowApplyModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleSaveJob = async () => {
    if (!isAuthenticated) {
      toast.error('Please login as a candidate to save jobs');
      sessionStorage.setItem('redirectAfterLogin', `/jobs/${id}`);
      navigate('/login/candidate');
      return;
    }

    if (!isCandidate) {
      toast.error('Only candidates can save jobs');
      return;
    }

    try {
      if (isSaved) {
        await candidateAPI.unsaveJob(id);
        setIsSaved(false);
        toast.success('Job removed from saved');
      } else {
        await candidateAPI.saveJob(id);
        setIsSaved(true);
        toast.success('Job saved successfully');
      }
    } catch (error) {
      toast.error('Failed to save job');
    }
  };

  const handleReport = async (reason, description) => {
    try {
      await jobsAPI.report(id, { reason, description });
      toast.success('Job reported successfully');
      setShowReportModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to report job');
    }
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()} per year`;
    if (min) return `From $${min.toLocaleString()} per year`;
    return `Up to $${max.toLocaleString()} per year`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'badge-warning',
      reviewed: 'badge-primary',
      shortlisted: 'badge-success',
      rejected: 'badge-danger'
    };
    return styles[status] || 'badge-gray';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Job not found</h2>
        <Link to="/jobs" className="btn-primary mt-4 inline-block">
          Browse Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link to="/jobs" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Jobs
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {job.logoPath ? (
                  <img 
                    src={job.logoPath} 
                    alt={job.companyName}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                  <Link 
                    to={`/company/${job.employerId}`}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {job.companyName}
                  </Link>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {(!isAuthenticated || isCandidate) && (
                  <button
                    onClick={handleSaveJob}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                    title="Save job"
                  >
                    {isSaved ? (
                      <BookmarkCheck className="h-5 w-5 text-primary-600" />
                    ) : (
                      <Bookmark className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                  title="Report this job"
                >
                  <Flag className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Job Meta */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                {job.location}
              </div>
              <div className="flex items-center text-gray-600">
                <Briefcase className="h-5 w-5 mr-2 text-gray-400" />
                {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1).replace('-', ' ')}
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="h-5 w-5 mr-2 text-gray-400" />
                {formatSalary(job.salaryMin, job.salaryMax)}
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-2 text-gray-400" />
                {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Application Status or Apply Button */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              {hasApplied ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-700">You have applied to this job</span>
                  </div>
                  <span className={getStatusBadge(applicationStatus)}>
                    {applicationStatus?.charAt(0).toUpperCase() + applicationStatus?.slice(1)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('Please login as a candidate to apply');
                      // Save the job URL to redirect back after login
                      sessionStorage.setItem('redirectAfterLogin', `/jobs/${id}`);
                      navigate('/login/candidate');
                      return;
                    }
                    if (!isCandidate) {
                      toast.error('Only candidates can apply to jobs');
                      return;
                    }
                    setShowApplyModal(true);
                  }}
                  className="btn-primary w-full md:w-auto"
                >
                  Apply Now
                </button>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
            <div className="prose prose-gray max-w-none">
              {job.description.split('\n').map((paragraph, index) => (
                <p key={index} className="text-gray-600 mb-4">{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Required Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill, index) => (
                  <span key={index} className="badge-primary">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">About the Company</h3>
            <div className="space-y-4">
              {job.logoPath && (
                <img 
                  src={job.logoPath} 
                  alt={job.companyName}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div>
                <h4 className="font-medium text-gray-900">{job.companyName}</h4>
                {job.industry && (
                  <p className="text-sm text-gray-600">{job.industry}</p>
                )}
              </div>
              {job.companyDescription && (
                <p className="text-sm text-gray-600">{job.companyDescription.substring(0, 200)}...</p>
              )}
              {job.website && (
                <a 
                  href={job.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700 text-sm"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Visit Website
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
              <Link 
                to={`/company/${job.employerId}`}
                className="btn-outline w-full text-center"
              >
                View Company Profile
              </Link>
            </div>
          </div>

          {/* More Jobs from Company */}
          {companyJobs.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                More from {job.companyName}
              </h3>
              <div className="space-y-3">
                {companyJobs.map(companyJob => (
                  <Link 
                    key={companyJob._id}
                    to={`/jobs/${companyJob._id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50"
                  >
                    <h4 className="font-medium text-gray-900">{companyJob.title}</h4>
                    <p className="text-sm text-gray-600">{companyJob.location}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Similar Jobs */}
          {similarJobs.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Similar Jobs</h3>
              <div className="space-y-3">
                {similarJobs.map(similarJob => (
                  <Link 
                    key={similarJob._id}
                    to={`/jobs/${similarJob._id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50"
                  >
                    <h4 className="font-medium text-gray-900">{similarJob.title}</h4>
                    <p className="text-sm text-gray-600">{similarJob.companyName}</p>
                    <p className="text-sm text-gray-500">{similarJob.location}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Apply to {job.title}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Letter (Optional)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={4}
                  className="input-field"
                  placeholder="Tell the employer why you're a great fit..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resume (Optional - uses profile resume if not provided)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => setShowApplyModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="btn-primary flex-1"
              >
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal 
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReport}
        />
      )}
    </div>
  );
}

function ReportModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    'Spam or misleading',
    'Fake job posting',
    'Inappropriate content',
    'Discrimination',
    'Other'
  ];

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    setSubmitting(true);
    await onSubmit(reason, description);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Report this Job</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for reporting
            </label>
            <div className="space-y-2">
              {reasons.map(r => (
                <label key={r} className="flex items-center">
                  <input
                    type="radio"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="mr-2"
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Provide more details..."
            />
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="btn-primary flex-1"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
