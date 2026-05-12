import { useState, useCallback, useEffect } from 'react';

interface UseShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

export function useShare() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setIsSupported(!!navigator.share);
  }, []);

  const share = useCallback(async (options: UseShareOptions): Promise<boolean> => {
    if (!navigator.share) {
      return false;
    }

    setIsSharing(true);
    try {
      await navigator.share(options);
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return false;
    } finally {
      setIsSharing(false);
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const generateShareUrl = useCallback((baseUrl: string, params: Record<string, string>): string => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }, []);

  return {
    isSupported,
    isSharing,
    share,
    copyToClipboard,
    generateShareUrl
  };
}