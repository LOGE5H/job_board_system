import { useState } from 'react';
import { Search, MapPin, Filter, X } from 'lucide-react';

const jobTypes = [
  { value: '', label: 'All Types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'remote', label: 'Remote' }
];

export default function JobFilters({ filters, onFilterChange, categories = [] }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      keyword: '',
      location: '',
      jobType: '',
      category: '',
      salaryMin: '',
      salaryMax: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Main Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Job title or keyword"
            value={filters.keyword}
            onChange={(e) => handleChange('keyword', e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Location"
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filters.jobType}
            onChange={(e) => handleChange('jobType', e.target.value)}
            className="input-field flex-1"
          >
            {jobTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn-secondary flex items-center ${showAdvanced ? 'bg-primary-100 text-primary-700' : ''}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="input-field"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category} ({cat.job_count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
              <input
                type="number"
                placeholder="e.g., 50000"
                value={filters.salaryMin}
                onChange={(e) => handleChange('salaryMin', e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
              <input
                type="number"
                placeholder="e.g., 100000"
                value={filters.salaryMax}
                onChange={(e) => handleChange('salaryMax', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          <button
            onClick={clearFilters}
            className="flex items-center text-sm text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
