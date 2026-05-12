import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';

export function useZodForm<T>(schema: ZodSchema<T>) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = form.handleSubmit(async (data: T) => {
    setServerError(null);
    return data;
  });

  return {
    ...form,
    onSubmit,
    serverError,
    isSubmitting: form.formState.isSubmitting,
    isValid: form.formState.isValid,
    clearErrors: () => {
      form.clearErrors();
      setServerError(null);
    }
  };
}