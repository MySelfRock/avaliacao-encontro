import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Validar token ao carregar
  useEffect(() => {
    if (!token) {
      setMessage({ type: 'error', text: 'Token não fornecido' });
      setIsValidating(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setIsValidToken(true);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Token inválido ou expirado'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao validar token'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validar senhas
    if (newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'A senha deve ter no mínimo 8 caracteres'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'As senhas não coincidem'
      });
      return;
    }

    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setMessage({
        type: 'error',
        text: 'A senha deve conter letras maiúsculas, minúsculas e números'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: 'Senha redefinida com sucesso! Redirecionando...'
        });

        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Erro ao redefinir senha'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao conectar com o servidor'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validando token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isValidToken ? 'bg-blue-100' : 'bg-red-100'
            }`}>
              {isValidToken ? (
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Redefinir Senha
          </h2>
          <p className="text-center text-gray-600 mb-8">
            {isValidToken
              ? 'Digite sua nova senha'
              : 'Token inválido ou expirado'}
          </p>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-md mb-6 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          {isValidToken ? (
            // Form
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mínimo 8 caracteres"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Deve conter letras maiúsculas, minúsculas e números
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite a senha novamente"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Redefinindo...
                  </span>
                ) : (
                  'Redefinir Senha'
                )}
              </button>
            </form>
          ) : (
            // Token inválido - mostrar link para solicitar novo
            <div className="text-center space-y-4">
              <Link
                to="/forgot-password"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200"
              >
                Solicitar Novo Link
              </Link>
            </div>
          )}

          {/* Links */}
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800">
              ← Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
