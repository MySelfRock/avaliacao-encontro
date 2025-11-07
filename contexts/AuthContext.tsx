import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'pastoral_admin';
  pastoralId?: number | null;
  isActive?: boolean;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSuperAdmin: () => boolean;
  isPastoralAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados do localStorage na inicialização
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      if (storedRefreshToken) {
        setRefreshToken(storedRefreshToken);
      }

      // Validar token no backend
      validateToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Validar token com o backend
  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } else {
          // Token inválido, tentar renovar
          await tryRefreshToken();
        }
      } else if (response.status === 401) {
        // Token expirado, tentar renovar
        await tryRefreshToken();
      } else {
        // Outro erro, limpar autenticação
        clearAuth();
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      // Tentar renovar em caso de erro
      await tryRefreshToken();
    } finally {
      setIsLoading(false);
    }
  };

  // Tentar renovar access token usando refresh token
  const tryRefreshToken = async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!storedRefreshToken) {
      clearAuth();
      return false;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token && data.user) {
          // Atualizar apenas o access token, manter o refresh token
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          console.log('✅ Token renovado automaticamente');
          return true;
        }
      }
    } catch (error) {
      console.error('Erro ao renovar token:', error);
    }

    // Se falhou, limpar autenticação
    clearAuth();
    return false;
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token && data.user) {
        // Salvar token, usuário e refresh token
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        if (data.refreshToken) {
          setRefreshToken(data.refreshToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }

        return { success: true };
      } else {
        return {
          success: false,
          message: data.message || 'Falha no login'
        };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        message: 'Erro ao conectar com o servidor'
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (token) {
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        // Notificar backend do logout e revogar refresh token
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken })
        });
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      clearAuth();
    }
  };

  // Limpar autenticação
  const clearAuth = () => {
    setToken(null);
    setUser(null);
    setRefreshToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };

  // Atualizar dados do usuário
  const refreshUser = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
    }
  };

  // Verificar se é super admin
  const isSuperAdmin = () => {
    return user?.role === 'super_admin';
  };

  // Verificar se é pastoral admin
  const isPastoralAdmin = () => {
    return user?.role === 'pastoral_admin';
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    refreshUser,
    isSuperAdmin,
    isPastoralAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

// HOC para proteger rotas
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'super_admin' | 'pastoral_admin'
) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }

    if (requiredRole && user?.role !== requiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
