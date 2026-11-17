import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from './LanguageContext';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { setLanguage } = useLanguage();
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('agri_user') || localStorage.getItem('agri_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('agri_token') || localStorage.getItem('agri_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.user) {
            setUser(res.data.user);
            sessionStorage.setItem('agri_user', JSON.stringify(res.data.user));
            if (res.data.user.preferred_language) {
              setLanguage(res.data.user.preferred_language);
            }
          }
        } catch (err) {
          console.warn('Session verification failed on mount:', err.message);
          setUser(null);
          setToken(null);
          sessionStorage.removeItem('agri_token');
          sessionStorage.removeItem('agri_user');
        }
      }
      setLoading(false);
    }

    checkAuth();

    // Listen for custom 401 logout events from api interceptor
    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('agri:logout', handleLogoutEvent);
    return () => window.removeEventListener('agri:logout', handleLogoutEvent);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      sessionStorage.setItem('agri_token', receivedToken);
      sessionStorage.setItem('agri_user', JSON.stringify(receivedUser));

      if (receivedUser.preferred_language) {
        setLanguage(receivedUser.preferred_language);
      }
      return receivedUser;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const register = async (farmerData) => {
    const res = await api.post('/auth/register', farmerData);
    if (res.data?.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      sessionStorage.setItem('agri_token', receivedToken);
      sessionStorage.setItem('agri_user', JSON.stringify(receivedUser));

      if (receivedUser.preferred_language) {
        setLanguage(receivedUser.preferred_language);
      }
      return receivedUser;
    }
    throw new Error(res.data?.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.warn('Logout API error:', err.message);
    } finally {
      setUser(null);
      setToken(null);
      sessionStorage.removeItem('agri_token');
      sessionStorage.removeItem('agri_user');
      localStorage.removeItem('agri_token');
      localStorage.removeItem('agri_user');
    }
  };

  const updateUserProfile = async (updates) => {
    const res = await api.put('/users/profile', updates);
    if (res.data?.success && res.data?.profile) {
      const updatedUser = {
        ...user,
        name: res.data.profile.name,
        preferred_language: res.data.profile.preferred_language,
        profile: res.data.profile,
      };
      setUser(updatedUser);
      sessionStorage.setItem('agri_user', JSON.stringify(updatedUser));
      if (res.data.profile.preferred_language) {
        setLanguage(res.data.profile.preferred_language);
      }
      return res.data.profile;
    }
    throw new Error(res.data?.message || 'Failed to update profile');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
