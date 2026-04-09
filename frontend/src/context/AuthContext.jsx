// context/AuthContext.jsx — Estado global de autenticación

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Leer token y usuario del localStorage al cargar
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; }
    catch { return null; }
  });

  // Guardar en localStorage cuando cambian
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else       localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else      localStorage.removeItem('user');
  }, [user]);

  // Llamado después de login o register exitoso
  function login(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
  }

  // Cerrar sesión
  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook conveniente
export function useAuth() {
  return useContext(AuthContext);
}
