import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar CSRF tokens
 * O token é obtido do cookie x-csrf-token definido pelo servidor
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // Obter CSRF token do cookie
    const getCsrfFromCookie = (): string | null => {
      const match = document.cookie.match(/x-csrf-token=([^;]+)/);
      return match ? match[1] : null;
    };

    // Buscar token inicial
    const token = getCsrfFromCookie();
    if (token) {
      setCsrfToken(token);
    }

    // Atualizar token periodicamente (o servidor pode rotacionar)
    const interval = setInterval(() => {
      const newToken = getCsrfFromCookie();
      if (newToken && newToken !== csrfToken) {
        setCsrfToken(newToken);
      }
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(interval);
  }, [csrfToken]);

  return csrfToken;
}

/**
 * Helper para adicionar CSRF token aos headers de uma requisição
 */
export function addCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const csrfToken = document.cookie.match(/x-csrf-token=([^;]+)/)?.[1];

  if (csrfToken) {
    return {
      ...headers,
      'x-csrf-token': csrfToken,
    };
  }

  return headers;
}
