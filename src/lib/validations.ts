import { z } from 'zod';

export const TicketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export const TicketPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const CreateTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  description: z.string().min(20, 'Description must be at least 20 characters long.'),
  category: z.string().trim().max(50).optional().or(z.literal('')),
});

export const UpdateTicketSchema = z
  .object({
    status: TicketStatusSchema.optional(),
    priority: TicketPrioritySchema.optional(),
    assigned_to: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one field must be provided.',
  });

export const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  full_name: z.string().min(2, 'Full name is required.'),
});
