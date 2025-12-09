import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Clock, Building2, Bookmark, BookmarkCheck, ArrowUpRight, Users } from 'lucide-react';
import { useState } from 'react';
import { candidateAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function JobCard({ job, showCompany = true, initialSaved = false, onUnsave }) {
  const { isAuthenticated, isCandidate } = useAuth();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  const handleSaveToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated || !isCandidate) {
      toast.error('Please login as a candidate to save jobs');
      return;
    }

    try {
      setSaving(true);
      if (isSaved) {
        await candidateAPI.unsaveJob(job._id);
        setIsSaved(false);
        toast.success('Job removed from saved');
        if (onUnsave) onUnsave(job._id);
      } else {
        await candidateAPI.saveJob(job._id);
        setIsSaved(true);
        toast.success('Job saved');
      }
    } catch (error) {
      toast.error('Failed to update saved status');
    } finally {
      setSaving(false);
    }
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Salary not specified';
    const format = (val) => `$${(val / 1000).toFixed(0)}k`;
    if (min && max) return `${format(min)} - ${format(max)}`;
    if (min) return `From ${format(min)}`;
    return `Up to ${format(max)}`;
  };

  const getJobTypeBadge = (type) => {
    const styles = {
      'full-time': 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
      'part-time': 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
      'contract': 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
      'internship': 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
      'remote': 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
    };
    return styles[type] || 'bg-gray-100 text-gray-700 ring-1 ring-gray-200';
  };

  const formatJobType = (type) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('-');
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const posted = new Date(dateString);
    const diffDays = Math.floor((now - posted) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  return (
    <Link to={`/jobs/${job._id}`} className="block group">
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 p-6 
                      hover:shadow-xl hover:shadow-primary-500/10 hover:border-primary-200/50 
                      transition-all duration-300 hover:-translate-y-1">
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-4 flex-1 min-w-0">
              {/* Company Logo */}
              <div className="flex-shrink-0">
                {job.logoPath ? (
                  <img 
                    src={job.logoPath} 
                    alt={job.companyName}
                    className="w-14 h-14 rounded-xl object-cover ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center ring-2 ring-gray-100 group-hover:ring-primary-200 transition-all">
                    <Building2 className="w-7 h-7 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Job Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                    {job.title}
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
                
                {showCompany && job.companyName && (
                  <p className="text-gray-500 text-sm mt-0.5 font-medium">{job.companyName}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                  <span className="flex items-center text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                    {job.location}
                  </span>
                  <span className="flex items-center text-sm font-medium text-emerald-600">
                    <DollarSign className="w-4 h-4 mr-0.5" />
                    {formatSalary(job.salaryMin, job.salaryMax)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getJobTypeBadge(job.jobType)}`}>
                {formatJobType(job.jobType)}
              </span>
              
              {isCandidate && (
                <button
                  onClick={handleSaveToggle}
                  disabled={saving}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isSaved 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'bg-gray-100 text-gray-400 hover:bg-primary-50 hover:text-primary-500'
                  }`}
                  title={isSaved ? 'Remove from saved' : 'Save job'}
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-5 h-5" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Skills */}
          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {job.requiredSkills.slice(0, 4).map((skill, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1 bg-gray-100/80 text-gray-600 rounded-lg text-xs font-medium hover:bg-primary-100 hover:text-primary-700 transition-colors"
                >
                  {skill}
                </span>
              ))}
              {job.requiredSkills.length > 4 && (
                <span className="px-3 py-1 bg-gray-100/80 text-gray-500 rounded-lg text-xs font-medium">
                  +{job.requiredSkills.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center text-gray-400">
                <Clock className="w-4 h-4 mr-1" />
                {getTimeAgo(job.createdAt)}
              </span>
              {job.applicationCount !== undefined && (
                <span className="flex items-center text-gray-400">
                  <Users className="w-4 h-4 mr-1" />
                  {job.applicationCount} applicant{job.applicationCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <span className="text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              View Details
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
