import { z } from "zod";
import { httpError } from "../common/http-error";
import { Credentials } from "../services/auth.service";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "A valid email is required" }));

const passwordSchema = z.string();

const strictPasswordSchema = z
  .string()
  .min(8, { message: "password must be a string of 8 to 72 characters" })
  .max(72, { message: "password must be a string of 8 to 72 characters" });

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const registerSchema = z.object({
  email: emailSchema,
  password: strictPasswordSchema,
});

/** Strict (register) also enforces password length rules. */
export function parseCredentials(body: unknown, strict: boolean): Credentials {
  const schema = strict ? registerSchema : loginSchema;
  const result = schema.safeParse(body);

  if (!result.success) {
    throw httpError(400, result.error.issues[0].message);
  }

  return result.data;
}
