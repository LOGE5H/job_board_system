import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jobsAPI } from '../services/api';
import JobCard from '../components/jobs/JobCard';
import JobFilters from '../components/jobs/JobFilters';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Briefcase } from 'lucide-react';

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalJobs: 0 });
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    location: searchParams.get('location') || '',
    jobType: searchParams.get('jobType') || '',
    category: searchParams.get('category') || '',
    salaryMin: searchParams.get('salaryMin') || '',
    salaryMax: searchParams.get('salaryMax') || ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchJobs();
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('page', pagination.currentPage.toString());
    setSearchParams(params);
  }, [filters, pagination.currentPage]);

  const fetchCategories = async () => {
    try {
      const res = await jobsAPI.getCategories();
      setCategories(res.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = { ...filters, page: pagination.currentPage, limit: 10 };
      const res = await jobsAPI.getAll(params);
      setJobs(res.data.jobs);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Briefcase className="h-8 w-8 mr-3 text-primary-600" />
          Find Jobs
        </h1>
        <p className="text-gray-600 mt-2">
          {pagination.totalJobs} jobs available
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <JobFilters 
          filters={filters} 
          onFilterChange={handleFilterChange}
          categories={categories}
        />
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : jobs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6">
            {jobs.map(job => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600">Try adjusting your search filters to find more opportunities.</p>
        </div>
      )}
    </div>
  );
}
