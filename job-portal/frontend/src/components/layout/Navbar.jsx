import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import { 
  Briefcase, Menu, X, Bell, User, LogOut, ChevronDown,
  Building2, FileText, Bookmark, LayoutDashboard, Search, PlusCircle, Sparkles
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout, isEmployer, isCandidate } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll({ limit: 5 });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    window.location.href = '/';
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read');
    }
  };

  const getDashboardLink = () => {
    if (isEmployer) return '/employer/dashboard';
    if (isCandidate) return '/candidate/dashboard';
    return '/';
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg shadow-gray-200/50' : 'bg-white/80 backdrop-blur-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-primary-500 to-purple-600 p-2 rounded-xl">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                JobPortal
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Show different nav items based on role */}
            {!isAuthenticated && (
              <>
                <Link to="/jobs" className="px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl font-medium flex items-center transition-all duration-200">
                  <Search className="h-4 w-4 mr-2" />
                  Find Jobs
                </Link>
              </>
            )}

            {isCandidate && (
              <>
                <Link to="/jobs" className="px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl font-medium flex items-center transition-all duration-200">
                  <Search className="h-4 w-4 mr-2" />
                  Search Jobs
                </Link>
                <Link to="/candidate/applications" className="text-gray-600 hover:text-green-600 font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  My Applications
                </Link>
                <Link to="/candidate/saved-jobs" className="text-gray-600 hover:text-green-600 font-medium flex items-center">
                  <Bookmark className="h-4 w-4 mr-1" />
                  Saved Jobs
                </Link>
              </>
            )}

            {isEmployer && (
              <>
                <Link to="/employer/jobs/create" className="text-gray-600 hover:text-primary-600 font-medium flex items-center">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Post a Job
                </Link>
                <Link to="/employer/jobs" className="text-gray-600 hover:text-primary-600 font-medium flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  My Jobs
                </Link>
              </>
            )}
            
            {!isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3">
                  <Link to="/login/candidate" className="text-green-600 hover:text-green-700 font-medium">
                    Candidate Login
                  </Link>
                  <Link to="/login/employer" className="btn-primary text-sm">
                    Employer Login
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 text-gray-600 hover:text-primary-600 focus:outline-none"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-500">No notifications</p>
                        ) : (
                          notifications.map(notif => (
                            <div
                              key={notif._id}
                              onClick={() => markAsRead(notif._id)}
                              className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                                !notif.isRead ? 'bg-primary-50' : ''
                              }`}
                            >
                              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 focus:outline-none"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isEmployer ? 'bg-primary-100' : 'bg-green-100'
                    }`}>
                      {isEmployer ? (
                        <Building2 className="h-5 w-5 text-primary-600" />
                      ) : (
                        <User className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <span className="font-medium">{user?.profile?.companyName || user?.profile?.fullName || user?.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                      {/* Role Badge */}
                      <div className="px-4 py-2 border-b border-gray-100">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isEmployer ? 'bg-primary-100 text-primary-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isEmployer ? 'Employer Account' : 'Candidate Account'}
                        </span>
                      </div>

                      <Link
                        to={getDashboardLink()}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4 mr-3" />
                        Dashboard
                      </Link>
                      
                      {isEmployer && (
                        <>
                          <Link
                            to="/employer/jobs/create"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <PlusCircle className="h-4 w-4 mr-3" />
                            Post New Job
                          </Link>
                          <Link
                            to="/employer/jobs"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Briefcase className="h-4 w-4 mr-3" />
                            Manage Jobs
                          </Link>
                          <Link
                            to="/employer/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Building2 className="h-4 w-4 mr-3" />
                            Company Profile
                          </Link>
                        </>
                      )}

                      {isCandidate && (
                        <>
                          <Link
                            to="/jobs"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Search className="h-4 w-4 mr-3" />
                            Search Jobs
                          </Link>
                          <Link
                            to="/candidate/applications"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <FileText className="h-4 w-4 mr-3" />
                            My Applications
                          </Link>
                          <Link
                            to="/candidate/saved-jobs"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Bookmark className="h-4 w-4 mr-3" />
                            Saved Jobs
                          </Link>
                          <Link
                            to="/candidate/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4 mr-3" />
                            My Profile
                          </Link>
                        </>
                      )}

                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-primary-600 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-3 space-y-3">
            {!isAuthenticated && (
              <Link
                to="/jobs"
                className="block text-gray-600 hover:text-primary-600 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Find Jobs
              </Link>
            )}

            {isCandidate && (
              <>
                <Link
                  to="/jobs"
                  className="block text-gray-600 hover:text-green-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Search Jobs
                </Link>
                <Link
                  to="/candidate/applications"
                  className="block text-gray-600 hover:text-green-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Applications
                </Link>
                <Link
                  to="/candidate/saved-jobs"
                  className="block text-gray-600 hover:text-green-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Saved Jobs
                </Link>
                <Link
                  to="/candidate/profile"
                  className="block text-gray-600 hover:text-green-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Profile
                </Link>
              </>
            )}

            {isEmployer && (
              <>
                <Link
                  to="/employer/jobs/create"
                  className="block text-gray-600 hover:text-primary-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Post a Job
                </Link>
                <Link
                  to="/employer/jobs"
                  className="block text-gray-600 hover:text-primary-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Jobs
                </Link>
                <Link
                  to="/employer/profile"
                  className="block text-gray-600 hover:text-primary-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Company Profile
                </Link>
              </>
            )}
            
            {!isAuthenticated ? (
              <>
                <hr className="my-2" />
                <Link
                  to="/login/candidate"
                  className="block text-green-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Candidate Login
                </Link>
                <Link
                  to="/login/employer"
                  className="block text-primary-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Employer Login
                </Link>
                <hr className="my-2" />
                <Link
                  to="/register/candidate"
                  className="block text-green-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register as Candidate
                </Link>
                <Link
                  to="/register/employer"
                  className="block text-primary-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register as Employer
                </Link>
              </>
            ) : (
              <>
                <hr className="my-2" />
                <Link
                  to={getDashboardLink()}
                  className="block text-gray-600 hover:text-primary-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block text-red-600 font-medium"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
