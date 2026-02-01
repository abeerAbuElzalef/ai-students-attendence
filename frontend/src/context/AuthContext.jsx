import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      setUser({
        _id: userData._id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        isAdmin: userData.isAdmin || userData.role === 'admin'
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, _id, firstName, lastName, email: userEmail, role, isAdmin } = response.data;
    
    localStorage.setItem('token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    
    const userData = { 
      _id, 
      firstName,
      lastName,
      email: userEmail, 
      role,
      isAdmin: isAdmin || role === 'admin' 
    };
    setUser(userData);
    
    return userData;
  };

  const register = async (firstName, lastName, email, password) => {
    const response = await api.post('/auth/register', { firstName, lastName, email, password });
    const { 
      token: newToken, 
      _id, 
      firstName: userFirstName, 
      lastName: userLastName, 
      email: userEmail, 
      role, 
      isAdmin 
    } = response.data;
    
    localStorage.setItem('token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    
    const userData = { 
      _id, 
      firstName: userFirstName,
      lastName: userLastName,
      email: userEmail, 
      role,
      isAdmin: isAdmin || role === 'admin' 
    };
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  // Helper to get full name
  const getFullName = () => {
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    getFullName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
