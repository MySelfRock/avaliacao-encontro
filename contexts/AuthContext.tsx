import React, { createContext, useContext, useState, useEffect } from 'react';
import { addCsrfHeader } from '../src/hooks/useCsrf';

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
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSuperAdmin: () => boolean;
  isPastoralAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar usuário na inicialização (tokens estão em HTTP-Only cookies)
  useEffect(() => {
    loadUser();
  }, []);

  // Carregar dados do usuário do backend
  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // CRÍTICO: Envia cookies HTTP-Only
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: addCsrfHeader({
          'Content-Type': 'application/json'
        }),
        credentials: 'include', // CRÍTICO: Permite backend definir cookies HTTP-Only
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        // Tokens são salvos automaticamente em HTTP-Only cookies pelo backend
        // Apenas armazenar dados do usuário no estado
        setUser(data.user);
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
      // Notificar backend para revogar refresh token e limpar cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: addCsrfHeader(),
        credentials: 'include', // CRÍTICO: Envia cookies para serem revogados
      });
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Limpar estado local
      setUser(null);
    }
  };

  // Atualizar dados do usuário
  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // CRÍTICO: Envia cookies HTTP-Only
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      setUser(null);
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
    isAuthenticated: !!user,
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
