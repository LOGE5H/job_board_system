import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// Role helpers — 'employer' (stored) === Institution / Company (job poster).
// Accepts legacy aliases so old tokens keep working.
const normalizeRole = (role) => {
  if (!role) return role;
  const r = String(role).toLowerCase();
  if (['employer', 'institution', 'company'].includes(r)) return 'employer';
  return r;
};

export const ROLE_LABELS = {
  employer: 'Institution / Company',
  candidate: 'Job Seeker',
};

export const roleLabel = (role) => ROLE_LABELS[normalizeRole(role)] || role;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.role) parsed.role = normalizeRole(parsed.role);
        setUser(parsed);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }
      // Verify token is still valid
      authAPI.getMe()
        .then(res => {
          const fresh = res.data;
          if (fresh?.role) fresh.role = normalizeRole(fresh.role);
          setUser(fresh);
          localStorage.setItem('user', JSON.stringify(fresh));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, user: loginUser } = response.data;
    if (loginUser?.role) loginUser.role = normalizeRole(loginUser.role);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loginUser));
    setUser(loginUser);
    return loginUser;
  };

  const registerEmployer = async (data) => {
    const response = await authAPI.registerEmployer(data);
    return response.data;
  };

  const registerCandidate = async (data) => {
    const response = await authAPI.registerCandidate(data);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const normalizedRole = normalizeRole(user?.role);

  const value = {
    user: user ? { ...user, role: normalizedRole } : user,
    loading,
    login,
    logout,
    registerEmployer,
    registerCandidate,
    registerInstitution: registerEmployer,
    updateUser,
    isAuthenticated: !!user,
    isEmployer: normalizedRole === 'employer',
    isInstitution: normalizedRole === 'employer',
    isCandidate: normalizedRole === 'candidate',
    roleLabel: user ? roleLabel(user.role) : null,
    isEmailVerified: user?.emailVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
