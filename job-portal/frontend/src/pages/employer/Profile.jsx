import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, employerAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Building2, Save, Upload, MapPin, Globe, FileText, Mail, Phone } from 'lucide-react';

export default function EmployerProfile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    website: '',
    location: '',
    description: '',
    industry: '',
    companySize: '',
    foundedYear: ''
  });

  const companySizes = [
    '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  ];

  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
    'Education', 'Consulting', 'Media', 'Real Estate', 'Non-profit', 'Other'
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      const profile = res.data.user;
      setFormData({
        companyName: profile.company_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        website: profile.website || '',
        location: profile.location || '',
        description: profile.description || '',
        industry: profile.industry || '',
        companySize: profile.company_size || '',
        foundedYear: profile.founded_year || ''
      });
      if (profile.company_logo) {
        setLogoPreview(`http://localhost:5000${profile.company_logo}`);
      }
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo must be less than 5MB');
        return;
      }
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('companyName', formData.companyName);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('website', formData.website);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('industry', formData.industry);
      formDataToSend.append('companySize', formData.companySize);
      formDataToSend.append('foundedYear', formData.foundedYear);

      const logoInput = document.getElementById('logo-input');
      if (logoInput.files[0]) {
        formDataToSend.append('logo', logoInput.files[0]);
      }

      const res = await employerAPI.updateProfile(formDataToSend);
      updateUser(res.data.user);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-8 w-8 mr-3 text-primary-600" />
          Company Profile
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your company information and settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Logo */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h2>
          
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-12 w-12 text-gray-400" />
              )}
            </div>
            
            <div>
              <label className="btn-secondary cursor-pointer inline-flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
                <input
                  id="logo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                PNG, JPG up to 5MB. Recommended size: 200x200px
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="h-4 w-4 inline mr-1" />
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="input-field bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="h-4 w-4 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="input-field"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-4 w-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="input-field"
                placeholder="City, Country"
              />
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Industry</option>
                {industries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Size
              </label>
              <select
                name="companySize"
                value={formData.companySize}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Size</option>
                {companySizes.map(size => (
                  <option key={size} value={size}>{size} employees</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Founded Year
              </label>
              <input
                type="number"
                name="foundedYear"
                value={formData.foundedYear}
                onChange={handleChange}
                className="input-field"
                min="1800"
                max={new Date().getFullYear()}
                placeholder="2020"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="h-4 w-4 inline mr-1" />
              About Company
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="input-field"
              placeholder="Tell candidates about your company, culture, and what makes it a great place to work..."
            />
          </div>
        </div>

        {/* Account Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h2>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Account Verification</p>
              <p className="text-sm text-gray-600">
                {user?.is_verified 
                  ? 'Your account is verified and active'
                  : 'Your account is pending verification'
                }
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              user?.is_verified
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {user?.is_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
