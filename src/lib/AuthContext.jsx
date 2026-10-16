import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        const publicSettings = await base44.app.getPublicSettings();
        setAppPublicSettings(publicSettings);
      } catch (appError) {
        console.warn('App public settings warning:', appError);
      }
      setIsLoadingPublicSettings(false);

      // Check for an active session token
      const currentToken = (typeof localStorage !== 'undefined' && (
        localStorage.getItem('mock_auth_token') || 
        localStorage.getItem('base44_access_token')
      )) || appParams.token;

      if (currentToken) {
        await checkUserAuth();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error('Unexpected error in checkAppState:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.warn('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      
      if (error.status === 401 || error.status === 403 || error.message?.includes('authenticated') || error.message?.includes('expired') || error.message?.includes('terminated')) {
        setAuthError({
          type: 'auth_required',
          message: error.message || 'Authentication required'
        });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = async (shouldRedirect = true) => {
    console.log('🚪 Starting logout process...');
    
    // Clear React authentication state
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setAuthChecked(true);
    
    // Terminate the active session in auth provider
    try {
      await base44.auth.logout();
      console.log('✅ Auth session terminated');
    } catch (e) {
      console.warn('⚠️ Auth logout warning:', e);
    }
    
    // Clear only session tokens and temporary position cache
    // Note: NEVER delete registered accounts, emergency contacts, or household records!
    try {
      localStorage.removeItem('mock_auth_token');
      localStorage.removeItem('mock_user');
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('my_last_position');
    } catch (e) {
      console.warn('⚠️ Failed to clear session tokens:', e);
    }
    
    if (shouldRedirect) {
      console.log('🔄 Redirecting to login page...');
      window.location.href = '/login';
    }
  };

  const loginAsDemo = async (role = "resident") => {
    setIsLoadingAuth(true);
    try {
      const demoUser = await base44.auth.loginAsDemo(role);
      setUser(demoUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      setAuthError(null);
      return demoUser;
    } catch (err) {
      console.error('Demo authentication error:', err);
      throw err;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const updated = await base44.auth.updateMe(updatedData);
      setUser(updated);
      return updated;
    } catch (e) {
      console.warn('Failed to persist user updates to backend:', e);
      setUser(prev => (prev ? { ...prev, ...updatedData } : null));
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      loginAsDemo,
      checkUserAuth,
      checkAppState,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
