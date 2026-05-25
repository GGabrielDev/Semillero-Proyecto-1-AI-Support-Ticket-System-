'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { CreateTicketSchema } from '@/lib/validations';

type FormValues = z.infer<typeof CreateTicketSchema>;

export function TicketForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateTicketSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; ticket?: { id: string } } | null;

    if (!response.ok || !payload?.ticket?.id) {
      setError(payload?.error ?? 'Unable to create ticket.');
      return;
    }

    router.push(`/tickets/${payload.ticket.id}`);
    router.refresh();
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="title">
          Title
        </label>
        <Input id="title" placeholder="Describe the issue" {...register('title')} />
        {errors.title ? <p className="text-sm text-rose-300">{errors.title.message}</p> : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="category">
          Category
        </label>
        <Input id="category" placeholder="billing, authentication, integrations..." {...register('category')} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="description">
          Description
        </label>
        <Textarea id="description" placeholder="Add enough detail for the support team to help quickly." {...register('description')} />
        {errors.description ? <p className="text-sm text-rose-300">{errors.description.message}</p> : null}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Button className="w-full sm:w-auto" isLoading={isSubmitting} type="submit">
        Create ticket
      </Button>
    </form>
  );
}
