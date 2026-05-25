import { z } from 'zod';

export const TicketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export const TicketPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const UserRoleSchema = z.enum(['user', 'agent', 'admin']);
export const PendingAiActionTypeSchema = z.enum(['escalate', 'close', 'assign', 'request_info']);

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

export const CreateCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment is required.').max(5000, 'Comment is too long.'),
  is_internal: z.boolean().optional().default(false),
});

export const CreatePendingAiActionSchema = z.object({
  actionType: PendingAiActionTypeSchema,
  aiSuggestion: z.record(z.string(), z.unknown()),
});

export const PendingAiActionDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
});

export const UpdateUserRoleSchema = z.object({
  role: UserRoleSchema,
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
