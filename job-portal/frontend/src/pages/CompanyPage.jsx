import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { employerAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Building2, MapPin, Globe, Calendar, Briefcase, ExternalLink } from 'lucide-react';

export default function CompanyPage() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    try {
      const res = await employerAPI.getCompanyPage(id);
      setCompany(res.data.company);
      setJobs(res.data.jobs);
    } catch (error) {
      console.error('Failed to fetch company:', error);
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

  if (!company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Company not found</h2>
        <Link to="/jobs" className="btn-primary mt-4 inline-block">
          Browse Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Company Header */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {company.logo_path ? (
            <img 
              src={company.logo_path}
              alt={company.company_name}
              className="w-24 h-24 rounded-xl object-cover"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-12 h-12 text-gray-400" />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
            
            <div className="flex flex-wrap items-center gap-4 mt-3 text-gray-600">
              {company.industry && (
                <span className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  {company.industry}
                </span>
              )}
              {company.location && (
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {company.location}
                </span>
              )}
              {company.website && (
                <a 
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700"
                >
                  <Globe className="h-4 w-4 mr-1" />
                  Website
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Member since {new Date(company.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {company.company_description && (
              <p className="mt-4 text-gray-600">{company.company_description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Open Jobs */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Open Positions ({jobs.length})
        </h2>

        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map(job => (
              <Link 
                key={job.id}
                to={`/jobs/${job.id}`}
                className="card hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">
                  {job.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {job.location}
                  </span>
                  <span className="badge-primary">
                    {job.job_type}
                  </span>
                  {job.category && (
                    <span className="badge-gray">
                      {job.category}
                    </span>
                  )}
                </div>

                {(job.salary_min || job.salary_max) && (
                  <p className="mt-2 text-gray-600">
                    ${job.salary_min?.toLocaleString() || '0'} - ${job.salary_max?.toLocaleString() || '∞'}
                  </p>
                )}

                <p className="mt-3 text-sm text-gray-500">
                  Posted {new Date(job.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No open positions at the moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
