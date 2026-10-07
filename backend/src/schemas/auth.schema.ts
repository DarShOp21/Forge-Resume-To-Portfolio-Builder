import { z } from "zod";

export const SignupSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  // Accept either - resolved to a user by username OR email in the controller.
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
