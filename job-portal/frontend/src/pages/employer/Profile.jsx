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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    website: '',
    location: '',
    companyDescription: '',
    industry: '',
    companySize: ''
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
      const res = await authAPI.getMe();
      const me = res.data;
      const profile = me?.profile || {};
      setFormData({
        companyName: profile.companyName || profile.company_name || '',
        email: me.email || '',
        phone: profile.phone || '',
        website: profile.website || '',
        location: profile.location || '',
        companyDescription: profile.companyDescription || profile.company_description || '',
        industry: profile.industry || '',
        companySize: profile.companySize || profile.company_size || ''
      });
      const logo = profile.logoPath || profile.logo_path;
      if (logo) setLogoPreview(logo);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB (PNG/JPG/GIF)');
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await employerAPI.uploadLogo(fd);
      const logoPath = res.data.logoPath;
      setLogoPreview(logoPath);
      updateUser({ ...(user || {}), profile: { ...(user?.profile || {}), logoPath } });
      toast.success('Logo uploaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await employerAPI.updateProfile({
        companyName: formData.companyName,
        companyDescription: formData.companyDescription,
        industry: formData.industry,
        companySize: formData.companySize,
        website: formData.website,
        location: formData.location,
        phone: formData.phone,
      });
      const profile = res.data.profile;
      updateUser({ ...(user || {}), profile: { ...(user?.profile || {}), ...profile } });
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

  const verified = user?.emailVerified ?? user?.profile?.isVerified ?? true;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-8 w-8 mr-3 text-primary-600" />
          Institution / Company Profile
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your organization information — this is the account that posts jobs
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
                {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                <input
                  id="logo-input"
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                PNG, JPG, GIF up to 2MB. Recommended size: 200x200px
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
                Organization / Company Name *
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                Organization Size
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="h-4 w-4 inline mr-1" />
              About Organization
            </label>
            <textarea
              name="companyDescription"
              value={formData.companyDescription}
              onChange={handleChange}
              rows={6}
              className="input-field"
              placeholder="Tell job seekers about your organization, culture, and what makes it a great place to work..."
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
                {verified
                  ? 'Your institution account is verified and can post jobs'
                  : 'Please verify your email to post jobs'
                }
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              verified
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <span className="inline-flex items-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </span>
            ) : (
              <span className="inline-flex items-center">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
