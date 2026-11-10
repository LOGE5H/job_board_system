import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, candidateAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ResumeAnalyzer from '../../components/ai/ResumeAnalyzer';
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
  const [uploadingResume, setUploadingResume] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    bio: '',
    skills: [],
    experienceText: '',
    educationText: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [meRes, profileRes] = await Promise.all([
        authAPI.getMe().catch(() => null),
        candidateAPI.getProfile().catch(() => null),
      ]);
      const me = meRes?.data || user;
      const profile = profileRes?.data || me?.profile || {};
      setFormData({
        fullName: profile.fullName || profile.full_name || '',
        email: me?.email || user?.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        experienceText: Array.isArray(profile.experience)
          ? profile.experience.map((e) => (typeof e === 'string' ? e : `${e.title || e.role || ''}${e.company ? ` at ${e.company}` : ''}${e.startDate ? ` (${e.startDate} - ${e.endDate || 'Present'})` : ''}`)).join('\n')
          : (profile.experience || ''),
        educationText: Array.isArray(profile.education)
          ? profile.education.map((e) => (typeof e === 'string' ? e : `${e.degree || ''}${e.institution ? ` — ${e.institution}` : ''}${e.year ? ` (${e.year})` : ''}`)).join('\n')
          : (profile.education || ''),
        linkedinUrl: profile.linkedinUrl || profile.linkedin_url || '',
        githubUrl: profile.githubUrl || profile.github_url || '',
        portfolioUrl: profile.portfolioUrl || profile.portfolio_url || ''
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

  const handleResumeChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resume must be less than 5MB (PDF/DOC/DOCX)');
      return;
    }
    setResumeFile(file);
    // Upload immediately so "uploading something" wires to backend + mock AI
    setUploadingResume(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await candidateAPI.uploadResume(fd);
      toast.success('Resume uploaded! Running AI check…');
      const updated = { ...user, profile: { ...(user?.profile || {}), resumePath: res.data.resumePath || res.data.resume_path } };
      updateUser(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resume upload failed');
    } finally {
      setUploadingResume(false);
    }
  };

  const parseLines = (text) =>
    String(text || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => ({ title: line }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName: formData.fullName,
        phone: formData.phone,
        location: formData.location,
        headline: formData.headline,
        bio: formData.bio,
        skills: formData.skills,
        experience: parseLines(formData.experienceText),
        education: parseLines(formData.educationText),
        linkedinUrl: formData.linkedinUrl,
        githubUrl: formData.githubUrl,
        portfolioUrl: formData.portfolioUrl,
      };
      const res = await candidateAPI.updateProfile(payload);
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

  const resumePath = user?.profile?.resumePath || user?.profile?.resume_path;
  const analyzerSkills = formData.skills;
  const analyzerExp = parseLines(formData.experienceText);
  const analyzerEdu = parseLines(formData.educationText);

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

      {/* Mock AI analysis — wired to whatever is uploaded/typed */}
      <div className="mb-6">
        <ResumeAnalyzer
          skills={analyzerSkills}
          experience={analyzerExp}
          education={analyzerEdu}
          fullName={formData.fullName || 'Candidate'}
        />
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
                name="fullName"
                value={formData.fullName}
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

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              {resumePath ? (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Resume uploaded</p>
                      <a
                        href={resumePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-700 hover:underline font-medium"
                      >
                        View current resume
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center border border-gray-100">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No resume uploaded yet</p>
                </div>
              )}
            </div>

            <div>
              <label className="btn-secondary cursor-pointer inline-flex items-center whitespace-nowrap">
                <Upload className="h-4 w-4 mr-2" />
                {uploadingResume ? 'Uploading…' : resumeFile ? 'Change File' : 'Upload Resume'}
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
            PDF, DOC, DOCX up to 5MB. Uploading runs an instant AI check above.
          </p>
        </div>

        {/* Professional Summary */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Summary</h2>

          <textarea
            name="bio"
            value={formData.bio}
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
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              className="input-field flex-1"
              placeholder="Add a skill (e.g., JavaScript, Project Management)"
            />
            <button
              type="button"
              onClick={addSkill}
              className="btn-secondary flex items-center whitespace-nowrap"
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
                    aria-label={`Remove ${skill}`}
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
          <p className="text-sm text-gray-500 mb-4">One entry per line — used by AI matching.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="h-4 w-4 inline mr-1" />
                Experience
              </label>
              <textarea
                name="experienceText"
                value={formData.experienceText}
                onChange={handleChange}
                rows={4}
                className="input-field"
                placeholder={'Frontend Developer at Acme (2021 - Present)\nIntern at Beta (2020 - 2021)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <GraduationCap className="h-4 w-4 inline mr-1" />
                Education
              </label>
              <textarea
                name="educationText"
                value={formData.educationText}
                onChange={handleChange}
                rows={4}
                className="input-field"
                placeholder={'B.Tech Computer Science — XYZ University (2021)\n12th — ABC School (2017)'}
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
                Save Profile
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
