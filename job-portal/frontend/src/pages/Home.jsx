import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI, analyticsAPI } from '../services/api';
import JobCard from '../components/jobs/JobCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { 
  Search, MapPin, Briefcase, Users, Building2, TrendingUp,
  ArrowRight, CheckCircle, Sparkles, Rocket, Target, Award,
  Star, Zap, Globe, Shield
} from 'lucide-react';

export default function Home() {
  const [recentJobs, setRecentJobs] = useState([]);
  const [trendingCategories, setTrendingCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, categoriesRes, analyticsRes] = await Promise.all([
        jobsAPI.getRecent(6),
        jobsAPI.getTrendingCategories(),
        analyticsAPI.getPublic()
      ]);
      setRecentJobs(jobsRes.data);
      setTrendingCategories(categoriesRes.data);
      setStats(analyticsRes.data.stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword) params.set('keyword', searchKeyword);
    if (searchLocation) params.set('location', searchLocation);
    window.location.href = `/jobs?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary-600" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading amazing opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mesh min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 animated-bg opacity-90"></div>
        <div className="absolute inset-0 bg-hero-pattern"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-purple-400/10 rounded-full blur-xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-teal-400/10 rounded-full blur-xl animate-float" style={{animationDelay: '4s'}}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4 mr-2" />
              #1 Job Platform for Professionals
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-slide-up">
              Find Your 
              <span className="relative inline-block mx-3">
                <span className="relative z-10">Dream</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 10C50 2 150 2 198 10" stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeLinecap="round"/>
                </svg>
              </span>
              Job Today
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-10 animate-slide-up" style={{animationDelay: '0.1s'}}>
              Connect with top employers and discover opportunities that match your skills and aspirations.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="glass-card p-3 md:p-4 max-w-3xl mx-auto">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Job title, keyword, or company"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 transition-all duration-300"
                    />
                  </div>
                  <div className="flex-1 relative group">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="City or remote"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 transition-all duration-300"
                    />
                  </div>
                  <button type="submit" className="btn-primary py-4 px-8 flex items-center justify-center gap-2">
                    <Search className="h-5 w-5" />
                    <span>Search</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Links */}
            <div className="flex flex-wrap justify-center gap-3 mt-8 animate-slide-up" style={{animationDelay: '0.3s'}}>
              <span className="text-white/60 text-sm">Popular:</span>
              {['Software Engineer', 'Product Manager', 'Data Analyst', 'Designer'].map((term, i) => (
                <Link 
                  key={i}
                  to={`/jobs?keyword=${encodeURIComponent(term)}`}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/90 text-sm font-medium transition-all duration-200 hover:scale-105"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto animate-slide-up" style={{animationDelay: '0.4s'}}>
              {[
                { value: stats.activeJobs, label: 'Active Jobs', icon: Briefcase, color: 'from-blue-400 to-cyan-400' },
                { value: stats.totalCandidates, label: 'Candidates', icon: Users, color: 'from-purple-400 to-pink-400' },
                { value: stats.totalEmployers, label: 'Companies', icon: Building2, color: 'from-amber-400 to-orange-400' },
                { value: stats.totalApplications, label: 'Applications', icon: Target, color: 'from-emerald-400 to-teal-400' },
              ].map((stat, i) => (
                <div key={i} className="glass-card text-center group hover:scale-105 transition-transform duration-300">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-3 group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white">{stat.value.toLocaleString()}</div>
                  <div className="text-white/70 text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc"/>
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-mesh">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Quick Apply', desc: 'Apply to multiple jobs with a single click using your saved profile', color: 'from-amber-500 to-orange-500' },
              { icon: Shield, title: 'Verified Jobs', desc: 'All job postings are verified to ensure legitimate opportunities', color: 'from-emerald-500 to-teal-500' },
              { icon: Globe, title: 'Remote Ready', desc: 'Find remote opportunities from companies around the world', color: 'from-blue-500 to-cyan-500' },
            ].map((feature, i) => (
              <div key={i} className="card-hover flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} flex-shrink-0`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{feature.title}</h3>
                  <p className="text-gray-600 mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Categories */}
      {trendingCategories.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold mb-4">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending Now
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Popular Job Categories
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Explore opportunities in the most in-demand fields
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {trendingCategories.map((cat, index) => (
                <Link
                  key={index}
                  to={`/jobs?category=${encodeURIComponent(cat.category)}`}
                  className="group card-hover text-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Briefcase className="h-7 w-7 text-primary-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{cat.category}</h3>
                    <div className="inline-flex items-center gap-2">
                      <span className="text-2xl font-bold text-primary-600">{cat.job_count}</span>
                      <span className="text-gray-500 text-sm">jobs</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{cat.total_applications} applications</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Jobs */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-4">
                <Sparkles className="h-4 w-4 mr-2" />
                Fresh Opportunities
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Latest Job Openings</h2>
              <p className="text-gray-600 mt-2">Discover your next career move</p>
            </div>
            <Link to="/jobs" className="btn-outline flex items-center group">
              View All Jobs
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {recentJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentJobs.map(job => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Briefcase className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs available yet</h3>
              <p className="text-gray-500">Check back soon for new opportunities!</p>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-4">
              <Rocket className="h-4 w-4 mr-2" />
              Getting Started
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-600 text-lg">Start your journey in just a few simple steps</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* For Candidates */}
            <div className="card relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg shadow-primary-500/30">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">For Candidates</h3>
                    <p className="text-gray-500">Find your perfect role</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    'Create your profile and upload your resume',
                    'Search and filter jobs by skills & location',
                    'Apply to jobs with one click',
                    'Track applications and get notified'
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/30">
                        {i + 1}
                      </div>
                      <span className="text-gray-700 pt-1">{step}</span>
                    </div>
                  ))}
                </div>
                
                <Link to="/register/candidate" className="btn-primary w-full mt-8 text-center flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Get Started Free
                </Link>
              </div>
            </div>

            {/* For Employers */}
            <div className="card relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">For Employers</h3>
                    <p className="text-gray-500">Hire top talent</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    'Create your company profile',
                    'Post jobs and reach thousands of candidates',
                    'Review applications and manage candidates',
                    'Get recommended candidates based on skills'
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-amber-500/30">
                        {i + 1}
                      </div>
                      <span className="text-gray-700 pt-1">{step}</span>
                    </div>
                  ))}
                </div>
                
                <Link to="/register/employer" className="btn-primary w-full mt-8 text-center flex items-center justify-center gap-2" style={{background: 'linear-gradient(to right, #f59e0b, #ea580c)'}}>
                  <Award className="h-5 w-5" />
                  Post a Job
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials/Trust Indicators */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {['Trusted by 10,000+ companies', '100% Free for candidates', '24/7 Support', 'Verified employers'].map((text, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <span className="font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 animated-bg"></div>
        <div className="absolute inset-0 bg-hero-pattern"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium mb-6">
            <Star className="h-4 w-4 mr-2 text-yellow-300" />
            Join thousands of happy users
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Take the Next Step?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who have found their dream jobs through our platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/jobs" className="inline-flex items-center justify-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
              <Search className="h-5 w-5" />
              Browse Jobs
            </Link>
            <Link to="/register/candidate" className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-primary-600 transition-all duration-300 transform hover:-translate-y-1">
              <Rocket className="h-5 w-5" />
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
