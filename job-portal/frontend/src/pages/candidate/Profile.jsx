import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, candidateAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  User, 
  Save, 
  Upload, 
  MapPin, 
  Mail, 
  Phone,
  FileText,
  Briefcase,
  GraduationCap,
  X,
  Plus,
  Linkedin,
  Github,
  Globe
} from 'lucide-react';

export default function CandidateProfile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    summary: '',
    skills: [],
    experience: '',
    education: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: ''
  });

  const experienceLevels = [
    { value: '0-1', label: '0-1 years' },
    { value: '1-3', label: '1-3 years' },
    { value: '3-5', label: '3-5 years' },
    { value: '5-10', label: '5-10 years' },
    { value: '10+', label: '10+ years' }
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      const profile = res.data.user;
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        headline: profile.headline || '',
        summary: profile.summary || '',
        skills: profile.skills || [],
        experience: profile.experience || '',
        education: profile.education || '',
        linkedinUrl: profile.linkedin_url || '',
        githubUrl: profile.github_url || '',
        portfolioUrl: profile.portfolio_url || ''
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Resume must be less than 10MB');
        return;
      }
      setResumeFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('headline', formData.headline);
      formDataToSend.append('summary', formData.summary);
      formDataToSend.append('skills', JSON.stringify(formData.skills));
      formDataToSend.append('experience', formData.experience);
      formDataToSend.append('education', formData.education);
      formDataToSend.append('linkedinUrl', formData.linkedinUrl);
      formDataToSend.append('githubUrl', formData.githubUrl);
      formDataToSend.append('portfolioUrl', formData.portfolioUrl);

      if (resumeFile) {
        formDataToSend.append('resume', resumeFile);
      }

      const res = await candidateAPI.updateProfile(formDataToSend);
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
          <User className="h-8 w-8 mr-3 text-primary-600" />
          My Profile
        </h1>
        <p className="text-gray-600 mt-2">
          Complete your profile to get better job recommendations
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 inline mr-1" />
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
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

            <div className="md:col-span-2">
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="h-4 w-4 inline mr-1" />
                Professional Headline
              </label>
              <input
                type="text"
                name="headline"
                value={formData.headline}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Senior Software Engineer with 5+ years experience"
              />
            </div>
          </div>
        </div>

        {/* Resume */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resume</h2>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              {user?.resume_url ? (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Resume uploaded</p>
                      <a
                        href={`http://localhost:5000${user.resume_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline"
                      >
                        View current resume
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No resume uploaded yet</p>
                </div>
              )}
            </div>
            
            <div>
              <label className="btn-secondary cursor-pointer inline-flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                {resumeFile ? 'Change File' : 'Upload Resume'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className="hidden"
                />
              </label>
              {resumeFile && (
                <p className="text-sm text-gray-500 mt-2">{resumeFile.name}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            PDF, DOC, DOCX up to 10MB
          </p>
        </div>

        {/* Professional Summary */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Summary</h2>
          
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            rows={5}
            className="input-field"
            placeholder="Write a brief summary about your professional background, key achievements, and career goals..."
          />
        </div>

        {/* Skills */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
          
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="input-field flex-1"
              placeholder="Add a skill (e.g., JavaScript, Project Management)"
            />
            <button
              type="button"
              onClick={addSkill}
              className="btn-secondary flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </button>
          </div>

          {formData.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 rounded-full"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-2 text-primary-600 hover:text-primary-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Add skills to improve your job matches</p>
          )}
        </div>

        {/* Experience & Education */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Experience & Education</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="h-4 w-4 inline mr-1" />
                Years of Experience
              </label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select experience</option>
                {experienceLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <GraduationCap className="h-4 w-4 inline mr-1" />
                Highest Education
              </label>
              <input
                type="text"
                name="education"
                value={formData.education}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Bachelor's in Computer Science"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Linkedin className="h-4 w-4 inline mr-1" />
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                className="input-field"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Github className="h-4 w-4 inline mr-1" />
                GitHub URL
              </label>
              <input
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                className="input-field"
                placeholder="https://github.com/yourusername"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="h-4 w-4 inline mr-1" />
                Portfolio URL
              </label>
              <input
                type="url"
                name="portfolioUrl"
                value={formData.portfolioUrl}
                onChange={handleChange}
                className="input-field"
                placeholder="https://yourportfolio.com"
              />
            </div>
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
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
