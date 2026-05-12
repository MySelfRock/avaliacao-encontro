import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseDraftOptions<T> {
  key: string;
  defaultValue: T;
  debounceMs?: number;
  maxAge?: number;
}

export interface UseDraftReturn<T> {
  data: T;
  setData: (data: T) => void;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  save: () => void;
  clear: () => void;
  restore: () => void;
}

export function useDraft<T>({
  key,
  defaultValue,
  debounceMs = 2000,
  maxAge = 7 * 24 * 60 * 60 * 1000
}: UseDraftOptions<T>): UseDraftReturn<T> {
  const [data, setDataState] = useState<T>(defaultValue);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `draft_${key}`;

  const save = useCallback(() => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      const draftData = {
        data,
        savedAt: new Date().toISOString(),
        key
      };
      localStorage.setItem(storageKey, JSON.stringify(draftData));
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
    } finally {
      setIsSaving(false);
    }
  }, [data, isDirty, key, storageKey]);

  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    setDataState(defaultValue);
    setIsDirty(false);
    setLastSaved(null);
  }, [defaultValue, storageKey]);

  const restore = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { data: savedData, savedAt } = JSON.parse(stored);
        const savedDate = new Date(savedAt);
        
        if (Date.now() - savedDate.getTime() < maxAge) {
          setDataState(savedData);
          setLastSaved(savedDate);
        } else {
          clear();
        }
      }
    } catch (error) {
      console.error('Erro ao restaurar rascunho:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clear, maxAge, storageKey]);

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (isDirty && !isLoading) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(save, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, isDirty, isLoading, debounceMs, save]);

  const setData = useCallback((newData: T | ((prev: T) => T)) => {
    setDataState(prev => {
      const updated = typeof newData === 'function' 
        ? (newData as (prev: T) => T)(prev)
        : newData;
      setIsDirty(true);
      return updated;
    });
  }, []);

  return {
    data,
    setData,
    isDirty,
    isSaving,
    isLoading,
    lastSaved,
    save,
    clear,
    restore
  };
}