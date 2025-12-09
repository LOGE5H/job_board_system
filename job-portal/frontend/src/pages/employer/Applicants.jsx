import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { employerAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { 
  Users, 
  ArrowLeft, 
  FileText, 
  Mail, 
  Phone,
  MapPin,
  Calendar,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Briefcase,
  GraduationCap,
  Award,
  User,
  ExternalLink,
  X,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
  shortlisted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  hired: 'bg-purple-100 text-purple-800 border-purple-200'
};

const statusIcons = {
  pending: Clock,
  reviewed: Eye,
  shortlisted: Star,
  rejected: XCircle,
  hired: CheckCircle
};

export default function Applicants() {
  const { jobId } = useParams();
  const [applicants, setApplicants] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    console.log('Applicants component mounted, jobId:', jobId);
    fetchApplicants();
  }, [jobId, currentPage, statusFilter]);

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: 10 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      console.log('Fetching applicants for job:', jobId, 'with params:', params);
      const res = await employerAPI.getApplicants(jobId, params);
      console.log('Applicants response:', res.data);
      console.log('Applications array:', res.data.applications);
      setApplicants(res.data.applications || []);
      setJob(res.data.job);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load applicants:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidateProfile = async (applicationId) => {
    try {
      setProfileLoading(true);
      console.log('Fetching candidate profile for application:', applicationId);
      const res = await employerAPI.getCandidateProfile(applicationId);
      console.log('Candidate profile response:', res.data);
      setCandidateProfile(res.data);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Failed to load candidate profile:', error);
      toast.error('Failed to load candidate profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const updateStatus = async (applicationId, newStatus) => {
    try {
      console.log('Updating status for application:', applicationId, 'to:', newStatus);
      await employerAPI.updateApplicationStatus(applicationId, newStatus);
      
      const statusMessages = {
        reviewed: 'Application marked as reviewed',
        shortlisted: 'Candidate shortlisted! They will be notified.',
        rejected: 'Application rejected. Candidate will be notified.',
        hired: '🎉 Candidate hired! They will be notified.'
      };
      
      toast.success(statusMessages[newStatus] || 'Status updated');
      fetchApplicants();
      
      if (candidateProfile?.application?.id === applicationId) {
        setCandidateProfile({
          ...candidateProfile,
          application: { ...candidateProfile.application, status: newStatus }
        });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !applicants.length) {
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
        <Link
          to="/employer/jobs"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Jobs
        </Link>
        
        {job && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="h-8 w-8 mr-3 text-primary-600" />
                Applicants for {job.title}
              </h1>
              <p className="text-gray-600 mt-1">
                {applicants.length} applicant{applicants.length !== 1 ? 's' : ''} • Review profiles and make hiring decisions
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'reviewed', 'shortlisted', 'hired', 'rejected'].map((status) => (
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
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Applicants Grid */}
      {applicants.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No applicants yet</h3>
          <p className="text-gray-600 mt-2">
            When candidates apply to this job, they'll appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applicants.map((applicant) => {
            const StatusIcon = statusIcons[applicant.status];
            return (
              <div
                key={applicant.id}
                className="card hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-white">
                        {applicant.full_name?.charAt(0).toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {applicant.full_name || 'Candidate'}
                      </h3>
                      <p className="text-sm text-gray-500">{applicant.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[applicant.status]}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {applicant.status}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                  {applicant.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {applicant.location}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    Applied {formatDate(applicant.created_at)}
                  </div>
                </div>

                {/* Skills Preview */}
                {applicant.skills && applicant.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {applicant.skills.slice(0, 4).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {applicant.skills.length > 4 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                          +{applicant.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-4 space-y-3">
                  {/* View Profile & Resume */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('View Profile clicked for:', applicant.id);
                        alert('View Profile clicked for: ' + applicant.full_name);
                        fetchCandidateProfile(applicant.id);
                      }}
                      className="flex-1 btn-outline text-sm py-2 flex items-center justify-center cursor-pointer"
                    >
                      <User className="h-4 w-4 mr-1" />
                      View Profile
                    </button>
                    {(applicant.resume_path || applicant.profile_resume) && (
                      <a
                        href={`http://localhost:5000${applicant.resume_path || applicant.profile_resume}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn-outline text-sm py-2 flex items-center justify-center"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Resume
                      </a>
                    )}
                  </div>

                  {/* Status Actions */}
                  <div className="flex gap-2">
                    {applicant.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Shortlist clicked for:', applicant.id);
                            alert('Shortlist clicked for: ' + applicant.full_name);
                            updateStatus(applicant.id, 'shortlisted');
                          }}
                          className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 py-2 rounded-lg text-sm font-medium flex items-center justify-center cursor-pointer"
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Shortlist
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Reject clicked for:', applicant.id);
                            alert('Reject clicked for: ' + applicant.full_name);
                            updateStatus(applicant.id, 'rejected');
                          }}
                          className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 py-2 rounded-lg text-sm font-medium flex items-center justify-center cursor-pointer"
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                      </>
                    )}
                    {applicant.status === 'reviewed' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(applicant.id, 'shortlisted')}
                          className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 py-2 rounded-lg text-sm font-medium cursor-pointer"
                        >
                          Shortlist
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(applicant.id, 'rejected')}
                          className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 py-2 rounded-lg text-sm font-medium cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {applicant.status === 'shortlisted' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            console.log('Hire clicked for:', applicant.id);
                            updateStatus(applicant.id, 'hired');
                          }}
                          className="flex-1 bg-purple-600 text-white hover:bg-purple-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center cursor-pointer"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Hire
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(applicant.id, 'rejected')}
                          className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 py-2 rounded-lg text-sm font-medium cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {applicant.status === 'hired' && (
                      <div className="flex-1 bg-purple-50 text-purple-700 py-2 rounded-lg text-sm font-medium text-center flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Hired
                      </div>
                    )}
                    {applicant.status === 'rejected' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(applicant.id, 'shortlisted')}
                        className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 rounded-lg text-sm font-medium cursor-pointer"
                      >
                        Reconsider
                      </button>
                    )}
                  </div>
                </div>
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

      {/* Candidate Profile Modal */}
      {showProfileModal && candidateProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Candidate Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {profileLoading ? (
              <div className="p-12 flex justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="p-6">
                {/* Candidate Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                      {candidateProfile.candidate.profile_picture ? (
                        <img
                          src={`http://localhost:5000${candidateProfile.candidate.profile_picture}`}
                          alt={candidateProfile.candidate.full_name}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-bold text-white">
                          {candidateProfile.candidate.full_name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {candidateProfile.candidate.full_name}
                      </h3>
                      <p className="text-gray-600">{candidateProfile.candidate.email}</p>
                      {candidateProfile.candidate.phone && (
                        <p className="text-gray-600 flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-1" />
                          {candidateProfile.candidate.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[candidateProfile.application.status]}`}>
                      {candidateProfile.application.status}
                    </span>
                    {candidateProfile.matchScore > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">Skills Match</span>
                        <div className="text-2xl font-bold text-primary-600">
                          {candidateProfile.matchScore}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Info */}
                <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
                  {candidateProfile.candidate.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {candidateProfile.candidate.location}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    Applied {formatDate(candidateProfile.application.applied_at)}
                  </div>
                </div>

                {/* Bio */}
                {candidateProfile.candidate.bio && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <User className="h-5 w-5 mr-2 text-primary-600" />
                      About
                    </h4>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {candidateProfile.candidate.bio}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {candidateProfile.candidate.skills?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Award className="h-5 w-5 mr-2 text-primary-600" />
                      Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {candidateProfile.candidate.skills.map((skill, idx) => {
                        const isMatching = candidateProfile.matchingSkills?.some(
                          ms => ms.toLowerCase() === skill.toLowerCase()
                        );
                        return (
                          <span
                            key={idx}
                            className={`px-3 py-1 rounded-full text-sm ${
                              isMatching
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {skill}
                            {isMatching && <CheckCircle className="h-3 w-3 ml-1 inline" />}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {candidateProfile.candidate.experience?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Briefcase className="h-5 w-5 mr-2 text-primary-600" />
                      Experience
                    </h4>
                    <div className="space-y-4">
                      {candidateProfile.candidate.experience.map((exp, idx) => (
                        <div key={idx} className="border-l-2 border-primary-200 pl-4">
                          <h5 className="font-medium text-gray-900">{exp.title}</h5>
                          <p className="text-gray-600">{exp.company}</p>
                          <p className="text-sm text-gray-500">
                            {exp.startDate} - {exp.endDate || 'Present'}
                          </p>
                          {exp.description && (
                            <p className="text-sm text-gray-600 mt-1">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {candidateProfile.candidate.education?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <GraduationCap className="h-5 w-5 mr-2 text-primary-600" />
                      Education
                    </h4>
                    <div className="space-y-3">
                      {candidateProfile.candidate.education.map((edu, idx) => (
                        <div key={idx} className="border-l-2 border-primary-200 pl-4">
                          <h5 className="font-medium text-gray-900">{edu.degree}</h5>
                          <p className="text-gray-600">{edu.institution}</p>
                          <p className="text-sm text-gray-500">{edu.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cover Letter */}
                {candidateProfile.application.cover_letter && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary-600" />
                      Cover Letter
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {candidateProfile.application.cover_letter}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resume Download */}
                {candidateProfile.application.resume_path && (
                  <div className="mb-6">
                    <a
                      href={`http://localhost:5000${candidateProfile.application.resume_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download Resume
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t pt-6 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Update Application Status</h4>
                  <div className="flex flex-wrap gap-3">
                    {candidateProfile.application.status !== 'reviewed' && (
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Mark Reviewed clicked in modal');
                          updateStatus(candidateProfile.application.id, 'reviewed');
                        }}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium flex items-center cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Mark Reviewed
                      </button>
                    )}
                    {candidateProfile.application.status !== 'shortlisted' && candidateProfile.application.status !== 'hired' && (
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Shortlist clicked in modal');
                          updateStatus(candidateProfile.application.id, 'shortlisted');
                        }}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium flex items-center cursor-pointer"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Shortlist
                      </button>
                    )}
                    {candidateProfile.application.status === 'shortlisted' && (
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Hire clicked in modal');
                          updateStatus(candidateProfile.application.id, 'hired');
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center cursor-pointer"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Hire Candidate
                      </button>
                    )}
                    {candidateProfile.application.status !== 'rejected' && candidateProfile.application.status !== 'hired' && (
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Reject clicked in modal');
                          updateStatus(candidateProfile.application.id, 'rejected');
                        }}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium flex items-center cursor-pointer"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </button>
                    )}
                    {candidateProfile.application.status === 'hired' && (
                      <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Candidate Hired!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
